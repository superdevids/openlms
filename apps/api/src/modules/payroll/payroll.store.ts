import { Decimal } from "@prisma/client/runtime/library";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
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
import { createDefaultPayrollPeriodConfig } from "./calculator/config-defaults";
import { money } from "./calculator/money";

/**
 * PayrollStore — abstraksi persistence entitas W2 payroll yang BELUM ada di
 * schema.prisma (JobPosition, PayrollComponent, SalaryStructure, PayrollRun,
 * PayrollRunItem, Payslip, PayrollPeriodConfig).
 *
 * Implementasi saat ini: InMemoryPayrollStore (unit test + pengembangan),
 * dengan SEED default: komponen gaji standar (prd04 §5.E.1) + konfigurasi
 * pajak/BPJS per periode (prd04 §5.E.3). Integration coder menambah model
 * Prisma + adapter PrismaPayrollStore — lihat ISSUES untuk proposal skema.
 * Staff & StaffAttendance tetap memakai PrismaClient (model sudah ada).
 */

export interface PayrollStore {
  // ---- JobPosition ----
  createJobPosition(input: {
    code: string;
    name: string;
    defaultJabatanAllowance: Decimal | number | string;
    createdBy: string;
  }): Promise<JobPositionRecord>;

  listJobPositions(onlyActive?: boolean): Promise<JobPositionRecord[]>;

  updateJobPosition(
    id: string,
    patch: Partial<Pick<JobPositionRecord, "name" | "defaultJabatanAllowance" | "active">>
  ): Promise<JobPositionRecord>;

  // ---- PayrollComponent ----
  listComponents(onlyActive?: boolean): Promise<PayrollComponentRecord[]>;

  upsertComponent(
    input: Omit<PayrollComponentRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<PayrollComponentRecord>;

  // ---- SalaryStructure ----
  createSalaryStructure(input: {
    staffId: string;
    effectiveFrom: string;
    components: Record<string, Decimal | number | string>;
    attendanceAllowancePerDay: Decimal | number | string | null;
    createdBy: string;
  }): Promise<SalaryStructureRecord>;

  getActiveSalaryStructure(staffId: string, period: string): Promise<SalaryStructureRecord | null>;

  /**
   * Batch struktur gaji aktif (effectiveFrom <= period) untuk BANYAK pegawai.
   * Menggantikan getActiveSalaryStructure per pegawai pada perhitungan run
   * massal (N+1); pemilihan revisi terbaru per pegawai dilakukan pemanggil.
   */
  listActiveSalaryStructures(staffIds: string[], period: string): Promise<SalaryStructureRecord[]>;

  listSalaryStructures(staffId?: string): Promise<SalaryStructureRecord[]>;

  // ---- PayrollRun ----
  createRun(input: { period: string; createdBy: string; note?: string }): Promise<PayrollRunRecord>;

  getRun(id: string): Promise<PayrollRunRecord | null>;

  /** Idempotensi: satu run per periode (prd04 §5.E.2). */
  findRunByPeriod(period: string): Promise<PayrollRunRecord | null>;

  listRuns(): Promise<PayrollRunRecord[]>;

  updateRun(id: string, patch: Partial<PayrollRunRecord>): Promise<PayrollRunRecord>;

  setRunItems(id: string, items: PayrollRunItemRecord[]): Promise<PayrollRunRecord>;

  // ---- Payslip ----
  createPayslip(input: {
    runId: string;
    staffId: string;
    period: string;
    snapshot: PayslipRecord["snapshots"][number];
  }): Promise<PayslipRecord>;

  /**
   * Batch generate payslip (approveByKepsek). Menggantikan createPayslip per
   * pegawai (N+1); pemanggil sudah memfilter pegawai yang belum punya payslip.
   * Mengembalikan jumlah payslip yang dibuat.
   */
  createPayslips(
    inputs: Array<{
      runId: string;
      staffId: string;
      period: string;
      snapshot: PayslipRecord["snapshots"][number];
    }>
  ): Promise<number>;

  listPayslips(staffId?: string): Promise<PayslipRecord[]>;

  getPayslip(id: string): Promise<PayslipRecord | null>;

  // ---- PayrollPeriodConfig ----
  getPeriodConfig(period: string): Promise<PayrollPeriodConfigRecord | null>;

  upsertPeriodConfig(config: PayrollPeriodConfigRecord): Promise<PayrollPeriodConfigRecord>;

  // ---- Audit log ----
  appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void>;

  listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]>;
}

/** Komponen gaji standar (seed — sumber prd04 §5.E.1 + seed-data/finance.ts). */
export const SEED_COMPONENTS: Array<
  Omit<PayrollComponentRecord, "id" | "createdAt" | "updatedAt">
> = [
  {
    code: "GAJI_POKOK",
    name: "Gaji Pokok",
    category: "TUNJANGAN_TETAP",
    kind: "ADDITIVE",
    isTaxable: true,
    isBpjsApplicable: true,
    unit: "BULANAN",
    description: "Gaji pokok per bulan",
    active: true
  },
  {
    code: "TUNJANGAN_TETAP",
    name: "Tunjangan Tetap",
    category: "TUNJANGAN_TETAP",
    kind: "ADDITIVE",
    isTaxable: true,
    isBpjsApplicable: true,
    unit: "BULANAN",
    description: "Tunjangan tetap",
    active: true
  },
  {
    code: "TUNJANGAN_JABATAN",
    name: "Tunjangan Jabatan",
    category: "TUNJANGAN_TETAP",
    kind: "ADDITIVE",
    isTaxable: true,
    isBpjsApplicable: true,
    unit: "BULANAN",
    description: "Tunjangan struktural/fungsional",
    active: true
  },
  {
    code: "TRANSPORT",
    name: "Transport",
    category: "TUNJANGAN_TETAP",
    kind: "ADDITIVE",
    isTaxable: true,
    isBpjsApplicable: true,
    unit: "BULANAN",
    description: "Uang transport",
    active: true
  },
  {
    code: "MAKAN",
    name: "Makan",
    category: "TUNJANGAN_TETAP",
    kind: "ADDITIVE",
    isTaxable: true,
    isBpjsApplicable: true,
    unit: "BULANAN",
    description: "Uang makan",
    active: true
  },
  {
    code: "PPH21-TER",
    name: "PPh 21 (TER)",
    category: "POTONGAN",
    kind: "SUBTRACTIVE",
    isTaxable: false,
    isBpjsApplicable: false,
    unit: "BULANAN",
    description: "Pajak penghasilan pasal 21 skema TER",
    active: true
  },
  {
    code: "BPJS_KESEHATAN",
    name: "BPJS Kesehatan",
    category: "POTONGAN",
    kind: "SUBTRACTIVE",
    isTaxable: false,
    isBpjsApplicable: false,
    unit: "BULANAN",
    description: "Iuran BPJS Kesehatan peserta",
    active: true
  },
  {
    code: "BPJS_JHT",
    name: "BPJS JHT",
    category: "POTONGAN",
    kind: "SUBTRACTIVE",
    isTaxable: false,
    isBpjsApplicable: false,
    unit: "BULANAN",
    description: "Iuran JHT peserta",
    active: true
  },
  {
    code: "BPJS_JP",
    name: "BPJS JP",
    category: "POTONGAN",
    kind: "SUBTRACTIVE",
    isTaxable: false,
    isBpjsApplicable: false,
    unit: "BULANAN",
    description: "Iuran JP peserta",
    active: true
  },
  {
    code: "IURAN",
    name: "Iuran",
    category: "POTONGAN",
    kind: "SUBTRACTIVE",
    isTaxable: false,
    isBpjsApplicable: false,
    unit: "BULANAN",
    description: "Iuran koperasi/lainnya",
    active: true
  },
  {
    code: "PINJAMAN",
    name: "Pinjaman",
    category: "POTONGAN",
    kind: "SUBTRACTIVE",
    isTaxable: false,
    isBpjsApplicable: false,
    unit: "BULANAN",
    description: "Angsuran pinjaman",
    active: true
  },
  {
    code: "HONOR_MENGAJAR",
    name: "Honor Mengajar",
    category: "VARIABEL",
    kind: "ADDITIVE",
    isTaxable: true,
    isBpjsApplicable: false,
    unit: "JTM",
    description: "Honor per jam mengajar (JTM)",
    active: true
  },
  {
    code: "LEMBUR",
    name: "Lembur",
    category: "VARIABEL",
    kind: "ADDITIVE",
    isTaxable: true,
    isBpjsApplicable: false,
    unit: "JAM",
    description: "Lembur per jam",
    active: true
  }
];

const nowIso = () => new Date();

@Injectable()
export class InMemoryPayrollStore implements PayrollStore {
  private readonly jobPositions = new Map<string, JobPositionRecord>();
  private readonly components = new Map<string, PayrollComponentRecord>();
  private readonly salaryStructures = new Map<string, SalaryStructureRecord>();
  private readonly runs = new Map<string, PayrollRunRecord>();
  private readonly payslips = new Map<string, PayslipRecord>();
  private readonly periodConfigs = new Map<string, PayrollPeriodConfigRecord>();
  private readonly auditLogs: AuditLogRecord[] = [];
  private readonly defaultPeriod = `${new Date().getFullYear()}-01`;

  constructor() {
    // Seed default komponen gaji standar + konfigurasi pajak/BPJS periode awal.
    for (const c of SEED_COMPONENTS) {
      const record: PayrollComponentRecord = {
        ...c,
        id: `comp_${c.code}`,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      this.components.set(record.id, record);
    }
    const cfg = createDefaultPayrollPeriodConfig(this.defaultPeriod);
    this.periodConfigs.set(cfg.period, cfg);
  }

  private nextId(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

  // ---------- JobPosition ----------

  async createJobPosition(input: {
    code: string;
    name: string;
    defaultJabatanAllowance: Decimal | number | string;
    createdBy: string;
  }): Promise<JobPositionRecord> {
    const now = nowIso();
    const record: JobPositionRecord = {
      id: this.nextId("jp"),
      code: input.code,
      name: input.name,
      defaultJabatanAllowance: money(input.defaultJabatanAllowance),
      active: true,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now
    };
    this.jobPositions.set(record.id, record);
    return record;
  }

  async listJobPositions(onlyActive = false): Promise<JobPositionRecord[]> {
    const all = [...this.jobPositions.values()];
    return onlyActive ? all.filter((j) => j.active) : all;
  }

  async updateJobPosition(
    id: string,
    patch: Partial<Pick<JobPositionRecord, "name" | "defaultJabatanAllowance" | "active">>
  ): Promise<JobPositionRecord> {
    const existing = this.jobPositions.get(id);
    if (!existing) {
      throw new Error(`JobPosition ${id} tidak ditemukan`);
    }
    const updated: JobPositionRecord = {
      ...existing,
      ...patch,
      defaultJabatanAllowance:
        patch.defaultJabatanAllowance !== undefined
          ? money(patch.defaultJabatanAllowance)
          : existing.defaultJabatanAllowance,
      updatedAt: nowIso()
    };
    this.jobPositions.set(id, updated);
    return updated;
  }

  // ---------- PayrollComponent ----------

  async listComponents(onlyActive = false): Promise<PayrollComponentRecord[]> {
    const all = [...this.components.values()];
    return onlyActive ? all.filter((c) => c.active) : all;
  }

  async upsertComponent(
    input: Omit<PayrollComponentRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<PayrollComponentRecord> {
    const existing = [...this.components.values()].find((c) => c.code === input.code);
    const now = nowIso();
    const record: PayrollComponentRecord = {
      ...input,
      id: existing?.id ?? this.nextId("pc"),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    this.components.set(record.id, record);
    return record;
  }

  // ---------- SalaryStructure ----------

  async createSalaryStructure(input: {
    staffId: string;
    effectiveFrom: string;
    components: Record<string, Decimal | number | string>;
    attendanceAllowancePerDay: Decimal | number | string | null;
    createdBy: string;
  }): Promise<SalaryStructureRecord> {
    const now = nowIso();
    const normalizedComponents: Record<string, Decimal> = {};
    for (const [k, v] of Object.entries(input.components)) {
      normalizedComponents[k] = money(v);
    }
    const record: SalaryStructureRecord = {
      id: this.nextId("ss"),
      staffId: input.staffId,
      effectiveFrom: input.effectiveFrom,
      components: normalizedComponents,
      attendanceAllowancePerDay:
        input.attendanceAllowancePerDay === null || input.attendanceAllowancePerDay === undefined
          ? null
          : money(input.attendanceAllowancePerDay),
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now
    };
    this.salaryStructures.set(record.id, record);
    return record;
  }

  /** Struktur gaji aktif: effectiveFrom <= periode, terbaru (riwayat revisi). */
  async getActiveSalaryStructure(
    staffId: string,
    period: string
  ): Promise<SalaryStructureRecord | null> {
    const candidates = [...this.salaryStructures.values()]
      .filter((s) => s.staffId === staffId && s.effectiveFrom <= period)
      .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
    return candidates[0] ?? null;
  }

  /** Batch struktur gaji aktif (effectiveFrom <= periode) untuk banyak pegawai. */
  async listActiveSalaryStructures(
    staffIds: string[],
    period: string
  ): Promise<SalaryStructureRecord[]> {
    if (staffIds.length === 0) return [];
    const idSet = new Set(staffIds);
    return [...this.salaryStructures.values()]
      .filter((s) => idSet.has(s.staffId) && s.effectiveFrom <= period)
      .sort((a, b) =>
        a.staffId === b.staffId
          ? a.effectiveFrom < b.effectiveFrom
            ? 1
            : -1
          : a.staffId < b.staffId
            ? -1
            : 1
      );
  }

  async listSalaryStructures(staffId?: string): Promise<SalaryStructureRecord[]> {
    const all = [...this.salaryStructures.values()];
    return staffId ? all.filter((s) => s.staffId === staffId) : all;
  }

  // ---------- PayrollRun ----------

  async createRun(input: {
    period: string;
    createdBy: string;
    note?: string;
  }): Promise<PayrollRunRecord> {
    const now = nowIso();
    const record: PayrollRunRecord = {
      id: this.nextId("pr"),
      period: input.period,
      status: "DRAFT",
      totalGross: new Decimal(0),
      totalDeductions: new Decimal(0),
      totalNet: new Decimal(0),
      staffCount: 0,
      approvedByKeuangan: null,
      approvedByKepsek: null,
      paidAt: null,
      note: input.note ?? null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      items: []
    };
    this.runs.set(record.id, record);
    return record;
  }

  async getRun(id: string): Promise<PayrollRunRecord | null> {
    return this.runs.get(id) ?? null;
  }

  async findRunByPeriod(period: string): Promise<PayrollRunRecord | null> {
    return [...this.runs.values()].find((r) => r.period === period) ?? null;
  }

  async listRuns(): Promise<PayrollRunRecord[]> {
    return [...this.runs.values()].sort((a, b) => (a.period < b.period ? 1 : -1));
  }

  async updateRun(id: string, patch: Partial<PayrollRunRecord>): Promise<PayrollRunRecord> {
    const existing = this.runs.get(id);
    if (!existing) {
      throw new Error(`PayrollRun ${id} tidak ditemukan`);
    }
    const updated: PayrollRunRecord = {
      ...existing,
      ...patch,
      items: patch.items ?? existing.items,
      updatedAt: nowIso()
    };
    this.runs.set(id, updated);
    return updated;
  }

  async setRunItems(id: string, items: PayrollRunItemRecord[]): Promise<PayrollRunRecord> {
    const existing = this.runs.get(id);
    if (!existing) {
      throw new Error(`PayrollRun ${id} tidak ditemukan`);
    }
    const totalGross = items.reduce((s, i) => s.plus(i.gross), new Decimal(0));
    const totalDeductions = items.reduce((s, i) => s.plus(i.totalDeductions), new Decimal(0));
    const totalNet = items.reduce((s, i) => s.plus(i.net), new Decimal(0));
    const updated: PayrollRunRecord = {
      ...existing,
      items,
      staffCount: items.length,
      totalGross: totalGross.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      totalDeductions: totalDeductions.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      totalNet: totalNet.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      updatedAt: nowIso()
    };
    this.runs.set(id, updated);
    return updated;
  }

  // ---------- Payslip ----------

  async createPayslip(input: {
    runId: string;
    staffId: string;
    period: string;
    snapshot: PayslipRecord["snapshots"][number];
  }): Promise<PayslipRecord> {
    const now = nowIso();
    const record: PayslipRecord = {
      id: this.nextId("ps"),
      runId: input.runId,
      staffId: input.staffId,
      period: input.period,
      status: "ISSUED",
      snapshots: [input.snapshot],
      createdAt: now,
      updatedAt: now
    };
    this.payslips.set(record.id, record);
    return record;
  }

  async createPayslips(
    inputs: Array<{
      runId: string;
      staffId: string;
      period: string;
      snapshot: PayslipRecord["snapshots"][number];
    }>
  ): Promise<number> {
    const now = nowIso();
    let created = 0;
    for (const input of inputs) {
      const record: PayslipRecord = {
        id: this.nextId("ps"),
        runId: input.runId,
        staffId: input.staffId,
        period: input.period,
        status: "ISSUED",
        snapshots: [input.snapshot],
        createdAt: now,
        updatedAt: now
      };
      this.payslips.set(record.id, record);
      created += 1;
    }
    return created;
  }

  async listPayslips(staffId?: string): Promise<PayslipRecord[]> {
    const all = [...this.payslips.values()];
    return staffId ? all.filter((p) => p.staffId === staffId) : all;
  }

  async getPayslip(id: string): Promise<PayslipRecord | null> {
    return this.payslips.get(id) ?? null;
  }

  // ---------- PayrollPeriodConfig ----------

  async getPeriodConfig(period: string): Promise<PayrollPeriodConfigRecord | null> {
    return this.periodConfigs.get(period) ?? null;
  }

  async upsertPeriodConfig(config: PayrollPeriodConfigRecord): Promise<PayrollPeriodConfigRecord> {
    const existing = this.periodConfigs.get(config.period);
    const record: PayrollPeriodConfigRecord = {
      ...config,
      id: existing?.id ?? config.id,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso()
    };
    this.periodConfigs.set(record.period, record);
    return record;
  }

  // ---------- Audit log ----------

  async appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void> {
    this.auditLogs.push({
      ...entry,
      id: this.nextId("aud"),
      createdAt: nowIso()
    });
  }

  async listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]> {
    let logs = this.auditLogs;
    if (entity) logs = logs.filter((l) => l.entity === entity);
    if (entityId) logs = logs.filter((l) => l.entityId === entityId);
    return [...logs];
  }
}
