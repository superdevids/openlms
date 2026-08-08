/**
 * Unit test — AppSettingsService edge: mergeSettings, getSettings NotFound,
 * update tanpa school, npsn/name update, getFontSettings tanpa settings.
 */
import "reflect-metadata";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@opensis/database";
import { AppSettingsService } from "../../src/modules/app-settings/app-settings.service";

function makePrismaMock() {
  const schoolProfile = { findFirst: jest.fn(), update: jest.fn() };
  const auditLog = { create: jest.fn().mockResolvedValue({}) };
  const prisma = { schoolProfile, auditLog } as unknown as PrismaClient;
  return { prisma, schoolProfile, auditLog };
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

describe("AppSettingsService edge", () => {
  it("getSettings melempar NotFoundException bila profil belum diatur", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(null);

    const svc = new AppSettingsService(prisma);
    await expect(svc.getSettings()).rejects.toBeInstanceOf(NotFoundException);
  });

  it("getSettings memetakan view (profil + settings + updatedAt)", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(
      makeSchool({ attendance: { absence_threshold_per_month: 4 } })
    );

    const svc = new AppSettingsService(prisma);
    const view = await svc.getSettings();

    expect(view.profile.name).toBe("SMAN 1");
    expect(view.profile.npsn).toBe("12345678");
    expect(view.settings.attendance).toEqual({ absence_threshold_per_month: 4 });
    expect(view.updatedAt).toBeInstanceOf(Date);
  });

  it("getSettings menormalkan settings bukan objek → {}", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(makeSchool("bukan objek" as never));

    const svc = new AppSettingsService(prisma);
    const view = await svc.getSettings();
    expect(view.settings).toEqual({});
  });

  it("updateSettings melempar NotFoundException bila profil belum ada", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(null);

    const svc = new AppSettingsService(prisma);
    await expect(svc.updateSettings({ name: "X" }, "u1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updateSettings menolak font bukan objek -> 400", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(makeSchool());

    const svc = new AppSettingsService(prisma);
    await expect(
      svc.updateSettings({ settings: { font: "Inter" } as never }, "u1")
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updateSettings mempertahankan npsn/name lama bila dto tidak mengirim", async () => {
    const { prisma, schoolProfile, auditLog } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(makeSchool());
    schoolProfile.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...makeSchool(),
        timezone: (data.timezone as string) ?? "Asia/Jakarta"
      })
    );

    const svc = new AppSettingsService(prisma);
    const result = await svc.updateSettings({ timezone: "Asia/Makassar" }, "u1");

    expect(result.profile.timezone).toBe("Asia/Makassar");
    expect(schoolProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "SMAN 1",
          npsn: "12345678",
          timezone: "Asia/Makassar"
        })
      })
    );
    expect(auditLog.create).toHaveBeenCalled();
  });

  it("updateSettings merge nested settings (attendance/onboarding)", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(
      makeSchool({ attendance: { absence_threshold_per_month: 3 }, semester: "GANJIL" })
    );
    schoolProfile.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      makeSchool(data.settings as Record<string, unknown>)
    );

    const svc = new AppSettingsService(prisma);
    const result = await svc.updateSettings(
      { settings: { attendance: { absence_threshold_per_month: 5 }, semester: "GENAP" } },
      "u1"
    );

    expect(result.settings.attendance).toEqual({ absence_threshold_per_month: 5 });
    expect(result.settings.semester).toBe("GENAP");
  });

  it("getFontSettings default saat profil tidak punya settings.font", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(makeSchool({}));

    const svc = new AppSettingsService(prisma);
    await expect(svc.getFontSettings()).resolves.toEqual({
      font_family: null,
      base_font_scale: "normal"
    });
  });
});
