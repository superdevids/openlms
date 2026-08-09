const SECRET = "unit-test-secret-32bytes-abcdefghijklmnop";
// Wajib di-set SEBELUM import: jwt.util menangkap JWT_ACCESS_SECRET saat modul dimuat.
process.env.JWT_ACCESS_SECRET = SECRET;

jest.mock("@opensis/database", () => ({
  prisma: {
    userRole: { findMany: jest.fn() }
  }
}));

import { createHmac } from "node:crypto";
import { prisma } from "@opensis/database";
import { RealtimeAuthService } from "../../src/modules/realtime/realtime.auth";

const userRoleModel = prisma.userRole as unknown as { findMany: jest.Mock };

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signToken(payload: Record<string, unknown>): string {
  const body = { typ: "access", ...payload };
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const bodyB64 = b64url(body);
  const signature = createHmac("sha256", SECRET).update(`${header}.${bodyB64}`).digest("base64url");
  return `${header}.${bodyB64}.${signature}`;
}

const futureExp = Math.floor(Date.now() / 1000) + 600;

describe("RealtimeAuthService (handshake Socket.IO — docs/02 §7.1)", () => {
  let service: RealtimeAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RealtimeAuthService();
  });

  it("menerima JWT Bearer valid dan me-resolve role dari UserRole ACTIVE", async () => {
    userRoleModel.findMany.mockResolvedValue([{ role: "SISWA" }, { role: "WALI_MURID" }]);

    const user = await service.authenticate(signToken({ sub: "u1", exp: futureExp }), undefined);

    expect(user).toEqual({ userId: "u1", roles: ["SISWA", "WALI_MURID"] });
    expect(userRoleModel.findMany).toHaveBeenCalledWith({
      where: { user_id: "u1", status: "ACTIVE" },
      select: { role: true }
    });
  });

  it("menerima token dari cookie httpOnly opensis_access", async () => {
    userRoleModel.findMany.mockResolvedValue([{ role: "GURU" }]);

    const user = await service.authenticate(
      undefined,
      `theme=dark; opensis_access=${signToken({ sub: "u2", exp: futureExp })}; other=1`
    );

    expect(user?.userId).toBe("u2");
  });

  it("menolak user tanpa UserRole ACTIVE", async () => {
    userRoleModel.findMany.mockResolvedValue([]);

    await expect(
      service.authenticate(signToken({ sub: "u3", exp: futureExp }), undefined)
    ).resolves.toBeNull();
  });

  it("menolak token dengan signature tidak valid (tanpa query UserRole)", async () => {
    userRoleModel.findMany.mockResolvedValue([{ role: "GURU" }]);
    const token = signToken({ sub: "u4", exp: futureExp });
    // JANGAN mengubah karakter TERAKHIR signature: base64url dari digest 32-byte
    // = 43 karakter, dan karakter terakhir hanya memuat 4 bit data (2 bit sisanya
    // padding yang DIABAIKAN Buffer.from(sig,"base64url")). Menggantinya dengan
    // karakter ber-4-bit-tinggi sama (mis. 'w'→'x') tidak mengubah byte digest,
    // sehingga token "tampered" tetap valid → test flaky (~4/64). Ganti karakter
    // di TENGAH signature (posisi 10) agar byte digest PASTI berubah.
    const parts = token.split(".");
    const signature = parts[2] ?? "";
    const sigTampered = `${signature.slice(0, 10)}${signature[10] === "A" ? "B" : "A"}${signature.slice(11)}`;
    const tampered = `${parts[0] ?? ""}.${parts[1] ?? ""}.${sigTampered}`;

    await expect(service.authenticate(tampered, undefined)).resolves.toBeNull();
    expect(userRoleModel.findMany).not.toHaveBeenCalled();
  });

  it("menolak token expired", async () => {
    userRoleModel.findMany.mockResolvedValue([{ role: "GURU" }]);

    await expect(
      service.authenticate(
        signToken({ sub: "u5", exp: Math.floor(Date.now() / 1000) - 10 }),
        undefined
      )
    ).resolves.toBeNull();
    expect(userRoleModel.findMany).not.toHaveBeenCalled();
  });

  it("menolak token tanpa sub atau typ bukan access", async () => {
    userRoleModel.findMany.mockResolvedValue([{ role: "GURU" }]);

    await expect(
      service.authenticate(signToken({ exp: futureExp }), undefined)
    ).resolves.toBeNull();

    // typ refresh (bukan access) ditolak oleh verifyAccessToken bersama.
    const refreshToken = signToken({ sub: "u6", exp: futureExp, typ: "refresh" });
    await expect(service.authenticate(refreshToken, undefined)).resolves.toBeNull();
    expect(userRoleModel.findMany).not.toHaveBeenCalled();
  });

  it("menolak tanpa token sama sekali", async () => {
    await expect(service.authenticate(undefined, undefined)).resolves.toBeNull();
    expect(userRoleModel.findMany).not.toHaveBeenCalled();
  });
});
