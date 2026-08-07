import { Decimal } from "@prisma/client/runtime/library";
import { clampToZero, MoneyInput, money, sub } from "./money";

/**
 * Perhitungan status & total tagihan (prd04 §5.F.2).
 * Murni (pure) — tanpa I/O; dipakai InvoiceService & PaymentService.
 */

export type ComputedInvoiceStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CARRIED_OVER";

export interface InvoiceTotalsInput {
  amount: MoneyInput;
  discount: MoneyInput;
  /** total pembayaran terverifikasi terhadap tagihan ini */
  paidSum: MoneyInput;
  dueDate: Date;
  now: Date;
  /** flag carry-over (tagihan lama dipindah ke tahun ajaran baru) */
  carriedOver?: boolean;
}

export interface InvoiceTotals {
  netAmount: Decimal;
  paidAmount: Decimal;
  /** netAmount - paidAmount, dibatasi >= 0 */
  outstanding: Decimal;
  status: ComputedInvoiceStatus;
}

/** Total bersih tagihan = amount - discount (>= 0). */
export function computeNetAmount(amount: MoneyInput, discount: MoneyInput): Decimal {
  return clampToZero(sub(amount, discount));
}

/**
 * Status tagihan:
 * - CARRIED_OVER bila tagihan dicarry (dipindah ke tahun ajaran berikutnya).
 * - PAID bila total bayar >= net; net 0 juga dianggap PAID.
 * - PARTIAL bila sebagian sudah dibayar (belum jatuh tempo / lewat sudah ditandai OVERDUE).
 * - OVERDUE bila outstanding > 0 dan lewat due_date.
 * - PENDING bila outstanding > 0 dan belum lewat jatuh tempo.
 */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const netAmount = computeNetAmount(input.amount, input.discount);
  const paidAmount = money(input.paidSum);
  const outstanding = clampToZero(sub(netAmount, paidAmount));

  let status: ComputedInvoiceStatus;
  if (input.carriedOver === true) {
    status = "CARRIED_OVER";
  } else if (outstanding.isZero()) {
    status = "PAID";
  } else if (paidAmount.gt(0)) {
    status = input.now > input.dueDate ? "OVERDUE" : "PARTIAL";
  } else {
    status = input.now > input.dueDate ? "OVERDUE" : "PENDING";
  }

  return { netAmount, paidAmount, outstanding, status };
}

/** Alias status DB: map ke nilai PaymentStatus schema (tanpa enum baru). */
export function toPaymentStatusValue(status: ComputedInvoiceStatus): string {
  return status;
}
