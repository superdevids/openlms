import { Injectable } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import {
  OnboardingStep1Dto,
  OnboardingStep2Dto,
  OnboardingStep4Dto
} from "./dto/onboarding-step.dto";
import { ImportRowsDto } from "./dto/import.dto";
import { ImportService } from "./import.service";
import type { ImportRunResult } from "./import.service";
import { InvitationsService } from "../auth/invitations.service";
import type { InvitationResult } from "../auth/invitations.service";

export const ONBOARDING_STEPS = [
  "school-profile",
  "data-dasar",
  "import-data",
  "undang",
  "selesai"
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingStepView {
  key: OnboardingStepKey;
  label: string;
  index: number;
  completed: boolean;
}

export interface OnboardingStatus {
  schoolConfigured: boolean;
  currentStep: OnboardingStepKey;
  completedSteps: OnboardingStepKey[];
  completed: boolean;
  steps: OnboardingStepView[];
}

interface OnboardingState {
  completedSteps?: OnboardingStepKey[];
  completed?: boolean;
  [key: string]: unknown;
}

const STEP_LABELS: Record<OnboardingStepKey, string> = {
  "school-profile": "Profil Sekolah",
  "data-dasar": "Data Dasar",
  "import-data": "Impor Data",
  undang: "Undang Pengguna",
  selesai: "Selesai & Tur"
};

/**
 * OnboardingService — wizard setup 5 langkah (F1-T5, prd04 §9.1).
 * Progres disimpan di SchoolProfile.settings.onboarding (tanpa tabel khusus —
 * usulan tabel Onboarding di ISSUES). Impor & undangan didelegasikan.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly importService: ImportService,
    private readonly invitationsService: InvitationsService
  ) {}

  async getStatus(): Promise<OnboardingStatus> {
    const school = await this.ensureSchool();
    const state = this.readState(school.settings);
    const schoolConfigured = Boolean(
      school.name && school.npsn && /^\d{8}$/.test(school.npsn ?? "")
    );
    const completedSteps = state.completedSteps ?? [];

    let currentStep: OnboardingStepKey;
    if (state.completed) {
      currentStep = "selesai";
    } else if (completedSteps.length >= ONBOARDING_STEPS.length - 1) {
      currentStep = "selesai";
    } else if (!schoolConfigured) {
      currentStep = "school-profile";
    } else {
      const next = ONBOARDING_STEPS.find((key) => !completedSteps.includes(key));
      currentStep = next ?? "selesai";
    }

    return {
      schoolConfigured,
      currentStep,
      completedSteps,
      completed: state.completed ?? false,
      steps: ONBOARDING_STEPS.map((key, index) => ({
        key,
        label: STEP_LABELS[key],
        index: index + 1,
        completed: completedSteps.includes(key)
      }))
    };
  }

  /** Langkah 1 — profil sekolah + tahun ajaran. */
  async updateStep1(dto: OnboardingStep1Dto, actorId: string): Promise<OnboardingStatus> {
    const school = await this.ensureSchool();
    const updateData: Prisma.SchoolProfileUpdateInput = {
      name: dto.name,
      npsn: dto.npsn,
      school_type: dto.school_type,
      address: dto.address,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      timezone: dto.timezone ?? "Asia/Jakarta"
    };

    if (dto.academicYearCode) {
      const academicYear = await this.prisma.academicYear.upsert({
        where: { code: dto.academicYearCode },
        update: {},
        create: {
          code: dto.academicYearCode,
          name: dto.academicYearName ?? `Tahun Ajaran ${dto.academicYearCode}`,
          start_date: new Date(),
          end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          status: "OPEN",
          created_by: actorId
        }
      });
      updateData.current_academic_year = { connect: { id: academicYear.id } };
    }

    await this.prisma.schoolProfile.update({
      where: { id: school.id },
      data: updateData
    });
    await this.completeStep(school.id, "school-profile");
    return this.getStatus();
  }

  /** Langkah 2 — data dasar: semester, ambang alpa, toggle fitur. */
  async updateStep2(dto: OnboardingStep2Dto, actorId: string): Promise<OnboardingStatus> {
    const school = await this.ensureSchool();
    const settings = (school.settings ?? {}) as Record<string, unknown>;
    const attendance = (settings["attendance"] ?? {}) as Record<string, unknown>;
    const toggles = (settings["featureToggles"] ?? {}) as Record<string, boolean>;

    const nextSettings: Record<string, unknown> = {
      ...settings,
      semester: dto.semester ?? settings["semester"] ?? "GANJIL",
      attendance: {
        ...attendance,
        absence_threshold_per_month: dto.absenceThresholdPerMonth ?? 3
      },
      featureToggles: {
        ...toggles,
        ...(dto.featureToggles ?? {})
      },
      dataSaver: dto.dataSaver ?? settings["dataSaver"] ?? true
    };
    if (dto.invoiceTemplate) {
      nextSettings["invoiceTemplate"] = dto.invoiceTemplate;
    }

    await this.prisma.schoolProfile.update({
      where: { id: school.id },
      data: { settings: nextSettings as Prisma.InputJsonValue }
    });
    await this.auditStep(school.id, actorId, "data-dasar", nextSettings);
    await this.completeStep(school.id, "data-dasar");
    return this.getStatus();
  }

  /** Langkah 3 — jalankan impor (delegasi ImportService) + tandai selesai. */
  async runStep3(dto: ImportRowsDto, actorId: string, ip?: string): Promise<ImportRunResult> {
    const result = await this.importService.run(dto, actorId, ip);
    const school = await this.ensureSchool();
    await this.completeStep(school.id, "import-data");
    return result;
  }

  /** Langkah 4 — kirim undangan (delegasi InvitationsService). */
  async runStep4(dto: OnboardingStep4Dto, actorId: string): Promise<InvitationResult> {
    const result = await this.invitationsService.send(
      { email: dto.email, username: dto.username, fullName: dto.fullName, role: dto.role },
      actorId
    );
    const school = await this.ensureSchool();
    await this.completeStep(school.id, "undang");
    return result;
  }

  /** Langkah 5 — selesai. */
  async completeStep5(actorId: string): Promise<OnboardingStatus> {
    const school = await this.ensureSchool();
    const state = this.readState(school.settings);
    const completedSteps = [
      ...new Set<OnboardingStepKey>([...(state.completedSteps ?? []), ...ONBOARDING_STEPS])
    ];
    await this.prisma.schoolProfile.update({
      where: { id: school.id },
      data: {
        settings: {
          ...((school.settings ?? {}) as Record<string, unknown>),
          onboarding: { completedSteps, completed: true, completedAt: new Date().toISOString() }
        } as Prisma.InputJsonValue
      }
    });
    await this.auditStep(school.id, actorId, "selesai", { completed: true });
    return this.getStatus();
  }

  private async completeStep(schoolId: string, step: OnboardingStepKey): Promise<void> {
    const school = await this.prisma.schoolProfile.findUnique({ where: { id: schoolId } });
    if (!school) {
      return;
    }
    const state = this.readState(school.settings);
    const completedSteps = [...new Set<OnboardingStepKey>([...(state.completedSteps ?? []), step])];
    await this.prisma.schoolProfile.update({
      where: { id: schoolId },
      data: {
        settings: {
          ...((school.settings ?? {}) as Record<string, unknown>),
          onboarding: {
            ...state,
            completedSteps,
            completed: completedSteps.length >= ONBOARDING_STEPS.length
          }
        } as Prisma.InputJsonValue
      }
    });
  }

  private readState(settings: Prisma.JsonValue | null | undefined): OnboardingState {
    if (settings && typeof settings === "object" && !Array.isArray(settings)) {
      const raw = (settings as Record<string, unknown>)["onboarding"];
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        return raw as OnboardingState;
      }
    }
    return {};
  }

  private async ensureSchool(): Promise<{
    id: string;
    name: string | null;
    npsn: string | null;
    settings: Prisma.JsonValue | null;
  }> {
    const existing = await this.prisma.schoolProfile.findFirst();
    if (existing) {
      return existing;
    }
    // Wizard berjalan bahkan sebelum seed: buat profil kosong minimal.
    return this.prisma.schoolProfile.create({
      data: {
        npsn: "00000000",
        name: "",
        school_type: "SMA",
        address: ""
      }
    });
  }

  private async auditStep(
    schoolId: string,
    actorId: string,
    step: string,
    after: unknown
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: actorId,
          action: AuditAction.UPDATE,
          entity: "onboarding",
          entity_id: schoolId,
          after: { step, ...(after as Record<string, unknown>) } as unknown as Prisma.InputJsonValue
        }
      });
    } catch {
      // jangan gagalkan wizard karena audit
    }
  }
}
