import { Decimal } from "@prisma/client/runtime/library";

/**
 * Helper uang — semua nilai moneter memakai Prisma.Decimal (12,2).
 * Konvensi: input bisa Decimal | number | string; output selalu Decimal
 * dibulatkan HALF_UP 2 desimal (gelombang 2: prd04 §5.F "GUNAKAN Decimal").
 */

export type MoneyInput = Decimal | number | string;

export const ZERO: Decimal = new Decimal(0);

/** Normalisasi ke Decimal 2 desimal. */
export function money(value: MoneyInput): Decimal {
  const d = value instanceof Decimal ? value : new Decimal(value);
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Boolean aman: nilai > 0. */
export function isPositive(value: MoneyInput): boolean {
  return money(value).gt(ZERO);
}

/** max(0, value) — outstanding tidak boleh negatif. */
export function clampToZero(value: MoneyInput): Decimal {
  const d = money(value);
  return d.lt(ZERO) ? ZERO : d;
}

/** Perkalian dengan pembulatan HALF_UP 2 desimal. */
export function mul(a: MoneyInput, b: MoneyInput): Decimal {
  return money(money(a).times(money(b)));
}

/** Pembagian aman (pembagi 0 -> 0). */
export function div(a: MoneyInput, b: MoneyInput): Decimal {
  const divisor = money(b);
  if (divisor.isZero()) {
    return ZERO;
  }
  return money(money(a).dividedBy(divisor));
}

/** Pengurangan, boleh negatif (dipakai calon alokasi). */
export function sub(a: MoneyInput, b: MoneyInput): Decimal {
  return money(money(a).minus(money(b)));
}

/** Penjumlahan. */
export function add(a: MoneyInput, b: MoneyInput): Decimal {
  return money(money(a).plus(money(b)));
}
