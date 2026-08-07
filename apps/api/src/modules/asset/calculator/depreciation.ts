import { Decimal } from "@prisma/client/runtime/library";

/**
 * Depresiasi garis lurus (prd04 §5.G.2, PSAK 16).
 * MURNI — dihitung SAAT LAPORAN (tidak disimpan per bulan; bebas drift).
 *   nilai_buku = harga_perolehan − (harga_perolehan / masa_manfaat_bulan × bulan_berjalan)
 * Nilai sisa (residu) default 0 (konfigurasi per kategori).
 */

export type MoneyInput = Decimal | number | string;

function toDecimal(value: MoneyInput): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export interface DepreciationInput {
  /** harga perolehan */
  cost: MoneyInput;
  /** umur manfaat dalam bulan (masa_manfaat_bulan) */
  usefulLifeMonths: number;
  /** bulan berjalan sejak perolehan (0 = bulan perolehan) */
  monthsElapsed: number;
  /** nilai sisa (residu), default 0 */
  residualValue?: MoneyInput;
}

export interface DepreciationResult {
  /** penyusutan per bulan */
  monthlyDepreciation: Decimal;
  /** akumulasi penyusutan sampai bulan berjalan */
  accumulatedDepreciation: Decimal;
  /** nilai buku = max(residu, harga − akumulasi) */
  bookValue: Decimal;
  /** true bila aset sudah habis disusutkan (nilai buku = residu) */
  fullyDepreciated: boolean;
}

export function calculateDepreciation(input: DepreciationInput): DepreciationResult {
  const cost = toDecimal(input.cost);
  const residual = toDecimal(input.residualValue ?? 0);
  const life = Math.max(1, Math.floor(input.usefulLifeMonths));

  const depreciableBase = cost.minus(residual);
  const monthly = depreciableBase.gt(0)
    ? depreciableBase.dividedBy(life).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    : new Decimal(0);

  const months = Math.max(0, Math.floor(input.monthsElapsed));
  const accumulated = monthly.times(months).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  let bookValue = cost.minus(accumulated);
  if (bookValue.lt(residual)) {
    bookValue = residual;
  }
  bookValue = bookValue.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    monthlyDepreciation: monthly,
    accumulatedDepreciation: accumulated,
    bookValue,
    fullyDepreciated: bookValue.lte(residual)
  };
}

/** Bulan berjalan sejak tanggal perolehan (per akhir periode laporan). */
export function monthsSince(acquisitionDate: Date, asOf: Date): number {
  const yDiff = asOf.getFullYear() - acquisitionDate.getFullYear();
  const mDiff = asOf.getMonth() - acquisitionDate.getMonth();
  return Math.max(0, yDiff * 12 + mDiff);
}

/** Umur manfaat default per kategori (nilai konfigurasi; contoh prd04 §5.G.2). */
export const DEFAULT_USEFUL_LIFE_MONTHS: Record<string, number> = {
  RUANG: 480, // gedung 40 tahun
  LAB: 60, // alat lab 5 tahun
  ALAT: 48, // elektronik/meubelair 4 tahun
  KENDARAAN: 96, // kendaraan 8 tahun
  PERALATAN_IT: 36, // komputer 3 tahun
  LAINNYA: 36
};
