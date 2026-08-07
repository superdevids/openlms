import { Decimal } from "@prisma/client/runtime/library";
import { add, MoneyInput, money, mul, ZERO } from "./money";

/**
 * Alokasi pembayaran parsial/cicilan (prd04 §5.F.2).
 *
 * Satu transaksi pembayaran bisa dialokasikan ke SATU invoice (parsial/cicilan
 * = banyak Payment per invoice) atau ke BANYAK invoice (bayar muka gabungan).
 * Fungsi murni: urutkan target sesuai pemanggil, isi berurutan.
 */

export interface AllocationTarget {
  invoiceId: string;
  /** sisa tagihan (outstanding) sebelum alokasi */
  outstanding: MoneyInput;
}

export interface AllocationLine {
  invoiceId: string;
  allocated: Decimal;
}

export interface AllocationResult {
  allocations: AllocationLine[];
  /** sisa uang setelah semua target terisi penuh */
  remaining: Decimal;
  totalAllocated: Decimal;
}

/**
 * Distribusi `amount` ke target secara berurutan (FIFO) sampai habis.
 * - amount lebih kecil dari outstanding pertama -> parsial ke invoice pertama.
 * - amount lebih besar dari total outstanding -> semua lunas, sisa dikembalikan
 *   (dipakai untuk deteksi "kelebihan bayar" -> calon Refund).
 */
export function allocatePayment(amount: MoneyInput, targets: AllocationTarget[]): AllocationResult {
  let rest = money(amount);
  const allocations: AllocationLine[] = [];

  for (const target of targets) {
    if (rest.isZero()) {
      break;
    }
    const outstanding = money(target.outstanding);
    if (outstanding.lte(ZERO)) {
      allocations.push({ invoiceId: target.invoiceId, allocated: ZERO });
      continue;
    }
    const allocated = rest.lt(outstanding) ? rest : outstanding;
    allocations.push({ invoiceId: target.invoiceId, allocated });
    rest = rest.minus(allocated).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  const totalAllocated = allocations.reduce((sum, line) => sum.plus(line.allocated), ZERO);
  return {
    allocations,
    remaining: rest,
    totalAllocated: totalAllocated.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  };
}

/** Total outstanding semua tagihan (untuk validasi sebelum alokasi). */
export function totalOutstanding(targets: AllocationTarget[]): Decimal {
  return targets
    .reduce((sum, t) => add(sum, t.outstanding), ZERO)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Helper ringkas: jumlah yang bisa dibayar penuh pada alokasi. */
export function isOverpayment(amount: MoneyInput, targets: AllocationTarget[]): boolean {
  return money(amount).gt(totalOutstanding(targets));
}

/** Multiply helper re-export agar pemakai hanya import satu modul. */
export { mul };
