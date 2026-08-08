import { ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PrismaClient } from "@opensis/database";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { Feature } from "../../common/feature-flag.decorator";

class TestController {
  @Feature("LMS_BASE")
  lms() {
    return "ok";
  }

  @Feature("PPDB")
  ppdb() {
    return "ok";
  }

  @Feature("FLAG_MISSING")
  missing() {
    return "ok";
  }

  noFeature() {
    return "ok";
  }
}

const makeCtx = (method: () => unknown): ExecutionContext =>
  ({
    getHandler: () => method,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => ({}) })
  }) as unknown as ExecutionContext;

function makePrismaMock(overrides: {
  flag?: Record<string, unknown> | null;
  setting?: Record<string, unknown> | null;
}): unknown {
  return {
    featureFlag: {
      findUnique: jest.fn().mockResolvedValue(overrides.flag ?? null)
    },
    appFeatureSetting: {
      findUnique: jest.fn().mockResolvedValue(overrides.setting ?? null)
    }
  };
}

function expectDisabled(promise: Promise<boolean>): void {
  expect(promise).rejects.toMatchObject({
    status: HttpStatus.FORBIDDEN
  });
}

describe("FeatureFlagGuard (F1-T13, prd04 §5.N)", () => {
  const reflector = new Reflector();

  // Cache flag bersifat static (module-level) — bersihkan antar test agar
  // urutan test tidak memengaruhi hasil (flag dari test sebelumnya bocor).
  beforeEach(() => {
    FeatureFlagGuard.invalidateAll();
  });

  it("tanpa metadata @Feature → diizinkan tanpa query DB", async () => {
    const prismaMock = makePrismaMock({ flag: null });
    const guard = new FeatureFlagGuard(reflector, prismaMock as unknown as PrismaClient);
    await expect(guard.canActivate(makeCtx(TestController.prototype.noFeature))).resolves.toBe(
      true
    );
  });

  it("flag default_enabled=true tanpa setting → diizinkan", async () => {
    const prismaMock = makePrismaMock({
      flag: { key: "LMS_BASE", default_enabled: true, is_system: false }
    });
    const guard = new FeatureFlagGuard(reflector, prismaMock as unknown as PrismaClient);
    await expect(guard.canActivate(makeCtx(TestController.prototype.lms))).resolves.toBe(true);
  });

  it("flag OFF (default_enabled=false) → 403 FEATURE_DISABLED", async () => {
    const prismaMock = makePrismaMock({
      flag: { key: "PPDB", default_enabled: false, is_system: false }
    });
    const guard = new FeatureFlagGuard(reflector, prismaMock as unknown as PrismaClient);
    const call = guard.canActivate(makeCtx(TestController.prototype.ppdb));
    await expect(call).rejects.toBeInstanceOf(HttpException);
    try {
      await call;
    } catch (error) {
      const ex = error as HttpException;
      expect(ex.getStatus()).toBe(HttpStatus.FORBIDDEN);
      const body = ex.getResponse() as { code?: string; message?: string };
      expect(body.code).toBe("FEATURE_DISABLED");
      expect(body.message).toContain("PPDB");
    }
  });

  it("AppFeatureSetting enabled=false menimpa default_enabled=true → 403", async () => {
    const prismaMock = makePrismaMock({
      flag: { key: "LMS_BASE", default_enabled: true, is_system: false },
      setting: { feature_key: "LMS_BASE", enabled: false }
    });
    const guard = new FeatureFlagGuard(reflector, prismaMock as unknown as PrismaClient);
    expectDisabled(guard.canActivate(makeCtx(TestController.prototype.lms)));
  });

  it("flag sistem (is_system) tetap ON walau setting=false → diizinkan", async () => {
    const prismaMock = makePrismaMock({
      flag: { key: "LMS_BASE", default_enabled: true, is_system: true },
      setting: { feature_key: "LMS_BASE", enabled: false }
    });
    const guard = new FeatureFlagGuard(reflector, prismaMock as unknown as PrismaClient);
    await expect(guard.canActivate(makeCtx(TestController.prototype.lms))).resolves.toBe(true);
  });

  it("flag tidak dikenal → fail-closed 403", async () => {
    const prismaMock = makePrismaMock({ flag: null });
    const guard = new FeatureFlagGuard(reflector, prismaMock as unknown as PrismaClient);
    expectDisabled(guard.canActivate(makeCtx(TestController.prototype.missing)));
  });
});
