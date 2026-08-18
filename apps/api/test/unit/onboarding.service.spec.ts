/**
 * Unit test — OnboardingService: wizard 5 langkah (F1-T5, prd04 §9.1).
 * currentStep diturunkan dari schoolConfigured + completedSteps + completed.
 */
// Mock rantai import yang memuat modul fail-fast (jwt.util) saat module-load
// di NODE_ENV=production — solusi sisi test, fail-fast production tidak dilemahkan.
jest.mock("../../src/modules/auth/invitations.service", () => ({
  InvitationsService: class {}
}));
jest.mock("../../src/modules/onboarding/import.service", () => ({
  ImportService: class {}
}));

import "reflect-metadata";
import { ImportType } from "@prisma/client";
import type { PrismaClient } from "@opensis/database";
import {
  OnboardingService,
  ONBOARDING_STEPS
} from "../../src/modules/onboarding/onboarding.service";
import { ImportService } from "../../src/modules/onboarding/import.service";
import { InvitationsService } from "../../src/modules/auth/invitations.service";

function makePrismaMock() {
  const schoolProfile = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  const academicYear = { upsert: jest.fn() };
  const auditLog = { create: jest.fn() };
  const prisma = { schoolProfile, academicYear, auditLog } as unknown as PrismaClient;
  return { prisma, schoolProfile, academicYear, auditLog };
}

function school(settings: Record<string, unknown> | null = null) {
  return {
    id: "school_1",
    name: "SMAN 1",
    npsn: "12345678",
    school_type: "SMA",
    address: "Jl. Merdeka",
    settings,
    created_at: new Date(),
    updated_at: new Date()
  };
}

const importSvc = { run: jest.fn().mockResolvedValue({ imported: 1 }) } as unknown as ImportService;
const invitationsSvc = {
  send: jest.fn().mockResolvedValue({ sent: 1 })
} as unknown as InvitationsService;

describe("OnboardingService", () => {
  it("ONBOARDING_STEPS urutan tetap (kontrak wizard)", () => {
    expect(ONBOARDING_STEPS).toEqual([
      "school-profile",
      "data-dasar",
      "import-data",
      "undang",
      "selesai"
    ]);
  });

  it("getStatus tanpa profil → currentStep school-profile + completed false", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(null);
    // ensureSchool membuat profil kosong minimal (npsn placeholder, name "").
    schoolProfile.create.mockResolvedValue({
      id: "school_new",
      name: "",
      npsn: "00000000",
      school_type: "SMA",
      address: "",
      settings: null
    });
    const service = new OnboardingService(prisma, importSvc, invitationsSvc);

    const status = await service.getStatus();
    expect(status.currentStep).toBe("school-profile");
    expect(status.schoolConfigured).toBe(false);
    expect(status.completed).toBe(false);
    expect(status.steps).toHaveLength(5);
  });

  it("getStatus profil lengkap tanpa progres → currentStep school-profile (step pertama belum selesai)", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(school());
    const service = new OnboardingService(prisma, importSvc, invitationsSvc);

    const status = await service.getStatus();
    expect(status.schoolConfigured).toBe(true);
    expect(status.currentStep).toBe("school-profile");
  });

  it("getStatus profil tidak lengkap (npsn bukan 8 digit) → currentStep school-profile", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue({ ...school(), npsn: "1234" });
    const service = new OnboardingService(prisma, importSvc, invitationsSvc);

    const status = await service.getStatus();
    expect(status.schoolConfigured).toBe(false);
    expect(status.currentStep).toBe("school-profile");
  });

  it("getStatus state.completed=true → currentStep selesai", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(
      school({ onboarding: { completed: true, completedSteps: [...ONBOARDING_STEPS] } })
    );
    const service = new OnboardingService(prisma, importSvc, invitationsSvc);

    const status = await service.getStatus();
    expect(status.currentStep).toBe("selesai");
    expect(status.completed).toBe(true);
    expect(status.completedSteps).toHaveLength(5);
  });

  it("getStatus completedSteps 4/5 → currentStep selesai", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(
      school({
        onboarding: { completedSteps: ["school-profile", "data-dasar", "import-data", "undang"] }
      })
    );
    const service = new OnboardingService(prisma, importSvc, invitationsSvc);

    const status = await service.getStatus();
    expect(status.currentStep).toBe("selesai");
  });

  it("getStatus melanjutkan ke step pertama yang belum selesai", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(
      school({ onboarding: { completedSteps: ["school-profile", "data-dasar"] } })
    );
    const service = new OnboardingService(prisma, importSvc, invitationsSvc);

    const status = await service.getStatus();
    expect(status.currentStep).toBe("import-data");
  });

  it("updateStep1 menyimpan profil + membuat academic year bila ada kode", async () => {
    const { prisma, schoolProfile, academicYear } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(school());
    schoolProfile.findUnique.mockResolvedValue(school());
    academicYear.upsert.mockResolvedValue({ id: "year_1" });

    const service = new OnboardingService(prisma, importSvc, invitationsSvc);
    await service.updateStep1(
      {
        name: "SMAN 2",
        npsn: "87654321",
        school_type: "SMA",
        address: "Jl. Baru",
        academicYearCode: "2026/2027"
      },
      "sa_1"
    );

    expect(academicYear.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "2026/2027" } })
    );
    expect(schoolProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          current_academic_year: { connect: { id: "year_1" } }
        })
      })
    );
    // completeStep menulis onboarding.completedSteps
    expect(schoolProfile.findUnique).toHaveBeenCalledWith({ where: { id: "school_1" } });
  });

  it("updateStep2 menyimpan semester, ambang alpa, dataSaver + completeStep", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(school());
    schoolProfile.findUnique.mockResolvedValue(school());

    const service = new OnboardingService(prisma, importSvc, invitationsSvc);
    await service.updateStep2(
      { semester: "GENAP", absenceThresholdPerMonth: 5, dataSaver: false },
      "sa_1"
    );

    const update = schoolProfile.update.mock.calls[0][0] as {
      data: { settings: Record<string, unknown> };
    };
    expect(update.data.settings["semester"]).toBe("GENAP");
    expect(
      (update.data.settings["attendance"] as Record<string, unknown>).absence_threshold_per_month
    ).toBe(5);
    expect(update.data.settings["dataSaver"]).toBe(false);
  });

  it("updateStep2 default: semester GANJIL, ambang 3, dataSaver true", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(school({}));
    schoolProfile.findUnique.mockResolvedValue(school({}));

    const service = new OnboardingService(prisma, importSvc, invitationsSvc);
    await service.updateStep2({}, "sa_1");

    const update = schoolProfile.update.mock.calls[0][0] as {
      data: { settings: Record<string, unknown> };
    };
    expect(update.data.settings["semester"]).toBe("GANJIL");
    expect(
      (update.data.settings["attendance"] as Record<string, unknown>).absence_threshold_per_month
    ).toBe(3);
    expect(update.data.settings["dataSaver"]).toBe(true);
  });

  it("runStep3 mendelegasikan impor dan menandai import-data selesai", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(school());
    schoolProfile.findUnique.mockResolvedValue(school());

    const service = new OnboardingService(prisma, importSvc, invitationsSvc);
    const result = await service.runStep3({ importType: ImportType.STUDENT, rows: [] }, "sa_1");

    expect(importSvc.run).toHaveBeenCalledWith(
      { importType: ImportType.STUDENT, rows: [] },
      "sa_1",
      undefined,
      []
    );
    expect(result).toEqual({ imported: 1 });
    expect(schoolProfile.findUnique).toHaveBeenCalled();
  });

  it("runStep4 mendelegasikan undangan dan menandai undang selesai", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(school());
    schoolProfile.findUnique.mockResolvedValue(school());

    const service = new OnboardingService(prisma, importSvc, invitationsSvc);
    const result = await service.runStep4(
      { email: "a@b.c", username: "ab", fullName: "A B", role: "GURU" },
      "sa_1"
    );

    expect(invitationsSvc.send).toHaveBeenCalledWith(
      { email: "a@b.c", username: "ab", fullName: "A B", role: "GURU" },
      "sa_1"
    );
    expect(result).toEqual({ sent: 1 });
  });

  it("completeStep5 menulis completed=true + semua step + audit", async () => {
    const { prisma, schoolProfile, auditLog } = makePrismaMock();
    // completeStep5 memanggil ensureSchool (findFirst) lalu getStatus (findFirst lagi).
    schoolProfile.findFirst
      .mockResolvedValueOnce(school({}))
      .mockResolvedValueOnce(
        school({ onboarding: { completedSteps: [...ONBOARDING_STEPS], completed: true } })
      );
    schoolProfile.findUnique.mockResolvedValue(school({ onboarding: { completedSteps: [] } }));

    const service = new OnboardingService(prisma, importSvc, invitationsSvc);
    const status = await service.completeStep5("sa_1");

    const update = schoolProfile.update.mock.calls[0][0] as {
      data: { settings: Record<string, unknown> };
    };
    const onboarding = update.data.settings["onboarding"] as {
      completed: boolean;
      completedSteps: string[];
    };
    expect(onboarding.completed).toBe(true);
    expect(onboarding.completedSteps).toHaveLength(5);
    expect(status.completed).toBe(true);
    expect(auditLog.create).toHaveBeenCalled();
  });

  it("completeStep (internal) tidak throw saat school hilang", async () => {
    const { prisma, schoolProfile } = makePrismaMock();
    schoolProfile.findFirst.mockResolvedValue(school());
    schoolProfile.findUnique.mockResolvedValue(null);

    const service = new OnboardingService(prisma, importSvc, invitationsSvc);
    await service.updateStep1(
      { name: "X", npsn: "12345678", school_type: "SMA", address: "A" },
      "sa_1"
    );
    // Tidak throw meskipun completeStep tidak menemukan school
  });
});
