/**
 * Unit test — FeatureFlagsService: list + cache TTL, update (locked/system/not-found),
 * AuditLog, invalidasi cache FeatureFlagGuard.
 */
import "reflect-metadata";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import type { PrismaClient } from "@opensis/database";
import { FeatureFlagsService } from "../../src/modules/feature-flags/feature-flags.service";
import { FeatureFlagGuard } from "../../src/common/feature-flag.guard";

function makePrismaMock() {
  const featureFlag = { findMany: jest.fn(), findUnique: jest.fn() };
  const appFeatureSetting = { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() };
  const auditLog = { create: jest.fn() };
  const prisma = { featureFlag, appFeatureSetting, auditLog } as unknown as PrismaClient;
  return { prisma, featureFlag, appFeatureSetting, auditLog };
}

const flagRow = (overrides: Record<string, unknown> = {}) => ({
  key: "LMS_BASE",
  kategori: "LMS",
  deskripsi: "Fondasi LMS",
  default_enabled: true,
  locked: false,
  is_system: false,
  config_schema: null,
  ...overrides
});

describe("FeatureFlagsService", () => {
  beforeEach(() => {
    FeatureFlagGuard.invalidateAll();
  });

  it("list memetakan flag + nilai efektif dari AppFeatureSetting", async () => {
    const { prisma, featureFlag, appFeatureSetting } = makePrismaMock();
    featureFlag.findMany.mockResolvedValue([
      flagRow({ key: "A", default_enabled: true }),
      flagRow({ key: "B", default_enabled: true })
    ]);
    appFeatureSetting.findMany.mockResolvedValue([
      { feature_key: "A", enabled: false, config: { x: 1 }, updated_by: "u1", updated_at: null }
    ]);

    const service = new FeatureFlagsService(prisma);
    const flags = await service.list();

    const a = flags.find((f) => f.key === "A");
    const b = flags.find((f) => f.key === "B");
    expect(a?.enabled).toBe(false); // setting menimpa default
    expect(a?.config).toEqual({ x: 1 });
    expect(b?.enabled).toBe(true); // fallback default_enabled
    expect(b?.config).toBeNull();
  });

  it("flag sistem (is_system) selalu enabled true walau setting=false", async () => {
    const { prisma, featureFlag, appFeatureSetting } = makePrismaMock();
    featureFlag.findMany.mockResolvedValue([flagRow({ key: "SYS", is_system: true })]);
    appFeatureSetting.findMany.mockResolvedValue([{ feature_key: "SYS", enabled: false }]);

    const service = new FeatureFlagsService(prisma);
    const flags = await service.list();
    expect(flags[0]?.enabled).toBe(true);
  });

  it("list menggunakan cache sampai TTL (DB hanya 1x untuk 2 panggilan)", async () => {
    const { prisma, featureFlag, appFeatureSetting } = makePrismaMock();
    featureFlag.findMany.mockResolvedValue([flagRow()]);
    appFeatureSetting.findMany.mockResolvedValue([]);

    const service = new FeatureFlagsService(prisma);
    await service.list();
    await service.list();

    expect(featureFlag.findMany).toHaveBeenCalledTimes(1);
    expect(appFeatureSetting.findMany).toHaveBeenCalledTimes(1);
  });

  it("update flag tidak dikenal → NotFoundException", async () => {
    const { prisma, featureFlag } = makePrismaMock();
    featureFlag.findUnique.mockResolvedValue(null);

    const service = new FeatureFlagsService(prisma);
    await expect(service.update("NOPE", { enabled: true }, "sa_1")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("update flag locked → ForbiddenException tanpa upsert", async () => {
    const { prisma, featureFlag, appFeatureSetting } = makePrismaMock();
    featureFlag.findUnique.mockResolvedValue(flagRow({ locked: true }));

    const service = new FeatureFlagsService(prisma);
    await expect(service.update("LMS_BASE", { enabled: false }, "sa_1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(appFeatureSetting.upsert).not.toHaveBeenCalled();
  });

  it("update flag sistem dengan enabled=false → ForbiddenException", async () => {
    const { prisma, featureFlag } = makePrismaMock();
    featureFlag.findUnique.mockResolvedValue(flagRow({ is_system: true }));

    const service = new FeatureFlagsService(prisma);
    await expect(service.update("SYS", { enabled: false }, "sa_1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("update membuat AppFeatureSetting (upsert) + audit + invalidasi cache", async () => {
    const { prisma, featureFlag, appFeatureSetting, auditLog } = makePrismaMock();
    featureFlag.findUnique.mockResolvedValue(flagRow());
    appFeatureSetting.findUnique.mockResolvedValue(null);
    appFeatureSetting.upsert.mockResolvedValue({
      feature_key: "LMS_BASE",
      enabled: false,
      config: null,
      updated_by: "sa_1",
      updated_at: null
    });

    const service = new FeatureFlagsService(prisma);
    const view = await service.update("LMS_BASE", { enabled: false }, "sa_1", "10.0.0.1");

    expect(view.enabled).toBe(false);
    expect(appFeatureSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { feature_key: "LMS_BASE" },
        create: expect.objectContaining({ feature_key: "LMS_BASE", enabled: false }),
        update: expect.objectContaining({ enabled: false, updated_by: "sa_1" })
      })
    );
    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AuditAction.UPDATE,
          entity: "feature_flag",
          ip_address: "10.0.0.1"
        })
      })
    );
  });

  it("update memakai setting lama saat dto.enabled tidak dikirim", async () => {
    const { prisma, featureFlag, appFeatureSetting } = makePrismaMock();
    featureFlag.findUnique.mockResolvedValue(flagRow());
    appFeatureSetting.findUnique.mockResolvedValue({
      feature_key: "LMS_BASE",
      enabled: true,
      config: { a: 1 }
    });
    appFeatureSetting.upsert.mockResolvedValue({
      feature_key: "LMS_BASE",
      enabled: true,
      config: { a: 1 },
      updated_by: "sa_1",
      updated_at: null
    });

    const service = new FeatureFlagsService(prisma);
    const view = await service.update("LMS_BASE", { config: { b: 2 } }, "sa_1");
    expect(view.enabled).toBe(true);
    expect(view.config).toEqual({ a: 1 }); // config lama dipertahankan
  });

  it("update memicu reload list (cache dibuang)", async () => {
    const { prisma, featureFlag, appFeatureSetting } = makePrismaMock();
    featureFlag.findMany.mockResolvedValue([flagRow()]);
    appFeatureSetting.findMany.mockResolvedValue([]);
    featureFlag.findUnique.mockResolvedValue(flagRow());
    appFeatureSetting.findUnique.mockResolvedValue(null);
    appFeatureSetting.upsert.mockResolvedValue({
      feature_key: "LMS_BASE",
      enabled: false,
      config: null,
      updated_by: "sa_1",
      updated_at: null
    });

    const service = new FeatureFlagsService(prisma);
    await service.list();
    await service.update("LMS_BASE", { enabled: false }, "sa_1");
    // Setelah update, DB dianggap sudah menyimpan setting baru → reload list
    // menemukan enabled=false (bukan default lagi).
    appFeatureSetting.findMany.mockResolvedValue([
      {
        feature_key: "LMS_BASE",
        enabled: false,
        config: null,
        updated_by: "sa_1",
        updated_at: null
      }
    ]);
    const flags = await service.list();

    expect(featureFlag.findMany).toHaveBeenCalledTimes(2);
    expect(flags[0]?.enabled).toBe(false);
  });
});
