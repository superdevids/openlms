import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "../../common/permissions.guard";
import {
  canAccess,
  parseScopeFromCode,
  PermissionsResolver,
  PermissionGrant,
  PermissionOverrideGrant
} from "./permissions-resolver";
import { Public } from "../../common/public.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import { Roles } from "../../common/roles.decorator";
import type { AuthenticatedRequest } from "../../common/auth.guard";

describe("canAccess (logika permission + scope)", () => {
  const grants: PermissionGrant[] = [
    { code: "class:read:class", scope: "KELAS", deny: false },
    { code: "class:read:school", scope: "SEKOLAH", deny: false },
    { code: "auth:me:self", scope: "SENDIRI", deny: false },
    { code: "announcement:read", scope: "SEKOLAH", deny: false }
  ];
  const overrides: PermissionOverrideGrant[] = [];

  it("grant KELAS memenuhi permintaan :class", () => {
    expect(canAccess("class:read:class", grants, overrides)).toBe(true);
  });

  it("grant KELAS TIDAK memenuhi permintaan :school", () => {
    const kelasOnly = grants.filter((g) => g.code !== "class:read:school");
    expect(canAccess("class:read:school", kelasOnly, overrides)).toBe(false);
  });

  it("grant SEKOLAH memenuhi permintaan :school (hierarki scope)", () => {
    expect(canAccess("class:read:school", grants, overrides)).toBe(true);
  });

  it("grant SENDIRI memenuhi permintaan :self", () => {
    expect(canAccess("auth:me:self", grants, overrides)).toBe(true);
  });

  it("permission tanpa scope cukup memiliki grant", () => {
    expect(canAccess("announcement:read", grants, overrides)).toBe(true);
    expect(
      canAccess(
        "announcement:read",
        [{ code: "class:read:class", scope: "KELAS", deny: false }],
        overrides
      )
    ).toBe(false);
  });

  it("UserPermissionOverride DENY menang atas grant role", () => {
    const denyOverrides: PermissionOverrideGrant[] = [{ code: "class:read:class", effect: "DENY" }];
    expect(canAccess("class:read:class", grants, denyOverrides)).toBe(false);
  });

  it("UserPermissionOverride ALLOW memberi akses tanpa grant role", () => {
    const allowOverrides: PermissionOverrideGrant[] = [
      { code: "payroll:read:school", effect: "ALLOW" }
    ];
    expect(canAccess("payroll:read:school", [], allowOverrides)).toBe(true);
  });

  it("grant DENY (role) ditolak", () => {
    const denyGrants: PermissionGrant[] = [
      { code: "class:read:class", scope: "KELAS", deny: true }
    ];
    expect(canAccess("class:read:class", denyGrants, overrides)).toBe(false);
  });
});

describe("parseScopeFromCode (normalisasi scope — R-XX)", () => {
  it("mengenali suffix lowercase yang dipakai seed", () => {
    expect(parseScopeFromCode("grade:write:class")).toBe("KELAS");
    expect(parseScopeFromCode("grade:write:school")).toBe("SEKOLAH");
    expect(parseScopeFromCode("auth:me:self")).toBe("SENDIRI");
  });

  it("kompatibilitas mundur: suffix uppercase tetap dikenali", () => {
    expect(parseScopeFromCode("grade:write:CLASS")).toBe("KELAS");
    expect(parseScopeFromCode("grade:write:SCHOOL")).toBe("SEKOLAH");
    expect(parseScopeFromCode("grade:write:SENDIRI")).toBe("SENDIRI");
    expect(parseScopeFromCode("grade:write:SELF")).toBe("SENDIRI");
  });

  it("kode tanpa suffix scope → null", () => {
    expect(parseScopeFromCode("announcement:read")).toBeNull();
    expect(parseScopeFromCode("grade:write")).toBeNull();
    expect(parseScopeFromCode("auth:login")).toBeNull();
  });
});

describe("canAccess dengan scope lowercase (enforcement KELAS vs SEKOLAH)", () => {
  const overrides: PermissionOverrideGrant[] = [];

  it("grant scope KELAS memenuhi permintaan :class", () => {
    const grants: PermissionGrant[] = [{ code: "grade:write:class", scope: "KELAS", deny: false }];
    expect(canAccess("grade:write:class", grants, overrides)).toBe(true);
  });

  it("grant scope KELAS TIDAK memenuhi permintaan :school (scope rank)", () => {
    const grants: PermissionGrant[] = [{ code: "grade:write:school", scope: "KELAS", deny: false }];
    expect(canAccess("grade:write:school", grants, overrides)).toBe(false);
  });

  it("grant scope SEKOLAH memenuhi permintaan :school", () => {
    const grants: PermissionGrant[] = [
      { code: "grade:write:school", scope: "SEKOLAH", deny: false }
    ];
    expect(canAccess("grade:write:school", grants, overrides)).toBe(true);
  });

  it("grant scope SEKOLAH juga memenuhi permintaan :class (hierarki)", () => {
    const grants: PermissionGrant[] = [
      { code: "grade:write:class", scope: "SEKOLAH", deny: false }
    ];
    expect(canAccess("grade:write:class", grants, overrides)).toBe(true);
  });

  it("kode tanpa scope tetap cukup memiliki grant", () => {
    const grants: PermissionGrant[] = [
      { code: "announcement:read", scope: "SENDIRI", deny: false }
    ];
    expect(canAccess("announcement:read", grants, overrides)).toBe(true);
  });

  it("uppercase pada kode juga tetap bekerja", () => {
    const grants: PermissionGrant[] = [
      { code: "grade:write:SCHOOL", scope: "SEKOLAH", deny: false }
    ];
    expect(canAccess("grade:write:SCHOOL", grants, overrides)).toBe(true);
  });

  it("DENY override menang atas grant", () => {
    const grants: PermissionGrant[] = [{ code: "grade:write:class", scope: "KELAS", deny: false }];
    const denyOverrides: PermissionOverrideGrant[] = [
      { code: "grade:write:class", effect: "DENY" }
    ];
    expect(canAccess("grade:write:class", grants, denyOverrides)).toBe(false);
  });
});

describe("PermissionsGuard (global, metadata-driven)", () => {
  class TestController {
    @Public()
    publicRoute() {
      return "ok";
    }

    @RequirePermission("class:read:class")
    readClass() {
      return "ok";
    }

    @RequirePermission("payroll:read:school")
    readPayroll() {
      return "ok";
    }

    @Roles("SUPERADMIN")
    adminOnly() {
      return "ok";
    }

    @Roles("GURU")
    teacherOnly() {
      return "ok";
    }

    noMeta() {
      return "ok";
    }
  }

  const makeCtx = (method: () => unknown, req: Partial<AuthenticatedRequest>): ExecutionContext =>
    ({
      getHandler: () => method,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => req })
    }) as unknown as ExecutionContext;

  const resolverMock = {
    resolvePermissions: jest.fn(),
    resolveOverrides: jest.fn()
  };
  const reflector = new Reflector();

  const buildGuard = () =>
    new PermissionsGuard(reflector, resolverMock as unknown as PermissionsResolver);

  const authRequest = (): Partial<AuthenticatedRequest> => ({
    requestContext: {
      userId: "u1",
      roles: ["GURU"],
      classIds: ["c1"],
      homeroomClassId: null,
      requestId: "req_test"
    }
  });

  beforeEach(() => {
    resolverMock.resolvePermissions.mockReset();
    resolverMock.resolveOverrides.mockReset();
    resolverMock.resolvePermissions.mockResolvedValue([
      { code: "class:read:class", scope: "KELAS", deny: false }
    ]);
    resolverMock.resolveOverrides.mockResolvedValue([]);
  });

  it("@Public → bypass tanpa resolusi permission", async () => {
    await expect(
      buildGuard().canActivate(makeCtx(TestController.prototype.publicRoute, {}))
    ).resolves.toBe(true);
    expect(resolverMock.resolvePermissions).not.toHaveBeenCalled();
  });

  it("tanpa metadata → 403 (fail-closed, bukan no-op)", async () => {
    await expect(
      buildGuard().canActivate(makeCtx(TestController.prototype.noMeta, authRequest()))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("permission dimiliki → diizinkan", async () => {
    await expect(
      buildGuard().canActivate(makeCtx(TestController.prototype.readClass, authRequest()))
    ).resolves.toBe(true);
  });

  it("permission tidak dimiliki → 403 ForbiddenException", async () => {
    await expect(
      buildGuard().canActivate(makeCtx(TestController.prototype.readPayroll, authRequest()))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("@Roles dipenuhi → diizinkan", async () => {
    const req = authRequest() as Partial<AuthenticatedRequest>;
    req.requestContext = { ...req.requestContext!, roles: ["SUPERADMIN"] };
    await expect(
      buildGuard().canActivate(makeCtx(TestController.prototype.adminOnly, req))
    ).resolves.toBe(true);
  });

  it("@Roles tidak dipenuhi → 403", async () => {
    const req = authRequest() as Partial<AuthenticatedRequest>;
    req.requestContext = { ...req.requestContext!, roles: ["SISWA"] };
    await expect(
      buildGuard().canActivate(makeCtx(TestController.prototype.teacherOnly, req))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("tanpa requestContext (AuthGuard tidak jalan) → 401 Unauthorized", async () => {
    const resolverCalls = resolverMock.resolvePermissions;
    await expect(
      buildGuard().canActivate(makeCtx(TestController.prototype.readClass, {}))
    ).rejects.toThrow();
    expect(resolverCalls).not.toHaveBeenCalled();
  });
});
