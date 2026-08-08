/**
 * Payroll — konstanta domain penggajian (prd04 §5.E; 05 W2-PAYROLL).
 * Sumber nilai: prd04 §5.E.1, seed-data/finance.ts (SALARY_COMPONENT_SEEDS).
 */

/** DI token PayrollStore (InMemoryPayrollStore untuk dev/test; PrismaPayrollStore produksi). */
export const PAYROLL_STORE = Symbol("PAYROLL_STORE");

/** Format periode payroll: "YYYY-MM". */
export function monthPeriod(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
