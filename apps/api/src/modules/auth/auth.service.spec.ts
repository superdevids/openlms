import { BadRequestException, HttpStatus, UnauthorizedException } from "@nestjs/common";
import type { PrismaClient } from "@opensis/database";
import { AuthService } from "./auth.service";
import { LOGIN_FAIL_LIMIT } from "./auth.constants";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "./password.util";
import {
  signAccessToken,
  signInvitationToken,
  verifyAccessToken,
  verifyInvitationToken,
  verifyRefreshToken,
  signRefreshToken
} from "./jwt.util";

function makePrismaMock(): Record<string, unknown> {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    userRole: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: "rt_1" }),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 })
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({})
    }
  };
}

describe("password.util (Argon2id target; fallback scrypt)", () => {
  it("hash → verify roundtrip", async () => {
    const hashed = await hashPassword("rahasia123");
    expect(hashed).toMatch(/^(scrypt\$|\$argon2)/);
    await expect(verifyPassword("rahasia123", hashed)).resolves.toBe(true);
    await expect(verifyPassword("salah", hashed)).resolves.toBe(false);
  });

  it("hash argon2 tanpa modul argon2 → fail-closed", async () => {
    const fakeArgon = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$c2lnbmF0dXJl";
    await expect(verifyPassword("apa saja", fakeArgon)).resolves.toBe(false);
  });

  it("generateTemporaryPassword: 12 karakter tanpa karakter ambigu", () => {
    const pwd = generateTemporaryPassword();
    expect(pwd).toHaveLength(12);
    expect(pwd).not.toMatch(/[0O1Il]/);
  });
});

describe("jwt.util (in-house HS256)", () => {
  it("sign → verify roundtrip access token", () => {
    const token = signAccessToken({ sub: "u1" });
    const payload = verifyAccessToken(token);
    expect(payload?.sub).toBe("u1");
    expect(payload?.typ).toBe("access");
  });

  it("token rusak / salah secret → null", () => {
    const token = signAccessToken({ sub: "u1" });
    expect(verifyAccessToken(`${token.slice(0, -2)}xx`)).toBeNull();
    expect(verifyAccessToken("bukan.token.valid")).toBeNull();
  });

  it("refresh & invitation token dipisahkan tipe", () => {
    const refresh = signRefreshToken({ sub: "u1" });
    expect(verifyRefreshToken(refresh)?.typ).toBe("refresh");
    expect(verifyAccessToken(refresh)).toBeNull();

    const invite = signInvitationToken({ sub: "u1", role: "GURU" });
    const payload = verifyInvitationToken(invite);
    expect(payload?.typ).toBe("invite");
    expect(payload?.role).toBe("GURU");
  });
});

describe("AuthService.login", () => {
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let service: AuthService;

  const scopeResolverMock = {
    resolve: jest.fn().mockResolvedValue({ classIds: [], homeroomClassId: null })
  };

  const makeUser = async (overrides: Record<string, unknown> = {}) => ({
    id: "u1",
    email: "admin@opensis.local",
    username: "admin",
    password_hash: await hashPassword("rahasia123"),
    must_change_password: false,
    failed_login_attempts: 0,
    full_name: "Admin",
    is_active: true,
    last_login_at: null,
    phone: null,
    avatar_url: null,
    roles: [{ role: "SUPERADMIN", status: "ACTIVE" }],
    ...overrides
  });

  beforeEach(() => {
    prismaMock = makePrismaMock();
    (prismaMock.auditLog as { create: jest.Mock }).create.mockResolvedValue({});
    service = new AuthService(prismaMock as unknown as PrismaClient, scopeResolverMock as never);
  });

  it("login sukses: reset gagal, tulis last_login_at + audit LOGIN", async () => {
    const user = await makeUser();
    (prismaMock.user as { findFirst: jest.Mock }).findFirst.mockResolvedValue(user);
    const update = prismaMock.user as { update: jest.Mock };
    update.update.mockResolvedValue(user);

    const result = await service.login(
      { emailOrUsername: "admin", password: "rahasia123" },
      { requestId: "req_test" }
    );

    expect(result.user.id).toBe("u1");
    expect(result.user.roles).toContain("SUPERADMIN");
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ failed_login_attempts: 0 })
      })
    );
    const auditCreate = prismaMock.auditLog as { create: jest.Mock };
    expect(auditCreate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "LOGIN", entity_id: "u1" })
      })
    );
  });

  it("login dengan email (case-insensitive)", async () => {
    const user = await makeUser();
    const findFirst = prismaMock.user as { findFirst: jest.Mock };
    findFirst.findFirst.mockImplementation(async ({ where }) => {
      expect(where.OR[0].email.mode).toBe("insensitive");
      return user;
    });
    (prismaMock.user as { update: jest.Mock }).update.mockResolvedValue(user);

    const result = await service.login(
      { emailOrUsername: "Admin@opensis.local", password: "rahasia123" },
      { requestId: "req_test" }
    );
    expect(result.user.id).toBe("u1");
  });

  it("password salah → 401 + failed_login_attempts naik", async () => {
    const user = await makeUser();
    (prismaMock.user as { findFirst: jest.Mock }).findFirst.mockResolvedValue(user);
    const update = prismaMock.user as { update: jest.Mock };
    update.update.mockResolvedValue(user);

    await expect(
      service.login({ emailOrUsername: "admin", password: "salah" }, { requestId: "req_test" })
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failed_login_attempts: 1 }) })
    );
  });

  it("5 gagal → 429 + lockout (RATE_LIMITED)", async () => {
    const user = await makeUser({ failed_login_attempts: 4 });
    (prismaMock.user as { findFirst: jest.Mock }).findFirst.mockResolvedValue(user);
    (prismaMock.user as { update: jest.Mock }).update.mockResolvedValue(user);

    await expect(
      service.login({ emailOrUsername: "admin", password: "salah" }, { requestId: "req_test" })
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS
    });
  });

  it("user dengan 5 kegagalan terkunci → 429 sebelum verifikasi", async () => {
    const user = await makeUser({ failed_login_attempts: LOGIN_FAIL_LIMIT });
    (prismaMock.user as { findFirst: jest.Mock }).findFirst.mockResolvedValue(user);

    await expect(
      service.login({ emailOrUsername: "admin", password: "rahasia123" }, { requestId: "req_test" })
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it("user tidak ditemukan → 401 tanpa bocor informasi", async () => {
    (prismaMock.user as { findFirst: jest.Mock }).findFirst.mockResolvedValue(null);
    await expect(
      service.login({ emailOrUsername: "ghost", password: "x" }, { requestId: "req_test" })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("user tidak ditemukan → audit LOGIN_FAILED_UNKNOWN + IP tercatat", async () => {
    (prismaMock.user as { findFirst: jest.Mock }).findFirst.mockResolvedValue(null);
    const auditCreate = prismaMock.auditLog as { create: jest.Mock };

    await expect(
      service.login(
        { emailOrUsername: "ghost", password: "x" },
        { requestId: "req_test", ip: "1.2.3.4" }
      )
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(auditCreate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "LOGIN",
          actor_id: null,
          entity_id: "ghost",
          ip_address: "1.2.3.4",
          after: { reason: "LOGIN_FAILED_UNKNOWN" }
        })
      })
    );
  });

  it("audit gagal → logger.error dipanggil (REL-009: tidak senyap)", async () => {
    const user = await makeUser();
    (prismaMock.user as { findFirst: jest.Mock }).findFirst.mockResolvedValue(user);
    (prismaMock.user as { update: jest.Mock }).update.mockResolvedValue(user);
    (prismaMock.auditLog as { create: jest.Mock }).create.mockRejectedValue(new Error("DB down"));

    const errorSpy = jest
      .spyOn((service as unknown as { logger: { error: jest.Mock } }).logger, "error")
      .mockImplementation(() => undefined);

    const result = await service.login(
      { emailOrUsername: "admin", password: "rahasia123" },
      { requestId: "req_test" }
    );

    expect(result.user.id).toBe("u1");
    expect(errorSpy).toHaveBeenCalledWith(
      "auditLog gagal",
      expect.objectContaining({ action: "LOGIN", entity: "user", entityId: "u1" })
    );
    errorSpy.mockRestore();
  });
});

describe("AuthService.resetPasswordByOperator & me", () => {
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let service: AuthService;
  const scopeResolverMock = {
    resolve: jest.fn().mockResolvedValue({ classIds: ["c1"], homeroomClassId: "c2" })
  };

  const baseUser = {
    id: "u1",
    email: "admin@opensis.local",
    username: "admin",
    password_hash: "hash-lama",
    must_change_password: false,
    failed_login_attempts: 4,
    full_name: "Admin",
    is_active: true,
    last_login_at: null,
    phone: null,
    avatar_url: null,
    roles: [{ role: "SUPERADMIN", status: "ACTIVE" }]
  };

  beforeEach(() => {
    prismaMock = makePrismaMock();
    (prismaMock.auditLog as { create: jest.Mock }).create.mockResolvedValue({});
    service = new AuthService(prismaMock as unknown as PrismaClient, scopeResolverMock as never);
  });

  it("reset password: password sementara ≥8 karakter + must_change_password=true", async () => {
    (prismaMock.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue(baseUser);
    const update = prismaMock.user as { update: jest.Mock };
    update.update.mockResolvedValue({ ...baseUser, must_change_password: true });

    const result = await service.resetPasswordByOperator("actor1", { userId: "u1" });
    expect(result.mustChangePassword).toBe(true);
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          must_change_password: true,
          failed_login_attempts: 0
        })
      })
    );
  });

  it("reset password: semua refresh token aktif di-revoke (SEC-007)", async () => {
    (prismaMock.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue(baseUser);
    (prismaMock.user as { update: jest.Mock }).update.mockResolvedValue({
      ...baseUser,
      must_change_password: true
    });
    const revoke = prismaMock.refreshToken as { updateMany: jest.Mock };
    revoke.updateMany.mockClear();

    await service.resetPasswordByOperator("actor1", { userId: "u1" });

    expect(revoke.updateMany).toHaveBeenCalledWith({
      where: { user_id: "u1", revoked_at: null },
      data: { revoked_at: expect.any(Date) }
    });
  });

  it("me: profil + roles + scope", async () => {
    (prismaMock.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue(baseUser);
    const result = await service.me("u1", "req_me");
    expect(result.roles).toContain("SUPERADMIN");
    expect(result.classIds).toEqual(["c1"]);
    expect(result.homeroomClassId).toBe("c2");
  });
});

describe("AuthService.changePassword", () => {
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let service: AuthService;
  const scopeResolverMock = {
    resolve: jest.fn().mockResolvedValue({ classIds: [], homeroomClassId: null })
  };

  const makeUser = async (overrides: Record<string, unknown> = {}) => ({
    id: "u1",
    email: "admin@opensis.local",
    username: "admin",
    password_hash: await hashPassword("rahasia123"),
    must_change_password: true,
    failed_login_attempts: 0,
    full_name: "Admin",
    is_active: true,
    last_login_at: null,
    phone: null,
    avatar_url: null,
    roles: [{ role: "SUPERADMIN", status: "ACTIVE" }],
    ...overrides
  });

  beforeEach(() => {
    prismaMock = makePrismaMock();
    (prismaMock.auditLog as { create: jest.Mock }).create.mockResolvedValue({});
    service = new AuthService(prismaMock as unknown as PrismaClient, scopeResolverMock as never);
  });

  it("ganti password: semua refresh token aktif di-revoke (SEC-007)", async () => {
    const user = await makeUser();
    (prismaMock.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue(user);
    (prismaMock.user as { update: jest.Mock }).update.mockResolvedValue(user);
    const revoke = prismaMock.refreshToken as { updateMany: jest.Mock };
    revoke.updateMany.mockClear();

    const result = await service.changePassword("u1", {
      currentPassword: "rahasia123",
      newPassword: "baruRahasia456"
    });

    expect(result).toEqual({ success: true });
    expect(revoke.updateMany).toHaveBeenCalledWith({
      where: { user_id: "u1", revoked_at: null },
      data: { revoked_at: expect.any(Date) }
    });
  });

  it("password saat ini salah → BadRequestException tanpa revoke", async () => {
    const user = await makeUser();
    (prismaMock.user as { findUnique: jest.Mock }).findUnique.mockResolvedValue(user);
    const revoke = prismaMock.refreshToken as { updateMany: jest.Mock };
    revoke.updateMany.mockClear();

    await expect(
      service.changePassword("u1", {
        currentPassword: "salah",
        newPassword: "baruRahasia456"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(revoke.updateMany).not.toHaveBeenCalled();
  });
});
