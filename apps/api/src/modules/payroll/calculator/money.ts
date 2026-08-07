import { Decimal } from "@prisma/client/runtime/library";

/**
 * Helper uang Payroll — semua nilai moneter memakai Prisma.Decimal (12,2).
 * Duplikasi kecil dari finance/calculator/money.ts agar modul payroll
 * independen (tidak cross-import antar modul fitur).
 */

export type MoneyInput = Decimal | number | string;

export const ZERO: Decimal = new Decimal(0);

export function money(value: MoneyInput): Decimal {
  const d = value instanceof Decimal ? value : new Decimal(value);
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function isPositive(value: MoneyInput): boolean {
  return money(value).gt(ZERO);
}

export function clampToZero(value: MoneyInput): Decimal {
  const d = money(value);
  return d.lt(ZERO) ? ZERO : d;
}
