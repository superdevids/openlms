import { Decimal } from "@prisma/client/runtime/library";

/**
 * Helper uang Payroll — semua nilai moneter memakai Prisma.Decimal (12,2).
 * Duplikasi kecil dari finance/calculator/money.ts agar modul payroll
 * independen (tidak cross-import antar modul fitur).
 */

export type MoneyInput = Decimal | number | string;

export const ZERO: Decimal = new Decimal(0);

export function money(value: MoneyInput): Decimal {
  let d: Decimal;
  try {
    d = value instanceof Decimal ? value : new Decimal(value);
  } catch {
    // Nilai non-numerik (data korup) TIDAK boleh mematikan seluruh run payroll;
    // kembalikan Decimal NaN sebagai penanda — pemanggil yang bertanggung jawab
    // menyaring hasil (mis. bpjs/tax mengembalikan 0 untuk base <= 0).
    return new Decimal(Number.NaN);
  }
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function isPositive(value: MoneyInput): boolean {
  return money(value).gt(ZERO);
}

export function clampToZero(value: MoneyInput): Decimal {
  const d = money(value);
  return d.lt(ZERO) ? ZERO : d;
}
