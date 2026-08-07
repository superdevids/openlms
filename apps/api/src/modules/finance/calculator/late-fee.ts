import { Decimal } from "@prisma/client/runtime/library";
import { MoneyInput, money, mul, ZERO } from "./money";

/**
 * Denda keterlambatan (prd04 §5.F.3, LateFeeRule).
 * Murni: menghitung nominal denda dari aturan + jumlah hari lewat jatuh tempo.
 *
 * - NOMINAL: denda tetap per invoice (rule.value).
 * - PERSEN_PER_HARI: persen per hari dari sisa tagihan (outstanding).
 * - maxAmount (opsional): batas atas denda.
 * - grace period: hari pertama denda dihitung setelah lewat graceDays.
 */

export type LateFeeRuleType = "NOMINAL" | "PERSEN_PER_HARI";

export interface LateFeeRuleCalcInput {
  graceDays: number;
  feeType: LateFeeRuleType;
  /** untuk NOMINAL = nilai rupiah; untuk PERSEN_PER_HARI = persen (mis. 0.5 = 0,5% per hari) */
  value: MoneyInput;
  maxAmount: MoneyInput | null;
}

export interface LateFeeResult {
  /** denda final (sudah cap), 0 bila masih dalam grace period */
  amount: Decimal;
  /** jumlah hari keterlambatan efektif setelah grace period */
  chargeableDays: number;
  capped: boolean;
}

/** Jumlah hari keterlambatan (kalender) yang dikenakan denda. */
export function chargeableDays(daysLate: number, graceDays: number): number {
  if (!Number.isFinite(daysLate) || daysLate <= 0) {
    return 0;
  }
  return Math.max(0, Math.floor(daysLate) - Math.max(0, Math.floor(graceDays)));
}

export function computeLateFee(
  rule: LateFeeRuleCalcInput,
  overdueAmount: MoneyInput,
  daysLate: number
): LateFeeResult {
  const charge = chargeableDays(daysLate, rule.graceDays);
  if (charge <= 0) {
    return { amount: ZERO, chargeableDays: 0, capped: false };
  }

  let amount: Decimal;
  if (rule.feeType === "NOMINAL") {
    amount = money(rule.value);
  } else {
    // persen per hari dari outstanding: outstanding * (rate/100) * days
    amount = mul(money(overdueAmount), mul(mul(rule.value, 1), charge)).dividedBy(100);
  }
  amount = amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  let capped = false;
  if (rule.maxAmount !== null && rule.maxAmount !== undefined) {
    const max = money(rule.maxAmount);
    if (amount.gt(max)) {
      amount = max;
      capped = true;
    }
  }
  if (amount.lt(ZERO)) {
    amount = ZERO;
  }
  return { amount, chargeableDays: charge, capped };
}
