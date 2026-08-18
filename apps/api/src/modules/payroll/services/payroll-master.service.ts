import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@opensis/database";
import { PayrollStore } from "../payroll.store";
import { JobPositionRecord, PayrollComponentRecord } from "../payroll.types";
import { PAYROLL_STORE } from "../payroll.constants";
import { money } from "../calculator/money";
import { writeAudit, type AuditActorContext } from "../../lms/lms-audit";

/**
 * Master kepegawaian & komponen gaji (prd04 §5.E.1).
 * JobPosition + PayrollComponent (master kode standar) + SalaryStructure
 * (per pegawai: komponen + besaran + effective_from, riwayat revisi).
 */

export interface CreateJobPositionInput {
  code: string;
  name: string;
  defaultJabatanAllowance?: string;
  createdBy: string;
}

@Injectable()
export class JobPositionService {
  constructor(@Inject(PAYROLL_STORE) private readonly store: PayrollStore) {}

  async create(input: CreateJobPositionInput): Promise<JobPositionRecord> {
    if (!input.code || input.code.trim().length === 0) {
      throw new BadRequestException("Kode jabatan wajib diisi");
    }
    const existing = await this.store.listJobPositions();
    if (existing.some((j) => j.code === input.code.trim())) {
      throw new BadRequestException(`Jabatan ${input.code} sudah ada`);
    }
    return this.store.createJobPosition({
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      defaultJabatanAllowance: input.defaultJabatanAllowance ?? "0",
      createdBy: input.createdBy
    });
  }

  list(onlyActive = false): Promise<JobPositionRecord[]> {
    return this.store.listJobPositions(onlyActive);
  }

  async update(
    id: string,
    patch: { name?: string; defaultJabatanAllowance?: string; active?: boolean }
  ): Promise<JobPositionRecord> {
    return this.store.updateJobPosition(id, {
      name: patch.name,
      defaultJabatanAllowance:
        patch.defaultJabatanAllowance !== undefined
          ? money(patch.defaultJabatanAllowance)
          : undefined,
      active: patch.active
    });
  }
}

@Injectable()
export class PayrollComponentService {
  constructor(@Inject(PAYROLL_STORE) private readonly store: PayrollStore) {}

  list(onlyActive = true): Promise<PayrollComponentRecord[]> {
    return this.store.listComponents(onlyActive);
  }

  /** Registrasi/ubah komponen custom (per sekolah). */
  upsert(
    input: Omit<PayrollComponentRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<PayrollComponentRecord> {
    return this.store.upsertComponent(input);
  }
}

export interface CreateSalaryStructureInput {
  staffId: string;
  effectiveFrom: string;
  /** kode komponen -> nominal (mis. { GAJI_POKOK: "3000000", TRANSPORT: "300000" }) */
  components: Record<string, string>;
  attendanceAllowancePerDay?: string | null;
  createdBy: string;
}

@Injectable()
export class SalaryStructureService {
  constructor(@Inject(PAYROLL_STORE) private readonly store: PayrollStore) {}

  async create(input: CreateSalaryStructureInput): Promise<unknown> {
    if (!input.staffId || input.staffId.trim().length === 0) {
      throw new BadRequestException("staffId wajib diisi");
    }
    if (!input.effectiveFrom || !/^\d{4}-\d{2}$/.test(input.effectiveFrom)) {
      throw new BadRequestException("effectiveFrom wajib format YYYY-MM");
    }
    if (Object.keys(input.components).length === 0) {
      throw new BadRequestException("Minimal satu komponen gaji wajib diisi");
    }
    return this.store.createSalaryStructure({
      staffId: input.staffId,
      effectiveFrom: input.effectiveFrom,
      components: input.components,
      attendanceAllowancePerDay: input.attendanceAllowancePerDay ?? null,
      createdBy: input.createdBy
    });
  }

  active(staffId: string, period: string) {
    return this.store.getActiveSalaryStructure(staffId, period);
  }

  list(staffId?: string) {
    return this.store.listSalaryStructures(staffId);
  }

  /** Set kategori TER PPh21 bulanan per pegawai (PMK 168/2023: A/B/C). */
  async setStaffTerCategory(
    staffId: string,
    category: "A" | "B" | "C",
    actor: AuditActorContext
  ): Promise<{ id: string; terCategory: string }> {
    const existing = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException("Pegawai tidak ditemukan");
    }
    const updated = await prisma.staff.update({
      where: { id: staffId },
      data: { ter_category: category },
      select: { id: true, ter_category: true }
    });
    await writeAudit({
      ctx: actor,
      action: "UPDATE",
      entity: "staff",
      entityId: staffId,
      before: { ter_category: existing.ter_category },
      after: { ter_category: category }
    });
    return { id: updated.id, terCategory: updated.ter_category };
  }
}
