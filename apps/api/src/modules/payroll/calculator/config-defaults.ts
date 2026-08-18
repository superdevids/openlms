import { Decimal } from "@prisma/client/runtime/library";
import { PayrollPeriodConfigRecord } from "../payroll.types";

/**
 * Nilai default konfigurasi pajak/BPJS PER PERIODE — SEED DEFAULT.
 *
 * prd04 §5.E.3: seluruh tarif/ceiling adalah nilai TERKONFIGURASI per periode,
 * BUKAN hardcode di logika. Nilai di bawah adalah contoh per 2026 (sumber:
 * riset-06 Topik 7 — PP 58/2023, PMK 168/2023, BPJamsostek) dan WAJIB
 * diverifikasi saat build (open items §13). Kalkulator (tax.ts, bpjs.ts)
 * TIDAK pernah memakai nilai ini langsung — hanya lewat PayrollPeriodConfig.
 */

function d(v: string | number): Decimal {
  return new Decimal(v);
}

/** Bracket TER bulanan kategori A (PTKP TK/0, TK/1, K/0 — PMK 168/2023). */
const TER_MONTHLY_A: Array<{ min: number; max: number | null; rate: number }> = [
  { min: 0, max: 5_400_000, rate: 0 },
  { min: 5_400_000, max: 5_650_000, rate: 0.25 },
  { min: 5_650_000, max: 5_950_000, rate: 0.5 },
  { min: 5_950_000, max: 6_300_000, rate: 0.75 },
  { min: 6_300_000, max: 6_750_000, rate: 1 },
  { min: 6_750_000, max: 7_500_000, rate: 1.25 },
  { min: 7_500_000, max: 8_550_000, rate: 1.5 },
  { min: 8_550_000, max: 9_650_000, rate: 1.75 },
  { min: 9_650_000, max: 10_050_000, rate: 2 },
  { min: 10_050_000, max: 10_350_000, rate: 2.25 },
  { min: 10_350_000, max: 10_700_000, rate: 2.5 },
  { min: 10_700_000, max: 11_050_000, rate: 3 },
  { min: 11_050_000, max: 11_650_000, rate: 3.5 },
  { min: 11_650_000, max: 12_500_000, rate: 4 },
  { min: 12_500_000, max: 13_250_000, rate: 5 },
  { min: 13_250_000, max: 13_700_000, rate: 6 },
  { min: 13_700_000, max: 14_075_000, rate: 7 },
  { min: 14_075_000, max: 14_575_000, rate: 8 },
  { min: 14_575_000, max: 15_050_000, rate: 9 },
  { min: 15_050_000, max: 15_575_000, rate: 10 },
  { min: 15_575_000, max: 16_350_000, rate: 11 },
  { min: 16_350_000, max: 17_050_000, rate: 12 },
  { min: 17_050_000, max: 17_575_000, rate: 13 },
  { min: 17_575_000, max: 18_075_000, rate: 14 },
  { min: 18_075_000, max: 18_575_000, rate: 15 },
  { min: 18_575_000, max: 19_075_000, rate: 16 },
  { min: 19_075_000, max: 19_575_000, rate: 17 },
  { min: 19_575_000, max: 20_075_000, rate: 18 },
  { min: 20_075_000, max: 20_575_000, rate: 19 },
  { min: 20_575_000, max: 21_075_000, rate: 20 },
  { min: 21_075_000, max: 21_575_000, rate: 21 },
  { min: 21_575_000, max: 22_075_000, rate: 22 },
  { min: 22_075_000, max: 22_575_000, rate: 23 },
  { min: 22_575_000, max: 23_075_000, rate: 24 },
  { min: 23_075_000, max: 23_575_000, rate: 25 },
  { min: 23_575_000, max: 24_075_000, rate: 26 },
  { min: 24_075_000, max: 24_575_000, rate: 27 },
  { min: 24_575_000, max: 25_075_000, rate: 28 },
  { min: 25_075_000, max: 25_575_000, rate: 29 },
  { min: 25_575_000, max: 26_075_000, rate: 30 },
  { min: 26_075_000, max: 26_575_000, rate: 31 },
  { min: 26_575_000, max: 27_075_000, rate: 32 },
  { min: 27_075_000, max: 27_575_000, rate: 33 },
  { min: 27_575_000, max: 28_075_000, rate: 34 },
  { min: 28_075_000, max: null, rate: 35 }
];

/** Bracket TER bulanan kategori B (PTKP TK/2, TK/3, K/1, K/2 — PMK 168/2023). */
const TER_MONTHLY_B: Array<{ min: number; max: number | null; rate: number }> = [
  { min: 0, max: 6_200_000, rate: 0 },
  { min: 6_200_000, max: 6_500_000, rate: 0.25 },
  { min: 6_500_000, max: 6_850_000, rate: 0.5 },
  { min: 6_850_000, max: 7_350_000, rate: 0.75 },
  { min: 7_350_000, max: 7_800_000, rate: 1 },
  { min: 7_800_000, max: 8_800_000, rate: 1.25 },
  { min: 8_800_000, max: 9_800_000, rate: 1.5 },
  { min: 9_800_000, max: 10_700_000, rate: 1.75 },
  { min: 10_700_000, max: 11_050_000, rate: 2 },
  { min: 11_050_000, max: 11_600_000, rate: 2.25 },
  { min: 11_600_000, max: 12_050_000, rate: 2.5 },
  { min: 12_050_000, max: 12_950_000, rate: 3 },
  { min: 12_950_000, max: 13_650_000, rate: 3.5 },
  { min: 13_650_000, max: 14_650_000, rate: 4 },
  { min: 14_650_000, max: 15_150_000, rate: 5 },
  { min: 15_150_000, max: 16_200_000, rate: 6 },
  { min: 16_200_000, max: 16_950_000, rate: 7 },
  { min: 16_950_000, max: 17_950_000, rate: 8 },
  { min: 17_950_000, max: 18_650_000, rate: 9 },
  { min: 18_650_000, max: 19_600_000, rate: 10 },
  { min: 19_600_000, max: 20_400_000, rate: 11 },
  { min: 20_400_000, max: 21_350_000, rate: 12 },
  { min: 21_350_000, max: 22_150_000, rate: 13 },
  { min: 22_150_000, max: 23_150_000, rate: 14 },
  { min: 23_150_000, max: 24_000_000, rate: 15 },
  { min: 24_000_000, max: 25_050_000, rate: 16 },
  { min: 25_050_000, max: 26_000_000, rate: 17 },
  { min: 26_000_000, max: 26_950_000, rate: 18 },
  { min: 26_950_000, max: 28_000_000, rate: 19 },
  { min: 28_000_000, max: 29_000_000, rate: 20 },
  { min: 29_000_000, max: 30_000_000, rate: 21 },
  { min: 30_000_000, max: 31_000_000, rate: 22 },
  { min: 31_000_000, max: 32_000_000, rate: 23 },
  { min: 32_000_000, max: 33_000_000, rate: 24 },
  { min: 33_000_000, max: 34_000_000, rate: 25 },
  { min: 34_000_000, max: 35_000_000, rate: 26 },
  { min: 35_000_000, max: 36_000_000, rate: 27 },
  { min: 36_000_000, max: 37_000_000, rate: 28 },
  { min: 37_000_000, max: 38_000_000, rate: 29 },
  { min: 38_000_000, max: 39_000_000, rate: 30 },
  { min: 39_000_000, max: 40_000_000, rate: 31 },
  { min: 40_000_000, max: 41_000_000, rate: 32 },
  { min: 41_000_000, max: 42_000_000, rate: 33 },
  { min: 42_000_000, max: 43_000_000, rate: 34 },
  { min: 43_000_000, max: null, rate: 35 }
];

/** Bracket TER bulanan kategori C (PTKP K/3 — PMK 168/2023). */
const TER_MONTHLY_C: Array<{ min: number; max: number | null; rate: number }> = [
  { min: 0, max: 6_600_000, rate: 0 },
  { min: 6_600_000, max: 6_950_000, rate: 0.25 },
  { min: 6_950_000, max: 7_350_000, rate: 0.5 },
  { min: 7_350_000, max: 7_800_000, rate: 0.75 },
  { min: 7_800_000, max: 8_850_000, rate: 1 },
  { min: 8_850_000, max: 9_800_000, rate: 1.25 },
  { min: 9_800_000, max: 10_950_000, rate: 1.5 },
  { min: 10_950_000, max: 12_000_000, rate: 1.75 },
  { min: 12_000_000, max: 12_650_000, rate: 2 },
  { min: 12_650_000, max: 13_600_000, rate: 2.25 },
  { min: 13_600_000, max: 14_450_000, rate: 2.5 },
  { min: 14_450_000, max: 15_350_000, rate: 3 },
  { min: 15_350_000, max: 16_350_000, rate: 3.5 },
  { min: 16_350_000, max: 17_450_000, rate: 4 },
  { min: 17_450_000, max: 18_250_000, rate: 5 },
  { min: 18_250_000, max: 19_350_000, rate: 6 },
  { min: 19_350_000, max: 20_350_000, rate: 7 },
  { min: 20_350_000, max: 21_350_000, rate: 8 },
  { min: 21_350_000, max: 22_450_000, rate: 9 },
  { min: 22_450_000, max: 23_450_000, rate: 10 },
  { min: 23_450_000, max: 24_450_000, rate: 11 },
  { min: 24_450_000, max: 25_550_000, rate: 12 },
  { min: 25_550_000, max: 26_550_000, rate: 13 },
  { min: 26_550_000, max: 27_650_000, rate: 14 },
  { min: 27_650_000, max: 28_850_000, rate: 15 },
  { min: 28_850_000, max: 29_950_000, rate: 16 },
  { min: 29_950_000, max: 31_050_000, rate: 17 },
  { min: 31_050_000, max: 32_250_000, rate: 18 },
  { min: 32_250_000, max: 33_250_000, rate: 19 },
  { min: 33_250_000, max: 34_250_000, rate: 20 },
  { min: 34_250_000, max: 35_350_000, rate: 21 },
  { min: 35_350_000, max: 36_450_000, rate: 22 },
  { min: 36_450_000, max: 37_450_000, rate: 23 },
  { min: 37_450_000, max: 38_450_000, rate: 24 },
  { min: 38_450_000, max: 39_450_000, rate: 25 },
  { min: 39_450_000, max: 40_450_000, rate: 26 },
  { min: 40_450_000, max: 41_450_000, rate: 27 },
  { min: 41_450_000, max: 42_450_000, rate: 28 },
  { min: 42_450_000, max: 43_450_000, rate: 29 },
  { min: 43_450_000, max: 44_450_000, rate: 30 },
  { min: 44_450_000, max: 45_450_000, rate: 31 },
  { min: 45_450_000, max: 46_450_000, rate: 32 },
  { min: 46_450_000, max: 47_450_000, rate: 33 },
  { min: 47_450_000, max: 48_450_000, rate: 34 },
  { min: 48_450_000, max: null, rate: 35 }
];

/** Bracket TER harian (PP 58/2023). */
const TER_DAILY: Array<{ min: number; max: number | null; rate: number }> = [
  { min: 0, max: 450_000, rate: 0 },
  { min: 450_000, max: 2_500_000, rate: 0.5 },
  { min: 2_500_000, max: null, rate: 1 } // di atas 2,5jt: tarif Pasal 17 x 50% (dihitung terpisah)
];

function toBrackets(
  rows: Array<{ min: number; max: number | null; rate: number }>
): Array<{ minGross: Decimal; maxGross: Decimal | null; ratePercent: Decimal }> {
  return rows.map((r) => ({
    minGross: d(r.min),
    maxGross: r.max === null ? null : d(r.max),
    ratePercent: d(r.rate)
  }));
}

function toDailyBrackets(
  rows: Array<{ min: number; max: number | null; rate: number }>
): Array<{ minDaily: Decimal; maxDaily: Decimal | null; ratePercent: Decimal }> {
  return rows.map((r) => ({
    minDaily: d(r.min),
    maxDaily: r.max === null ? null : d(r.max),
    ratePercent: d(r.rate)
  }));
}

/**
 * Konfigurasi default periode "2026-01" (contoh) — seeding awal.
 * Integration coder memindahkan ke tabel konfigurasi (PayrollPeriodConfig) +
 * seed Prisma; admin bisa ubah per periode.
 */
export function createDefaultPayrollPeriodConfig(period: string): PayrollPeriodConfigRecord {
  const now = new Date();
  return {
    id: `default-${period}`,
    period,
    umr: d("2500000"),
    terMonthly: {
      A: toBrackets(TER_MONTHLY_A),
      B: toBrackets(TER_MONTHLY_B),
      C: toBrackets(TER_MONTHLY_C)
    },
    terDaily: toDailyBrackets(TER_DAILY),
    honorDppPercent: d("50"),
    pnsFinalRatePercent: d("15"),
    bpjsKesehatan: { employeeSharePercent: d("1"), ceiling: d("12000000") },
    bpjsJht: { employeeSharePercent: d("2"), ceiling: null },
    bpjsJp: { employeeSharePercent: d("1"), ceiling: d("10547000") },
    pasal17RatePercent: d("5"),
    createdAt: now,
    updatedAt: now
  };
}

export { d as decimalOf };
