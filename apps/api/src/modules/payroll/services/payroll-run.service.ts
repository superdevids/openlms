import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { prisma } from "@opensis/database";
import { Decimal } from "@prisma/client/runtime/library";
import { PayrollStore } from "../payroll.store";
import {
  PayrollRunItemRecord,
  PayrollRunRecord,
  PayrollRunState,
  PayslipRecord,
  SalaryStructureRecord
} from "../payroll.types";
import { computePayroll, ComponentInput } from "../calculator/payroll-calc";
import { monthPeriod, PAYROLL_STORE } from "../payroll.constants";
import { money } from "../calculator/money";
import { PayrollComponentService } from "./payroll-master.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { PAYROLL_STATUS_EVENT } from "../../notifications/notification-events";

/**
 * PayrollRunService — payroll run bulanan (prd04 §5.E.2).
 *
 * State machine (semua transisi dicatat AuditLog):
 *   DRAFT -> CALCULATED -> VALIDATED -> APPROVED_KEUANGAN -> REKAP_KEPSEK -> PAID
 * - DRAFT: run dibuat; IDEMPOTEN per periode (satu run per bulan).
 * - CALCULATED: tarik StaffAttendance bulan berjalan + struktur gaji, hitung
 *   komponen variabel (HONOR_MENGAJAR x JTM, LEMBUR) & potongan/pajak.
 * - VALIDATED: validasi aturan (gaji net >= UMR; peringatan bila di bawah).
 * - APPROVED_KEUANGAN: approval 1 oleh KEUANGAN.
 * - REKAP_KEPSEK: approval 2 oleh KEPSEK (ringkasan, bukan detail pegawai).
 * - PAID: generate Payslip digital per pegawai.
 */

export interface RunVariableHours {
  staffId: string;
  jtmHours: number;
  lemburHours: number;
}

export interface CreateRunInput {
  period?: string;
  createdBy: string;
  note?: string;
  /** jam mengajar (JTM) & lembur per pegawai untuk bulan berjalan */
  variableHours?: RunVariableHours[];
}

const VALID_TRANSITIONS: Record<PayrollRunState, PayrollRunState[]> = {
  DRAFT: ["CALCULATED"],
  CALCULATED: ["VALIDATED", "DRAFT"],
  VALIDATED: ["APPROVED_KEUANGAN", "CALCULATED"],
  APPROVED_KEUANGAN: ["REKAP_KEPSEK", "VALIDATED"],
  REKAP_KEPSEK: ["PAID", "APPROVED_KEUANGAN"],
  PAID: []
};

@Injectable()
export class PayrollRunService {
  private readonly logger = new Logger(PayrollRunService.name);

  constructor(
    @Inject(PAYROLL_STORE) private readonly store: PayrollStore,
    private readonly components: PayrollComponentService,
    private readonly realtime: RealtimeGateway
  ) {}

  /** Buat run baru (DRAFT) — idempoten per periode. */
  async create(input: CreateRunInput): Promise<PayrollRunRecord> {
    const period = input.period ?? monthPeriod(new Date());
    const existing = await this.store.findRunByPeriod(period);
    if (existing) {
      if (existing.status !== "PAID") {
        return existing; // lanjutkan run yang belum selesai
      }
      throw new BadRequestException(`Payroll periode ${period} sudah PAID`);
    }
    const run = await this.store.createRun({
      period,
      createdBy: input.createdBy,
      note: input.note
    });
    await this.store.appendAuditLog({
      actorId: input.createdBy,
      actorRole: "KEUANGAN",
      action: "CREATE",
      entity: "PayrollRun",
      entityId: run.id,
      before: {},
      after: { period, status: "DRAFT" },
      note: "payroll run dibuat"
    });
    return run;
  }

  /** Hitung run: tarik kehadiran + struktur gaji + kalkulator (CALCULATED). */
  async calculate(
    runId: string,
    variableHours: RunVariableHours[] = []
  ): Promise<PayrollRunRecord> {
    const run = await this.get(runId);
    if (run.status !== "DRAFT" && run.status !== "CALCULATED") {
      throw new BadRequestException(`Run ${run.status} tidak bisa dihitung ulang`);
    }

    const config = await this.store.getPeriodConfig(run.period);
    if (!config) {
      throw new BadRequestException(`Konfigurasi pajak/BPJS periode ${run.period} belum ada`);
    }
    const componentDefs = await this.store.listComponents(true);
    const defByCode = new Map(componentDefs.map((c) => [c.code, c]));
    const hoursByStaff = new Map(variableHours.map((v) => [v.staffId, v]));

    // Tarik staff aktif (master Staff) + kehadiran bulan berjalan.
    const staffList = await prisma.staff.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, ter_category: true }
    });
    const [year, month] = run.period.split("-").map(Number);
    const from = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1));
    const to = new Date(Date.UTC(year ?? 1970, month ?? 1, 0, 23, 59, 59));
    const attendances = await prisma.staffAttendance.findMany({
      where: { staff_id: { in: staffList.map((s) => s.id) }, date: { gte: from, lte: to } }
    });

    // Batch lookup struktur gaji aktif SEMUA pegawai dalam SATU query
    // (sebelumnya getActiveSalaryStructure per pegawai = N+1), lalu pilih
    // revisi terbaru per pegawai di memori.
    const structures = await this.store.listActiveSalaryStructures(
      staffList.map((s) => s.id),
      run.period
    );
    const structureByStaff = new Map<string, SalaryStructureRecord>();
    for (const s of structures) {
      const current = structureByStaff.get(s.staffId);
      if (!current || s.effectiveFrom > current.effectiveFrom) {
        structureByStaff.set(s.staffId, s);
      }
    }

    const items: PayrollRunItemRecord[] = [];
    for (const staff of staffList) {
      const structure = structureByStaff.get(staff.id) ?? null;
      const fixed: ComponentInput[] = [];
      if (structure) {
        for (const [code, amount] of Object.entries(structure.components)) {
          const def = defByCode.get(code);
          if (!def || def.category === "VARIABEL") {
            continue;
          }
          fixed.push({
            code,
            name: def.name,
            kind: def.kind,
            amount,
            isTaxable: def.isTaxable,
            isBpjsApplicable: def.isBpjsApplicable
          });
        }
        if (structure.attendanceAllowancePerDay) {
          const days = this.countAttendanceDays(attendances, staff.id);
          if (days > 0) {
            fixed.push({
              code: "TUNJANGAN_KEHADIRAN",
              name: "Tunjangan Kehadiran",
              kind: "ADDITIVE",
              amount: money(structure.attendanceAllowancePerDay).times(days),
              isTaxable: true,
              isBpjsApplicable: false
            });
          }
        }
      }

      // Komponen variabel dari input (JTM/lembur) + data kehadiran.
      const variable: ComponentInput[] = [];
      const hours = hoursByStaff.get(staff.id);
      const honorRate = structure?.components["HONOR_MENGAJAR"];
      const lemburRate = structure?.components["LEMBUR"];
      if (hours && honorRate && hours.jtmHours > 0) {
        variable.push({
          code: "HONOR_MENGAJAR",
          name: "Honor Mengajar",
          kind: "ADDITIVE",
          amount: money(honorRate).times(hours.jtmHours),
          isTaxable: true,
          isBpjsApplicable: false
        });
      }
      if (hours && lemburRate && hours.lemburHours > 0) {
        variable.push({
          code: "LEMBUR",
          name: "Lembur",
          kind: "ADDITIVE",
          amount: money(lemburRate).times(hours.lemburHours),
          isTaxable: true,
          isBpjsApplicable: false
        });
      }

      // TER per pegawai: kategori A/B/C dari Staff.ter_category (PMK 168/2023);
      // fallback A bila nilai tak dikenal (data lama / nilai kosong).
      const terCategory = (staff.ter_category ?? "A") as keyof typeof config.terMonthly;
      const calc = computePayroll(fixed, variable, {
        umr: config.umr,
        terMonthly: config.terMonthly[terCategory] ?? config.terMonthly.A,
        bpjsKesehatan: config.bpjsKesehatan,
        bpjsJht: config.bpjsJht,
        bpjsJp: config.bpjsJp
      });

      const detailComponents = [...fixed, ...variable].map((c) => ({
        code: c.code,
        name: c.name,
        kind: c.kind,
        amount: money(c.amount)
      }));

      items.push({
        id: `item_${staff.id}_${run.id}`,
        runId: run.id,
        staffId: staff.id,
        gross: calc.gross,
        pph21: calc.pph21,
        bpjsKesehatan: calc.bpjsKesehatan,
        bpjsJht: calc.bpjsJht,
        bpjsJp: calc.bpjsJp,
        otherDeductions: calc.otherDeductions,
        totalDeductions: calc.totalDeductions,
        net: calc.net,
        attendanceDays: this.countAttendanceDays(attendances, staff.id),
        belowUmr: calc.belowUmr,
        warnings: calc.warnings,
        detailComponents
      });
    }

    const updated = await this.store.setRunItems(run.id, items);
    return this.transition(updated, "CALCULATED", run.createdBy);
  }

  /** Validasi aturan (net >= UMR; peringatan) -> VALIDATED. */
  async validate(runId: string, actorId: string): Promise<PayrollRunRecord> {
    const run = await this.get(runId);
    if (run.status !== "CALCULATED") {
      throw new BadRequestException(`Run ${run.status} tidak bisa divalidasi`);
    }
    const warnings: string[] = [];
    for (const item of run.items) {
      for (const w of item.warnings) {
        warnings.push(`[${item.staffId}] ${w}`);
      }
    }
    await this.store.appendAuditLog({
      actorId,
      actorRole: "KEUANGAN",
      action: "UPDATE",
      entity: "PayrollRun",
      entityId: runId,
      before: { status: run.status },
      after: { status: "VALIDATED", warnings: warnings.slice(0, 20) },
      note: warnings.length > 0 ? "validasi dengan peringatan UMR" : "validasi OK"
    });
    return this.transition(run, "VALIDATED", actorId);
  }

  /** Approval 1 KEUANGAN -> APPROVED_KEUANGAN. */
  async approveByKeuangan(runId: string, actorId: string): Promise<PayrollRunRecord> {
    const run = await this.get(runId);
    if (run.status !== "VALIDATED") {
      throw new BadRequestException(`Run harus VALIDATED dulu (sekarang ${run.status})`);
    }
    const updated = await this.store.updateRun(run.id, { approvedByKeuangan: actorId });
    const result = await this.transition(updated, "APPROVED_KEUANGAN", actorId);
    await this.emitPayrollStatus(result, ["KEPSEK", "KEUANGAN"]);
    return result;
  }

  /** Approval 2 KEPSEK (rekap ringkasan) -> REKAP_KEPSEK -> PAID. */
  async approveByKepsek(runId: string, actorId: string): Promise<PayrollRunRecord> {
    const run = await this.get(runId);
    if (run.status !== "APPROVED_KEUANGAN") {
      throw new BadRequestException(`Run harus disetujui KEUANGAN dulu (sekarang ${run.status})`);
    }
    const updated = await this.store.updateRun(run.id, {
      approvedByKepsek: actorId,
      paidAt: new Date()
    });
    // State machine: APPROVED_KEUANGAN -> REKAP_KEPSEK -> PAID (prd04 §5.E.2).
    const rekap = await this.transition(updated, "REKAP_KEPSEK", actorId);
    const paid = await this.transition(rekap, "PAID", actorId);
    // Generate payslip digital untuk semua pegawai (batch, hindari N+1).
    // Anti-duplikat: skip pegawai yang sudah punya payslip untuk run ini
    // (approveByKepsek tidak boleh membuat slip ganda saat retry/idempoten).
    const existingPayslips = await this.store.listPayslips();
    const existingStaffIds = new Set(
      existingPayslips.filter((p) => p.runId === paid.id).map((p) => p.staffId)
    );
    const payslipInputs = paid.items
      .filter((item) => !existingStaffIds.has(item.staffId))
      .map((item) => ({
        runId: paid.id,
        staffId: item.staffId,
        period: paid.period,
        snapshot: {
          gross: item.gross,
          pph21: item.pph21,
          bpjsKesehatan: item.bpjsKesehatan,
          bpjsJht: item.bpjsJht,
          bpjsJp: item.bpjsJp,
          otherDeductions: item.otherDeductions,
          net: item.net,
          issuedAt: new Date()
        }
      }));
    if (payslipInputs.length > 0) {
      await this.store.createPayslips(payslipInputs);
    }
    this.logger.log(`Payroll ${paid.period} PAID (${paid.staffCount} pegawai)`);
    await this.emitPayrollStatus(paid, ["KEUANGAN", "KEPSEK"]);
    return paid;
  }

  /** Ringkasan rekap untuk KEPSEK (tanpa detail per pegawai — privasi gaji). */
  async rekapForKepsek(runId: string): Promise<{
    period: string;
    status: PayrollRunState;
    staffCount: number;
    totalGross: Decimal;
    totalDeductions: Decimal;
    totalNet: Decimal;
    belowUmrCount: number;
  }> {
    const run = await this.get(runId);
    return {
      period: run.period,
      status: run.status,
      staffCount: run.staffCount,
      totalGross: run.totalGross,
      totalDeductions: run.totalDeductions,
      totalNet: run.totalNet,
      belowUmrCount: run.items.filter((i) => i.belowUmr).length
    };
  }

  async get(runId: string): Promise<PayrollRunRecord> {
    const run = await this.store.getRun(runId);
    if (!run) {
      throw new NotFoundException("Payroll run tidak ditemukan");
    }
    return run;
  }

  async list(): Promise<PayrollRunRecord[]> {
    return this.store.listRuns();
  }

  /** Jumlah hari hadir per pegawai (StaffAttendance) dalam rentang periode. */
  private countAttendanceDays(
    attendances: Array<{ staff_id: string; status: string }>,
    staffId: string
  ): number {
    return attendances.filter(
      (a) => a.staff_id === staffId && (a.status === "HADIR" || a.status === "TERLAMBAT")
    ).length;
  }

  /**
   * Emit `payroll:status` ke user KEUANGAN/KEPSEK aktif (best-effort).
   * Tanpa type Notification baru (schema terkunci) → WS event ringan langsung;
   * REST tetap sumber kebenaran.
   */
  private async emitPayrollStatus(
    run: { id: string; period: string; status: PayrollRunState },
    roles: Array<"KEUANGAN" | "KEPSEK">
  ): Promise<void> {
    try {
      const rows = await prisma.userRole.findMany({
        where: { role: { in: roles }, status: "ACTIVE" },
        select: { user_id: true }
      });
      const payload = {
        runId: run.id,
        period: run.period,
        status: run.status
      };
      for (const userId of [...new Set(rows.map((r) => r.user_id))]) {
        this.realtime.emitToUser(userId, PAYROLL_STATUS_EVENT, payload);
      }
    } catch {
      // best-effort
    }
  }

  private async transition(
    run: PayrollRunRecord,
    target: PayrollRunState,
    actorId: string
  ): Promise<PayrollRunRecord> {
    const allowed = VALID_TRANSITIONS[run.status] ?? [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(`Transisi ${run.status} -> ${target} tidak diizinkan`);
    }
    const updated = await this.store.updateRun(run.id, { status: target });
    await this.store.appendAuditLog({
      actorId,
      actorRole: "KEUANGAN",
      action: "UPDATE",
      entity: "PayrollRun",
      entityId: run.id,
      before: { status: run.status },
      after: { status: target },
      note: `transisi state ${run.status} -> ${target}`
    });
    return updated;
  }
}

export type { PayslipRecord };
