import { Decimal } from "@prisma/client/runtime/library";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import type { Prisma } from "@prisma/client";
import type { AuditAction, Role } from "@prisma/client";
import {
  AuditLogRecord,
  JobPositionRecord,
  PayrollComponentRecord,
  PayrollPeriodConfigRecord,
  PayrollRunItemRecord,
  PayrollRunRecord,
  PayslipRecord,
  SalaryStructureRecord
} from "./payroll.types";
import type { PayrollStore } from "./payroll.store";
import { SEED_COMPONENTS } from "./payroll.store";
import { createDefaultPayrollPeriodConfig } from "./calculator/config-defaults";
import { money } from "./calculator/money";

/**
 * PrismaPayrollStore — adapter persisten PayrollStore (W2).
 *
 * Memetakan kontrak domain (payroll.types.ts) ke model Prisma yang ditambahkan
 * pada migrasi integrate_w2: JobPosition, PayrollComponent, SalaryStructure,
 * PayrollRun, PayrollRunItem, Payslip, PayrollPeriodConfig, AuditLog.
 * Uang memakai Decimal (Prisma.Decimal, 12,2) sesuai keputusan desain prd04 §5.E.
 *
 * SEED default (sama dengan InMemoryPayrollStore): komponen gaji standar
 * (prd04 §5.E.1) + konfigurasi pajak/BPJS periode awal (prd04 §5.E.3) —
 * hanya di-seed saat tabel masih kosong (idempoten).
 */
@Injectable()
export class PrismaPayrollStore implements PayrollStore, OnModuleInit {
  private readonly logger = new Logger(PrismaPayrollStore.name);
  private readonly defaultPeriod = `${new Date().getFullYear()}-01`;
  private seedPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSeeded();
  }

  // ---------- Seed (idempoten) ----------

  private ensureSeeded(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.doSeed();
    }
    return this.seedPromise;
  }

  private async doSeed(): Promise<void> {
    const componentCount = await this.prisma.payrollComponent.count();
    if (componentCount === 0) {
      await this.prisma.payrollComponent.createMany({
        data: SEED_COMPONENTS.map((c) => ({
          code: c.code,
          name: c.name,
          category: c.category,
          kind: c.kind,
          is_taxable: c.isTaxable,
          is_bpjs_applicable: c.isBpjsApplicable,
          unit: c.unit,
          description: c.description,
          active: c.active
        }))
      });
      this.logger.log(`Seeded ${SEED_COMPONENTS.length} komponen gaji standar`);
    }
    const configCount = await this.prisma.payrollPeriodConfig.count();
    if (configCount === 0) {
      const cfg = createDefaultPayrollPeriodConfig(this.defaultPeriod);
      await this.prisma.payrollPeriodConfig.create({
        data: {
          period: cfg.period,
          umr: cfg.umr,
          ter_monthly: this.toJsonValue(cfg.terMonthly),
          ter_daily: this.toJsonValue(cfg.terDaily),
          honor_dpp_percent: cfg.honorDppPercent,
          pns_final_rate_percent: cfg.pnsFinalRatePercent,
          bpjs_kesehatan: this.toJsonValue(cfg.bpjsKesehatan),
          bpjs_jht: this.toJsonValue(cfg.bpjsJht),
          bpjs_jp: this.toJsonValue(cfg.bpjsJp),
          pasal17_rate_percent: cfg.pasal17RatePercent
        }
      });
      this.logger.log(`Seeded konfigurasi pajak/BPJS periode ${cfg.period}`);
    }
  }

  // ---------- JobPosition ----------

  async createJobPosition(input: {
    code: string;
    name: string;
    defaultJabatanAllowance: Decimal | number | string;
    createdBy: string;
  }): Promise<JobPositionRecord> {
    const row = await this.prisma.jobPosition.create({
      data: {
        code: input.code,
        name: input.name,
        default_jabatan_allowance: money(input.defaultJabatanAllowance),
        created_by: input.createdBy
      }
    });
    return this.toJobPosition(row);
  }

  async listJobPositions(onlyActive = false): Promise<JobPositionRecord[]> {
    const rows = await this.prisma.jobPosition.findMany({
      where: onlyActive ? { active: true } : {},
      orderBy: { code: "asc" }
    });
    return rows.map((r) => this.toJobPosition(r));
  }

  async updateJobPosition(
    id: string,
    patch: Partial<Pick<JobPositionRecord, "name" | "defaultJabatanAllowance" | "active">>
  ): Promise<JobPositionRecord> {
    const row = await this.prisma.jobPosition.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.defaultJabatanAllowance !== undefined && {
          default_jabatan_allowance: money(patch.defaultJabatanAllowance)
        }),
        ...(patch.active !== undefined && { active: patch.active })
      }
    });
    return this.toJobPosition(row);
  }

  // ---------- PayrollComponent ----------

  async listComponents(onlyActive = false): Promise<PayrollComponentRecord[]> {
    const rows = await this.prisma.payrollComponent.findMany({
      where: onlyActive ? { active: true } : {},
      orderBy: { code: "asc" }
    });
    return rows.map((r) => this.toComponent(r));
  }

  async upsertComponent(
    input: Omit<PayrollComponentRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<PayrollComponentRecord> {
    const row = await this.prisma.payrollComponent.upsert({
      where: { code: input.code },
      create: {
        code: input.code,
        name: input.name,
        category: input.category,
        kind: input.kind,
        is_taxable: input.isTaxable,
        is_bpjs_applicable: input.isBpjsApplicable,
        unit: input.unit,
        description: input.description,
        active: input.active
      },
      update: {
        name: input.name,
        category: input.category,
        kind: input.kind,
        is_taxable: input.isTaxable,
        is_bpjs_applicable: input.isBpjsApplicable,
        unit: input.unit,
        description: input.description,
        active: input.active
      }
    });
    return this.toComponent(row);
  }

  // ---------- SalaryStructure ----------

  async createSalaryStructure(input: {
    staffId: string;
    effectiveFrom: string;
    components: Record<string, Decimal | number | string>;
    attendanceAllowancePerDay: Decimal | number | string | null;
    createdBy: string;
  }): Promise<SalaryStructureRecord> {
    const normalizedComponents: Record<string, Decimal> = {};
    for (const [k, v] of Object.entries(input.components)) {
      normalizedComponents[k] = money(v);
    }
    const row = await this.prisma.salaryStructure.create({
      data: {
        staff_id: input.staffId,
        effective_from: input.effectiveFrom,
        components: this.toJsonValue(normalizedComponents),
        attendance_allowance_per_day:
          input.attendanceAllowancePerDay === null || input.attendanceAllowancePerDay === undefined
            ? null
            : money(input.attendanceAllowancePerDay),
        created_by: input.createdBy
      }
    });
    return this.toSalaryStructure(row);
  }

  /** Struktur gaji aktif: effective_from <= periode, terbaru (riwayat revisi). */
  async getActiveSalaryStructure(
    staffId: string,
    period: string
  ): Promise<SalaryStructureRecord | null> {
    const row = await this.prisma.salaryStructure.findFirst({
      where: { staff_id: staffId, effective_from: { lte: period } },
      orderBy: { effective_from: "desc" }
    });
    return row ? this.toSalaryStructure(row) : null;
  }

  /** Batch struktur gaji aktif (effective_from <= periode) untuk banyak pegawai. */
  async listActiveSalaryStructures(
    staffIds: string[],
    period: string
  ): Promise<SalaryStructureRecord[]> {
    if (staffIds.length === 0) return [];
    const rows = await this.prisma.salaryStructure.findMany({
      where: { staff_id: { in: staffIds }, effective_from: { lte: period } },
      orderBy: [{ staff_id: "asc" }, { effective_from: "desc" }]
    });
    return rows.map((r) => this.toSalaryStructure(r));
  }

  async listSalaryStructures(staffId?: string): Promise<SalaryStructureRecord[]> {
    const rows = await this.prisma.salaryStructure.findMany({
      where: staffId ? { staff_id: staffId } : {},
      orderBy: { effective_from: "asc" }
    });
    return rows.map((r) => this.toSalaryStructure(r));
  }

  // ---------- PayrollRun ----------

  async createRun(input: {
    period: string;
    createdBy: string;
    note?: string;
  }): Promise<PayrollRunRecord> {
    const row = await this.prisma.payrollRun.create({
      data: {
        period: input.period,
        status: "DRAFT",
        created_by: input.createdBy,
        note: input.note ?? null
      },
      include: { items: true }
    });
    return this.toRun(row);
  }

  async getRun(id: string): Promise<PayrollRunRecord | null> {
    const row = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { items: true }
    });
    return row ? this.toRun(row) : null;
  }

  async findRunByPeriod(period: string): Promise<PayrollRunRecord | null> {
    const row = await this.prisma.payrollRun.findUnique({
      where: { period },
      include: { items: true }
    });
    return row ? this.toRun(row) : null;
  }

  async listRuns(): Promise<PayrollRunRecord[]> {
    const rows = await this.prisma.payrollRun.findMany({
      include: { items: true },
      orderBy: { period: "desc" }
    });
    return rows.map((r) => this.toRun(r));
  }

  async updateRun(id: string, patch: Partial<PayrollRunRecord>): Promise<PayrollRunRecord> {
    const row = await this.prisma.payrollRun.update({
      where: { id },
      data: {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.totalGross !== undefined && { total_gross: money(patch.totalGross) }),
        ...(patch.totalDeductions !== undefined && {
          total_deductions: money(patch.totalDeductions)
        }),
        ...(patch.totalNet !== undefined && { total_net: money(patch.totalNet) }),
        ...(patch.staffCount !== undefined && { staff_count: patch.staffCount }),
        ...(patch.approvedByKeuangan !== undefined && {
          approved_by_keuangan: patch.approvedByKeuangan
        }),
        ...(patch.approvedByKepsek !== undefined && { approved_by_kepsek: patch.approvedByKepsek }),
        ...(patch.paidAt !== undefined && { paid_at: patch.paidAt }),
        ...(patch.note !== undefined && { note: patch.note }),
        ...(patch.items !== undefined && {
          items: {
            deleteMany: {},
            create: patch.items.map((i) => this.toRunItemCreate(i))
          }
        })
      },
      include: { items: true }
    });
    return this.toRun(row);
  }

  async setRunItems(id: string, items: PayrollRunItemRecord[]): Promise<PayrollRunRecord> {
    const totalGross = items.reduce((s, i) => s.plus(i.gross), new Decimal(0));
    const totalDeductions = items.reduce((s, i) => s.plus(i.totalDeductions), new Decimal(0));
    const totalNet = items.reduce((s, i) => s.plus(i.net), new Decimal(0));
    const row = await this.prisma.payrollRun.update({
      where: { id },
      data: {
        staff_count: items.length,
        total_gross: totalGross.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        total_deductions: totalDeductions.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        total_net: totalNet.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
        items: {
          deleteMany: {},
          create: items.map((i) => this.toRunItemCreate(i))
        }
      },
      include: { items: true }
    });
    return this.toRun(row);
  }

  // ---------- Payslip ----------

  async createPayslip(input: {
    runId: string;
    staffId: string;
    period: string;
    snapshot: PayslipRecord["snapshots"][number];
  }): Promise<PayslipRecord> {
    const row = await this.prisma.payslip.create({
      data: {
        run_id: input.runId,
        staff_id: input.staffId,
        period: input.period,
        status: "ISSUED",
        snapshots: this.toJsonValue([input.snapshot])
      }
    });
    return this.toPayslip(row);
  }

  async listPayslips(staffId?: string): Promise<PayslipRecord[]> {
    const rows = await this.prisma.payslip.findMany({
      where: staffId ? { staff_id: staffId } : {},
      orderBy: { created_at: "desc" }
    });
    return rows.map((r) => this.toPayslip(r));
  }

  async getPayslip(id: string): Promise<PayslipRecord | null> {
    const row = await this.prisma.payslip.findUnique({ where: { id } });
    return row ? this.toPayslip(row) : null;
  }

  // ---------- PayrollPeriodConfig ----------

  async getPeriodConfig(period: string): Promise<PayrollPeriodConfigRecord | null> {
    await this.ensureSeeded();
    const row = await this.prisma.payrollPeriodConfig.findUnique({ where: { period } });
    return row ? this.toPeriodConfig(row) : null;
  }

  async upsertPeriodConfig(config: PayrollPeriodConfigRecord): Promise<PayrollPeriodConfigRecord> {
    const row = await this.prisma.payrollPeriodConfig.upsert({
      where: { period: config.period },
      create: {
        period: config.period,
        umr: config.umr,
        ter_monthly: this.toJsonValue(config.terMonthly),
        ter_daily: this.toJsonValue(config.terDaily),
        honor_dpp_percent: config.honorDppPercent,
        pns_final_rate_percent: config.pnsFinalRatePercent,
        bpjs_kesehatan: this.toJsonValue(config.bpjsKesehatan),
        bpjs_jht: this.toJsonValue(config.bpjsJht),
        bpjs_jp: this.toJsonValue(config.bpjsJp),
        pasal17_rate_percent: config.pasal17RatePercent
      },
      update: {
        umr: config.umr,
        ter_monthly: this.toJsonValue(config.terMonthly),
        ter_daily: this.toJsonValue(config.terDaily),
        honor_dpp_percent: config.honorDppPercent,
        pns_final_rate_percent: config.pnsFinalRatePercent,
        bpjs_kesehatan: this.toJsonValue(config.bpjsKesehatan),
        bpjs_jht: this.toJsonValue(config.bpjsJht),
        bpjs_jp: this.toJsonValue(config.bpjsJp),
        pasal17_rate_percent: config.pasal17RatePercent
      }
    });
    return this.toPeriodConfig(row);
  }

  // ---------- Audit log ----------

  async appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void> {
    const after = this.toJsonValue(entry.after);
    await this.prisma.auditLog.create({
      data: {
        actor_id: entry.actorId,
        actor_role: (entry.actorRole as Role | null) ?? undefined,
        action: entry.action as AuditAction,
        entity: entry.entity,
        entity_id: entry.entityId,
        before: this.toJsonValue(entry.before) ?? undefined,
        after:
          entry.note != null
            ? {
                ...(after &&
                typeof after === "object" &&
                !Array.isArray(after) &&
                !(after instanceof Date)
                  ? (after as Record<string, unknown>)
                  : {}),
                _note: entry.note
              }
            : (after ?? undefined),
        ip_address: null
      }
    });
  }

  async listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: { ...(entity ? { entity } : {}), ...(entityId ? { entity_id: entityId } : {}) },
      orderBy: { created_at: "desc" }
    });
    return rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorRole: r.actor_role ?? null,
      action: (r.action as AuditLogRecord["action"]) ?? "CREATE",
      entity: r.entity,
      entityId: r.entity_id,
      before: r.before,
      after: r.after,
      note: null,
      createdAt: r.created_at
    }));
  }

  // ---------- Mapper ----------

  private toJobPosition(r: Prisma.JobPositionGetPayload<Record<string, never>>): JobPositionRecord {
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      defaultJabatanAllowance: r.default_jabatan_allowance,
      active: r.active,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toComponent(
    r: Prisma.PayrollComponentGetPayload<Record<string, never>>
  ): PayrollComponentRecord {
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category as PayrollComponentRecord["category"],
      kind: r.kind as PayrollComponentRecord["kind"],
      isTaxable: r.is_taxable,
      isBpjsApplicable: r.is_bpjs_applicable,
      unit: r.unit as PayrollComponentRecord["unit"],
      description: r.description ?? "",
      active: r.active,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toSalaryStructure(
    r: Prisma.SalaryStructureGetPayload<Record<string, never>>
  ): SalaryStructureRecord {
    const components: Record<string, Decimal> = {};
    if (r.components && typeof r.components === "object" && !Array.isArray(r.components)) {
      for (const [k, v] of Object.entries(r.components as Record<string, unknown>)) {
        components[k] = this.toDecimal(v);
      }
    }
    return {
      id: r.id,
      staffId: r.staff_id,
      effectiveFrom: r.effective_from,
      components,
      attendanceAllowancePerDay: r.attendance_allowance_per_day,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toRunItem(
    r: Prisma.PayrollRunItemGetPayload<Record<string, never>>
  ): PayrollRunItemRecord {
    const warnings = Array.isArray(r.warnings) ? (r.warnings as string[]) : [];
    const detailComponents = Array.isArray(r.detail_components)
      ? (
          r.detail_components as Array<{
            code: string;
            name: string;
            kind: string;
            amount: string | number;
          }>
        ).map((d) => ({
          code: d.code,
          name: d.name,
          kind: d.kind as PayrollRunItemRecord["detailComponents"][number]["kind"],
          amount: this.toDecimal(d.amount)
        }))
      : [];
    return {
      id: r.id,
      runId: r.run_id,
      staffId: r.staff_id,
      gross: r.gross,
      pph21: r.pph21,
      bpjsKesehatan: r.bpjs_kesehatan,
      bpjsJht: r.bpjs_jht,
      bpjsJp: r.bpjs_jp,
      otherDeductions: r.other_deductions,
      totalDeductions: r.total_deductions,
      net: r.net,
      attendanceDays: r.attendance_days,
      belowUmr: r.below_umr,
      warnings,
      detailComponents
    };
  }

  private toRunItemCreate(i: PayrollRunItemRecord): Prisma.PayrollRunItemCreateWithoutRunInput {
    return {
      staff_id: i.staffId,
      gross: i.gross,
      pph21: i.pph21,
      bpjs_kesehatan: i.bpjsKesehatan,
      bpjs_jht: i.bpjsJht,
      bpjs_jp: i.bpjsJp,
      other_deductions: i.otherDeductions,
      total_deductions: i.totalDeductions,
      net: i.net,
      attendance_days: i.attendanceDays,
      below_umr: i.belowUmr,
      warnings: this.toJsonValue(i.warnings),
      detail_components: this.toJsonValue(i.detailComponents)
    };
  }

  private toRun(r: Prisma.PayrollRunGetPayload<{ include: { items: true } }>): PayrollRunRecord {
    return {
      id: r.id,
      period: r.period,
      status: r.status,
      totalGross: r.total_gross,
      totalDeductions: r.total_deductions,
      totalNet: r.total_net,
      staffCount: r.staff_count,
      approvedByKeuangan: r.approved_by_keuangan,
      approvedByKepsek: r.approved_by_kepsek,
      paidAt: r.paid_at,
      note: r.note,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      items: r.items.map((i) => this.toRunItem(i))
    };
  }

  private toPayslip(r: Prisma.PayslipGetPayload<Record<string, never>>): PayslipRecord {
    const snapshots = Array.isArray(r.snapshots)
      ? (r.snapshots as Array<Record<string, unknown>>).map((s) => ({
          gross: this.toDecimal(s.gross),
          pph21: this.toDecimal(s.pph21),
          bpjsKesehatan: this.toDecimal(s.bpjsKesehatan),
          bpjsJht: this.toDecimal(s.bpjsJht),
          bpjsJp: this.toDecimal(s.bpjsJp),
          otherDeductions: this.toDecimal(s.otherDeductions),
          net: this.toDecimal(s.net),
          issuedAt: new Date(s.issuedAt as string)
        }))
      : [];
    return {
      id: r.id,
      runId: r.run_id,
      staffId: r.staff_id,
      period: r.period,
      status: r.status,
      snapshots,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toPeriodConfig(
    r: Prisma.PayrollPeriodConfigGetPayload<Record<string, never>>
  ): PayrollPeriodConfigRecord {
    const terMonthly = (r.ter_monthly ?? {}) as {
      A: Array<Record<string, unknown>>;
      B: Array<Record<string, unknown>>;
      C: Array<Record<string, unknown>>;
    };
    const toBracket = (b: Record<string, unknown>) => ({
      minGross: this.toDecimal(b.minGross),
      maxGross: b.maxGross === null || b.maxGross === undefined ? null : this.toDecimal(b.maxGross),
      ratePercent: this.toDecimal(b.ratePercent)
    });
    const toDaily = (b: Record<string, unknown>) => ({
      minDaily: this.toDecimal(b.minDaily),
      maxDaily: b.maxDaily === null || b.maxDaily === undefined ? null : this.toDecimal(b.maxDaily),
      ratePercent: this.toDecimal(b.ratePercent)
    });
    const bpjsKesehatan = (r.bpjs_kesehatan ?? {}) as Record<string, unknown>;
    const bpjsJht = (r.bpjs_jht ?? {}) as Record<string, unknown>;
    const bpjsJp = (r.bpjs_jp ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      period: r.period,
      umr: r.umr,
      terMonthly: {
        A: (terMonthly.A ?? []).map(toBracket),
        B: (terMonthly.B ?? []).map(toBracket),
        C: (terMonthly.C ?? []).map(toBracket)
      },
      terDaily: ((r.ter_daily as Array<Record<string, unknown>> | null) ?? []).map(toDaily),
      honorDppPercent: r.honor_dpp_percent,
      pnsFinalRatePercent: r.pns_final_rate_percent,
      bpjsKesehatan: {
        employeeSharePercent: this.toDecimal(bpjsKesehatan.employeeSharePercent),
        ceiling: this.toDecimal(bpjsKesehatan.ceiling)
      },
      bpjsJht: {
        employeeSharePercent: this.toDecimal(bpjsJht.employeeSharePercent),
        ceiling:
          bpjsJht.ceiling === null || bpjsJht.ceiling === undefined
            ? null
            : this.toDecimal(bpjsJht.ceiling)
      },
      bpjsJp: {
        employeeSharePercent: this.toDecimal(bpjsJp.employeeSharePercent),
        ceiling: this.toDecimal(bpjsJp.ceiling)
      },
      pasal17RatePercent: r.pasal17_rate_percent,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toDecimal(value: unknown): Decimal {
    if (value instanceof Decimal) {
      return value;
    }
    return new Decimal(value as string | number);
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return null as unknown as Prisma.InputJsonValue;
    }
    if (value instanceof Decimal) {
      return value.toFixed(2);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.toJsonValue(v));
    }
    if (typeof value === "object") {
      const obj: Record<string, Prisma.InputJsonValue> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        obj[k] = this.toJsonValue(v);
      }
      return obj;
    }
    return value as Prisma.InputJsonValue;
  }
}
