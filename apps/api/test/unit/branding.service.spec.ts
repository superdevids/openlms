/**
 * Unit test — BrandingService: cache TTL, update bump version, setAsset,
 * fallback default bila belum ada row, emit branding:changed.
 */
import { AuditAction } from "@prisma/client";
import type { PrismaClient } from "@opensis/database";
import { BrandingService } from "../../src/modules/branding/branding.service";
import type { RealtimeGateway } from "../../src/modules/realtime/realtime.gateway";
import type { LocalStorageProvider } from "../../src/modules/storage/local-storage.provider";
import { BRANDING_CHANGED_EVENT } from "../../src/modules/notifications/notification-events";

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "brand_1",
    app_name: "SekolahKu",
    tagline: "Unggul & Berkarakter",
    logo_path: null,
    favicon_path: null,
    primary_color: "#2563eb",
    secondary_color: "#1d4ed8",
    accent_color: "#0ea5e9",
    radius: null,
    config_version: 3,
    updated_at: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

function makePrismaMock() {
  const brandingConfig = {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  };
  const auditLog = { create: jest.fn() };
  const prisma = { brandingConfig, auditLog } as unknown as PrismaClient;
  return { prisma, brandingConfig, auditLog };
}

function makeDeps() {
  const realtime = { emitToAll: jest.fn() } as unknown as RealtimeGateway;
  const storage = { save: jest.fn() } as unknown as LocalStorageProvider;
  return { realtime, storage };
}

const ACTOR = "sa_1";
const IP = "10.0.0.1";

describe("BrandingService", () => {
  it("fallback DEFAULT_BRANDING bila tidak ada row di DB", async () => {
    const { prisma, brandingConfig } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(null);
    const { realtime, storage } = makeDeps();
    const service = new BrandingService(prisma, realtime, storage);

    const view = await service.getBranding();
    expect(view.appName).toBe("Opensis");
    expect(view.colors).toEqual({ primary: "#2563eb", secondary: "#1d4ed8", accent: "#0ea5e9" });
    expect(view.configVersion).toBe(1);
    expect(view.logoUrl).toBeNull();
  });

  it("getBranding meng-cache view sampai TTL (findFirst sekali untuk 2 panggilan)", async () => {
    const { prisma, brandingConfig } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(makeRow());
    const { realtime, storage } = makeDeps();
    const service = new BrandingService(prisma, realtime, storage);

    const a = await service.getBranding();
    const b = await service.getBranding();
    expect(a.appName).toBe("SekolahKu");
    expect(b).toEqual(a);
    expect(brandingConfig.findFirst).toHaveBeenCalledTimes(1);
  });

  it("invalidate memaksa reload dari DB", async () => {
    const { prisma, brandingConfig } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(makeRow());
    const { realtime, storage } = makeDeps();
    const service = new BrandingService(prisma, realtime, storage);

    await service.getBranding();
    brandingConfig.findFirst.mockResolvedValue(makeRow({ app_name: "Baru" }));
    service.invalidate();
    const reloaded = await service.getBranding();
    expect(reloaded.appName).toBe("Baru");
    expect(brandingConfig.findFirst).toHaveBeenCalledTimes(2);
  });

  it("fileUrl menambahkan ?v=configVersion dan membuang leading slash", async () => {
    const { prisma, brandingConfig } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(
      makeRow({ logo_path: "/uploads/logo.png", config_version: 7 })
    );
    const { realtime, storage } = makeDeps();
    const service = new BrandingService(prisma, realtime, storage);

    const view = await service.getBranding();
    expect(view.logoUrl).toBe("/api/v1/storage/files/uploads/logo.png?v=7");
  });

  it("updateBranding menaikkan config_version + AuditLog + emit branding:changed", async () => {
    const { prisma, brandingConfig, auditLog } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(makeRow());
    brandingConfig.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      makeRow({ app_name: data.app_name, config_version: data.config_version })
    );
    const { realtime, storage } = makeDeps();
    const service = new BrandingService(prisma, realtime, storage);

    const view = await service.updateBranding({ appName: "SekolahBaru" }, ACTOR, IP);

    expect(view.appName).toBe("SekolahBaru");
    expect(view.configVersion).toBe(4);
    expect(brandingConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "brand_1" },
        data: expect.objectContaining({ config_version: 4, updated_by: ACTOR })
      })
    );
    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: AuditAction.UPDATE,
          entity: "branding_config",
          ip_address: IP
        })
      })
    );
    expect(realtime.emitToAll).toHaveBeenCalledWith(BRANDING_CHANGED_EVENT, {
      configVersion: 4
    });
  });

  it("updateBranding mempertahankan field yang tidak dikirim", async () => {
    const { prisma, brandingConfig } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(makeRow());
    brandingConfig.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      makeRow({ tagline: data.tagline ?? makeRow().tagline, config_version: data.config_version })
    );
    const { realtime, storage } = makeDeps();
    const service = new BrandingService(prisma, realtime, storage);

    await service.updateBranding({ tagline: "New Tag" }, ACTOR);
    const updateArg = brandingConfig.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateArg.data.app_name).toBe("SekolahKu"); // tidak berubah
    expect(updateArg.data.tagline).toBe("New Tag");
  });

  it("setAsset logo menyimpan file ke storage branding + bump version + emit", async () => {
    const { prisma, brandingConfig, auditLog } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(makeRow());
    brandingConfig.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      makeRow({ logo_path: data.logo_path, config_version: data.config_version })
    );
    const { realtime, storage } = makeDeps();
    (storage.save as jest.Mock).mockResolvedValue("branding/12345-logo.png");
    const service = new BrandingService(prisma, realtime, storage);

    const view = await service.setAsset(
      "logo",
      { originalname: "logo.png", mimetype: "image/png", buffer: Buffer.from("x") },
      ACTOR
    );

    expect(storage.save).toHaveBeenCalledWith(
      "branding",
      expect.objectContaining({ originalname: "logo.png" })
    );
    expect(view.logoUrl).toContain("logo.png");
    expect(view.configVersion).toBe(4);
    expect(realtime.emitToAll).toHaveBeenCalled();
    expect(auditLog.create).toHaveBeenCalled();
  });

  it("setAsset favicon memperbarui favicon_path", async () => {
    const { prisma, brandingConfig } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(makeRow());
    brandingConfig.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      makeRow({ favicon_path: data.favicon_path, config_version: data.config_version })
    );
    const { realtime, storage } = makeDeps();
    (storage.save as jest.Mock).mockResolvedValue("branding/12345-fav.ico");
    const service = new BrandingService(prisma, realtime, storage);

    const view = await service.setAsset(
      "favicon",
      { originalname: "fav.ico", mimetype: "image/x-icon", buffer: Buffer.from("x") },
      ACTOR
    );
    expect(view.faviconUrl).toContain("fav.ico");
    expect(view.logoUrl).toBeNull();
  });

  it("findOrCreate membuat row default bila tidak ada (sebelum update)", async () => {
    const { prisma, brandingConfig } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValueOnce(null); // findOrCreate
    brandingConfig.create.mockResolvedValueOnce(makeRow({ config_version: 1 }));
    brandingConfig.findFirst.mockResolvedValueOnce(makeRow()); // findOrCreate (current)
    brandingConfig.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      makeRow({ app_name: data.app_name, config_version: data.config_version })
    );
    const { realtime, storage } = makeDeps();
    const service = new BrandingService(prisma, realtime, storage);

    await service.updateBranding({ appName: "X" }, ACTOR);
    expect(brandingConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ app_name: "Opensis", config_version: 1 })
      })
    );
  });

  it("emitChanged tidak menggagalkan update saat emitToAll throw", async () => {
    const { prisma, brandingConfig } = makePrismaMock();
    brandingConfig.findFirst.mockResolvedValue(makeRow());
    brandingConfig.update.mockResolvedValue(makeRow({ config_version: 4 }));
    const { realtime, storage } = makeDeps();
    (realtime.emitToAll as jest.Mock).mockImplementation(() => {
      throw new Error("ws down");
    });
    const service = new BrandingService(prisma, realtime, storage);

    const view = await service.updateBranding({ appName: "Y" }, ACTOR);
    expect(view.configVersion).toBe(4);
  });
});
