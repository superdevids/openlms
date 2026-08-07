import { Decimal } from "@prisma/client/runtime/library";
import { TerDailyBracket, TerMonthlyBracket } from "../payroll.types";
import { money, MoneyInput, ZERO } from "./money";

/**
 * Kalkulator PPh 21 skema TER (prd04 §5.E.3) — MODUL TERISOLASI & TERUJI.
 * Nilai tarif/ceiling datang dari PayrollPeriodConfig (terkonfigurasi per
 * periode), BUKAN hardcode. Di sini hanya logika murni.
 *
 * - TER bulanan: cari bracket berdasarkan penghasilan bruto (gross) bulanan,
 *   PPh = gross x tarif (persen).
 * - TER harian: daily gross <= Rp450.000 -> 0; <= Rp2.500.000 -> 0,5%;
 *   > Rp2.500.000 -> tarif Pasal 17 x 50% (DPP 50%).
 * - Honorarium bukan pegawai: DPP persen (default 50%) x tarif Pasal 17.
 * - PNS: final 15%.
 */

export interface TaxInput {
  gross: MoneyInput;
  brackets: TerMonthlyBracket[];
}

export function computePph21TerMonthly(input: TaxInput): Decimal {
  const gross = money(input.gross);
  if (gross.lte(ZERO)) {
    return ZERO;
  }
  const bracket = input.brackets.find(
    (b) => gross.gte(b.minGross) && (b.maxGross === null || gross.lt(b.maxGross))
  );
  const rate = bracket?.ratePercent ?? ZERO;
  return gross.times(rate).dividedBy(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export interface TerDailyInput {
  dailyGross: MoneyInput;
  brackets: TerDailyBracket[];
  /** tarif Pasal 17 (persen) untuk penghasilan di atas bracket tertinggi */
  pasal17RatePercent: MoneyInput;
}

export function computePph21TerDaily(input: TerDailyInput): Decimal {
  const daily = money(input.dailyGross);
  if (daily.lte(ZERO)) {
    return ZERO;
  }
  const bracket = input.brackets.find(
    (b) => daily.gte(b.minDaily) && (b.maxDaily === null || daily.lt(b.maxDaily))
  );
  if (bracket && bracket.maxDaily !== null) {
    return daily
      .times(bracket.ratePercent)
      .dividedBy(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }
  // di atas bracket tertinggi (biasanya > 2,5jt/hari): DPP 50% x Pasal 17
  const dpp = daily.times("0.5");
  return dpp
    .times(money(input.pasal17RatePercent))
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export interface HonorariumInput {
  gross: MoneyInput;
  dppPercent: MoneyInput;
  pasal17RatePercent: MoneyInput;
}

/** Honorarium bukan pegawai: DPP (50%) x tarif Pasal 17. */
export function computePph21Honorarium(input: HonorariumInput): Decimal {
  const gross = money(input.gross);
  if (gross.lte(ZERO)) {
    return ZERO;
  }
  const dpp = gross.times(money(input.dppPercent)).dividedBy(100);
  return dpp
    .times(money(input.pasal17RatePercent))
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** PNS: penghasilan bruto x tarif final 15%. */
export function computePph21PnsFinal(gross: MoneyInput, finalRatePercent: MoneyInput): Decimal {
  return money(gross)
    .times(money(finalRatePercent))
    .dividedBy(100)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
