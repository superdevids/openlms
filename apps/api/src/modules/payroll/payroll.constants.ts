/**
 * Payroll — konstanta domain penggajian (prd04 §5.E; 05 W2-PAYROLL).
 * Sumber nilai: prd04 §5.E.1, seed-data/finance.ts (SALARY_COMPONENT_SEEDS).
 */

/** Kategori komponen gaji (prd04 §5.E.1). */
export const COMPONENT_CATEGORIES = ["TUNJANGAN_TETAP", "POTONGAN", "VARIABEL"] as const;

export type PayrollComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

/** Kode komponen standar (prd04 §5.E.1). */
export const STANDARD_COMPONENT_CODES = [
  "GAJI_POKOK",
  "TUNJANGAN_TETAP",
  "TUNJANGAN_JABATAN",
  "TRANSPORT",
  "MAKAN",
  "PPH21-TER",
  "BPJS_KESEHATAN",
  "BPJS_JHT",
  "BPJS_JP",
  "IURAN",
  "PINJAMAN",
  "HONOR_MENGAJAR",
  "LEMBUR"
] as const;

/** State machine PayrollRun (prd04 §5.E.2). */
export const PAYROLL_RUN_STATES = [
  "DRAFT",
  "CALCULATED",
  "VALIDATED",
  "APPROVED_KEUANGAN",
  "REKAP_KEPSEK",
  "PAID"
] as const;

export type PayrollRunState = (typeof PAYROLL_RUN_STATES)[number];

/** Status payslip. */
export type PayslipStatus = "DRAFT" | "ISSUED" | "ARCHIVED";

/** DI token PayrollStore (InMemoryPayrollStore untuk dev/test; PrismaPayrollStore produksi). */
export const PAYROLL_STORE = Symbol("PAYROLL_STORE");

/** Format periode payroll: "YYYY-MM". */
export function monthPeriod(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
