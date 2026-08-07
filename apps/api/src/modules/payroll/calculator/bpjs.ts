import { Decimal } from "@prisma/client/runtime/library";
import { money, MoneyInput, ZERO } from "./money";

/**
 * Kalkulator BPJS (prd04 §5.E.3) — MODUL TERISOLASI & TERUJI.
 * Nilai tarif/ceiling datang dari PayrollPeriodConfig, BUKAN hardcode.
 *
 * - BPJS Kesehatan PPU: 5% (4% perusahaan + 1% pekerja); ceiling upah;
 *   dasar = gaji pokok + tunjangan tetap (lembur/tunjangan tidak tetap TIDAK
 *   termasuk). Di sini hanya potongan PEGAWAI.
 * - BPJS JHT: pekerja 2%.
 * - BPJS JP: pekerja 1%, ceiling.
 */

export interface BpjsContributionConfig {
  employeeSharePercent: MoneyInput;
  ceiling: MoneyInput | null;
}

export interface BpjsInput {
  /** dasar perhitungan (gaji pokok + tunjangan tetap) */
  base: MoneyInput;
  config: BpjsContributionConfig;
}

/** Potongan BPJS pekerja = min(base, ceiling) x tarif (persen). */
export function computeBpjsContribution(input: BpjsInput): Decimal {
  const base = money(input.base);
  if (base.lte(ZERO)) {
    return ZERO;
  }
  const ceiling = input.config.ceiling == null ? null : money(input.config.ceiling);
  const cappedBase = ceiling !== null && base.gt(ceiling) ? ceiling : base;
  return cappedBase
    .times(money(input.config.employeeSharePercent))
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Helper: hitung sekaligus Kesehatan + JHT + JP (masing-masing config). */
export function computeBpjsBundle(
  base: MoneyInput,
  config: {
    kesehatan: BpjsContributionConfig;
    jht: BpjsContributionConfig;
    jp: BpjsContributionConfig;
  }
): { kesehatan: Decimal; jht: Decimal; jp: Decimal; total: Decimal } {
  const kesehatan = computeBpjsContribution({ base, config: config.kesehatan });
  const jht = computeBpjsContribution({ base, config: config.jht });
  const jp = computeBpjsContribution({ base, config: config.jp });
  return {
    kesehatan,
    jht,
    jp,
    total: kesehatan.plus(jht).plus(jp).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  };
}
