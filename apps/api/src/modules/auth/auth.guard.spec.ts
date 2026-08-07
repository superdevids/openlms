import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PrismaClient } from "@openlms/database";
import { AuthGuard, AuthenticatedRequest } from "../../common/auth.guard";
import { Public } from "../../common/public.decorator";
import { ScopeResolver } from "../../common/scope-resolver";
import { ACCESS_COOKIE_NAME } from "./auth.constants";
import { signAccessToken } from "./jwt.util";

class TestController {
  @Public()
  publicRoute() {
    return "ok";
  }

  protectedRoute() {
    return "ok";
  }
}

const makeCtx = (method: () => unknown, req: Partial<AuthenticatedRequest>): ExecutionContext =>
  ({
    getHandler: () => method,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => req })
  }) as unknown as ExecutionContext;

function makePrismaMock(user: Record<string, unknown> | null): unknown {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(user)
    }
  };
}

describe("AuthGuard (F1-T3)", () => {
  const reflector = new Reflector();
  const scopeResolverMock = {
    resolve: jest.fn().mockResolvedValue({ classIds: ["c1"], homeroomClassId: "c2" })
  };

  const activeUser = {
    id: "u1",
    email: "admin@openlms.local",
    username: "admin",
    full_name: "Admin",
    is_active: true,
    must_change_password: true,
    roles: [{ role: "SUPERADMIN", status: "ACTIVE" }]
  };

  const buildGuard = (user: Record<string, unknown> | null) =>
    new AuthGuard(
      reflector,
      makePrismaMock(user) as unknown as PrismaClient,
      scopeResolverMock as unknown as ScopeResolver
    );

  it("@Public → bypass tanpa JWT", async () => {
    await expect(
      buildGuard(activeUser).canActivate(makeCtx(TestController.prototype.publicRoute, {}))
    ).resolves.toBe(true);
  });

  it("path /health dibiarkan publik (tanpa modifikasi HealthModule)", async () => {
    const guard = buildGuard(null);
    const req = { path: "/api/v1/health" } as Partial<AuthenticatedRequest>;
    await expect(
      guard.canActivate(makeCtx(TestController.prototype.protectedRoute, req))
    ).resolves.toBe(true);
  });

  it("tanpa token → 401", async () => {
    const req = { path: "/api/v1/auth/me", headers: {} } as Partial<AuthenticatedRequest>;
    await expect(
      buildGuard(activeUser).canActivate(makeCtx(TestController.prototype.protectedRoute, req))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("token valid → RequestContext + AuthUser terpasang", async () => {
    const token = signAccessToken({ sub: "u1" });
    const req = {
      path: "/api/v1/auth/me",
      requestId: "req_abc",
      headers: {
        cookie: `${ACCESS_COOKIE_NAME}=${token}`
      }
    } as unknown as Partial<AuthenticatedRequest>;
    const guard = buildGuard(activeUser);
    await expect(
      guard.canActivate(makeCtx(TestController.prototype.protectedRoute, req))
    ).resolves.toBe(true);
    expect(req.user?.id).toBe("u1");
    expect(req.user?.roles).toContain("SUPERADMIN");
    expect(req.user?.classIds).toEqual(["c1"]);
    expect(req.user?.homeroomClassId).toBe("c2");
    expect(req.requestContext?.roles).toEqual(["SUPERADMIN"]);
  });

  it("Bearer token juga diterima", async () => {
    const token = signAccessToken({ sub: "u1" });
    const req = {
      path: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${token}` }
    } as unknown as Partial<AuthenticatedRequest>;
    const guard = buildGuard(activeUser);
    await expect(
      guard.canActivate(makeCtx(TestController.prototype.protectedRoute, req))
    ).resolves.toBe(true);
    expect(req.user?.id).toBe("u1");
  });

  it("token tidak valid → 401", async () => {
    const req = {
      path: "/api/v1/auth/me",
      headers: { cookie: `${ACCESS_COOKIE_NAME}=not-a-real-token` }
    } as unknown as Partial<AuthenticatedRequest>;
    await expect(
      buildGuard(activeUser).canActivate(makeCtx(TestController.prototype.protectedRoute, req))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("user tidak aktif → 401", async () => {
    const token = signAccessToken({ sub: "u1" });
    const req = {
      path: "/api/v1/auth/me",
      headers: { cookie: `${ACCESS_COOKIE_NAME}=${token}` }
    } as unknown as Partial<AuthenticatedRequest>;
    const inactive = { ...activeUser, is_active: false };
    await expect(
      buildGuard(inactive).canActivate(makeCtx(TestController.prototype.protectedRoute, req))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
