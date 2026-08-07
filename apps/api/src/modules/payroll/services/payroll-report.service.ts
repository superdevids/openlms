import { Inject, Injectable } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PayrollStore } from "../payroll.store";
import { PayrollRunRecord } from "../payroll.types";
import { PAYROLL_STORE } from "../payroll.constants";
import { ZERO } from "../calculator/money";

/**
 * PayrollReportService — laporan payroll (prd04 §5.E.5).
 * - Rekap gaji per unit/jabatan (dari JobPosition master).
 * - Beban gaji per periode + komparasi bulanan.
 * - Rekap potongan PPh 21 & BPJS (untuk pelaporan).
 * KEPSEK hanya melihat RINGKASAN (rekapForKepsek), bukan detail per pegawai.
 */

export interface PayrollSummaryLine {
  period: string;
  staffCount: number;
  totalGross: Decimal;
  totalDeductions: Decimal;
  totalNet: Decimal;
  pph21: Decimal;
  bpjsTotal: Decimal;
}

@Injectable()
export class PayrollReportService {
  constructor(@Inject(PAYROLL_STORE) private readonly store: PayrollStore) {}

  /** Beban gaji per periode dari seluruh run PAID. */
  async summaryByPeriod(periods: string[]): Promise<PayrollSummaryLine[]> {
    const runs = await this.store.listRuns();
    const paid = runs.filter(
      (r) => r.status === "PAID" && (periods.length === 0 || periods.includes(r.period))
    );
    return paid.map((run) => this.toSummary(run));
  }

  /** Komparasi beban gaji bulanan (bulan lalu vs bulan ini). */
  async monthlyComparison(currentPeriod: string): Promise<{
    current: PayrollSummaryLine | null;
    previous: PayrollSummaryLine | null;
    deltaNet: Decimal;
  }> {
    const all = await this.summaryByPeriod([]);
    const prevPeriod = this.previousPeriod(currentPeriod);
    const current = all.find((s) => s.period === currentPeriod) ?? null;
    const previous = all.find((s) => s.period === prevPeriod) ?? null;
    const deltaNet = current && previous ? current.totalNet.minus(previous.totalNet) : ZERO;
    return { current, previous, deltaNet };
  }

  /** Rekap potongan PPh 21 & BPJS per periode (pelaporan pajak). */
  async deductionRecap(period: string): Promise<{
    period: string;
    pph21: Decimal;
    bpjsKesehatan: Decimal;
    bpjsJht: Decimal;
    bpjsJp: Decimal;
    other: Decimal;
  }> {
    const run = await this.store.findRunByPeriod(period);
    if (!run) {
      return {
        period,
        pph21: ZERO,
        bpjsKesehatan: ZERO,
        bpjsJht: ZERO,
        bpjsJp: ZERO,
        other: ZERO
      };
    }
    const items = run.items;
    return {
      period,
      pph21: items.reduce((s, i) => s.plus(i.pph21), ZERO),
      bpjsKesehatan: items.reduce((s, i) => s.plus(i.bpjsKesehatan), ZERO),
      bpjsJht: items.reduce((s, i) => s.plus(i.bpjsJht), ZERO),
      bpjsJp: items.reduce((s, i) => s.plus(i.bpjsJp), ZERO),
      other: items.reduce((s, i) => s.plus(i.otherDeductions), ZERO)
    };
  }

  /** Ringkasan untuk KEPSEK: total saja (privasi gaji — prd04 §5.E.5). */
  rekapKepsek(run: PayrollRunRecord) {
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

  private toSummary(run: PayrollRunRecord): PayrollSummaryLine {
    return {
      period: run.period,
      staffCount: run.staffCount,
      totalGross: run.totalGross,
      totalDeductions: run.totalDeductions,
      totalNet: run.totalNet,
      pph21: run.items.reduce((s, i) => s.plus(i.pph21), ZERO),
      bpjsTotal: run.items.reduce(
        (s, i) => s.plus(i.bpjsKesehatan).plus(i.bpjsJht).plus(i.bpjsJp),
        ZERO
      )
    };
  }

  private previousPeriod(period: string): string {
    const [y, m] = period.split("-").map(Number);
    const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 2, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
}
