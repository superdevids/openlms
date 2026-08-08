import { BadRequestException } from "@nestjs/common";
import type { PrismaClient } from "@opensis/database";
import { AppSettingsService } from "./app-settings.service";

function makePrismaMock(): Record<string, unknown> {
  return {
    schoolProfile: {
      findFirst: jest.fn(),
      update: jest.fn()
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({})
    }
  };
}

function makeSchool(settings: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "school_1",
    npsn: "12345678",
    nss: null,
    name: "SMAN 1",
    school_type: "SMA",
    address: "Jl. Merdeka",
    phone: null,
    email: null,
    logo_url: null,
    current_academic_year_id: null,
    timezone: "Asia/Jakarta",
    settings,
    updated_at: new Date("2026-01-01T00:00:00Z")
  };
}

describe("AppSettingsService — tipografi global (settings.font)", () => {
  it("menyimpan settings.font saat nilai valid", async () => {
    const prisma = makePrismaMock() as unknown as PrismaClient;
    (prisma.schoolProfile.findFirst as jest.Mock).mockResolvedValue(makeSchool());
    const updated = makeSchool({
      font: { font_family: "Inter", base_font_scale: "large" }
    });
    (prisma.schoolProfile.update as jest.Mock).mockResolvedValue(updated);

    const svc = new AppSettingsService(prisma);
    const result = await svc.updateSettings(
      { settings: { font: { font_family: "Inter", base_font_scale: "large" } } },
      "u1"
    );

    expect(result.settings.font).toEqual({ font_family: "Inter", base_font_scale: "large" });
    expect(prisma.schoolProfile.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("menolak font_family di luar daftar kurasi (tanpa update DB)", async () => {
    const prisma = makePrismaMock() as unknown as PrismaClient;
    (prisma.schoolProfile.findFirst as jest.Mock).mockResolvedValue(makeSchool());

    const svc = new AppSettingsService(prisma);
    await expect(
      svc.updateSettings({ settings: { font: { font_family: "Comic Sans" } } }, "u1")
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.schoolProfile.update).not.toHaveBeenCalled();
  });

  it("menolak base_font_scale di luar normal/large/big", async () => {
    const prisma = makePrismaMock() as unknown as PrismaClient;
    (prisma.schoolProfile.findFirst as jest.Mock).mockResolvedValue(makeSchool());

    const svc = new AppSettingsService(prisma);
    await expect(
      svc.updateSettings({ settings: { font: { base_font_scale: "xl" } } }, "u1")
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.schoolProfile.update).not.toHaveBeenCalled();
  });

  it("getFontSettings mengembalikan nilai yang tersimpan", async () => {
    const prisma = makePrismaMock() as unknown as PrismaClient;
    (prisma.schoolProfile.findFirst as jest.Mock).mockResolvedValue(
      makeSchool({ font: { font_family: "Inter", base_font_scale: "big" } })
    );

    const svc = new AppSettingsService(prisma);
    await expect(svc.getFontSettings()).resolves.toEqual({
      font_family: "Inter",
      base_font_scale: "big"
    });
  });

  it("getFontSettings membersihkan nilai tersimpan yang tidak valid → default", async () => {
    const prisma = makePrismaMock() as unknown as PrismaClient;
    (prisma.schoolProfile.findFirst as jest.Mock).mockResolvedValue(
      makeSchool({ font: { font_family: "Sistem", base_font_scale: "huge" } })
    );

    const svc = new AppSettingsService(prisma);
    await expect(svc.getFontSettings()).resolves.toEqual({
      font_family: null,
      base_font_scale: "normal"
    });
  });

  it("getFontSettings memberi default saat profil sekolah belum ada", async () => {
    const prisma = makePrismaMock() as unknown as PrismaClient;
    (prisma.schoolProfile.findFirst as jest.Mock).mockResolvedValue(null);

    const svc = new AppSettingsService(prisma);
    await expect(svc.getFontSettings()).resolves.toEqual({
      font_family: null,
      base_font_scale: "normal"
    });
  });
});
