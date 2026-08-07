import { Inject, Injectable } from "@nestjs/common";
import { prisma } from "@openlms/database";
import { Decimal } from "@prisma/client/runtime/library";
import { money, ZERO } from "../calculator/money";
import { FinanceStore } from "../finance.store";
import { CashFlowRecord } from "../finance.types";
import { FINANCE_STORE } from "../finance.constants";

/**
 * CashFlowService — arus kas (prd04 §5.F.6, keputusan A3-8).
 * Kas masuk = pembayaran terverifikasi (Payment PAID) + catatan manual IN.
 * Kas keluar = refund + pengeluaran manual OUT.
 * Outstanding = total tagihan belum lunas (dari Invoice).
 */

export interface CashFlowSummary {
  period: string;
  inflow: Decimal;
  outflow: Decimal;
  net: Decimal;
  outstanding: Decimal;
  details: {
    inflowRecords: Array<{
      date: Date;
      amount: Decimal;
      category: string;
      reference: string | null;
    }>;
    outflowRecords: Array<{
      date: Date;
      amount: Decimal;
      category: string;
      reference: string | null;
    }>;
  };
}

@Injectable()
export class CashFlowService {
  constructor(@Inject(FINANCE_STORE) private readonly store: FinanceStore) {}

  /**
   * Ringkasan arus kas per periode "YYYY-MM".
   * Kas masuk dihitung dari Payment status PAID (paid_at dalam periode)
   * ditambah cash flow record IN manual; kas keluar dari record OUT.
   */
  async summary(period: string): Promise<CashFlowSummary> {
    const [year, month] = period.split("-").map(Number);
    const from = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1));
    const to = new Date(Date.UTC(year ?? 1970, month ?? 1, 0, 23, 59, 59));

    const payments = await prisma.payment.findMany({
      where: { status: "PAID", paid_at: { gte: from, lte: to } },
      select: { amount: true, paid_at: true, invoice: { select: { invoice_no: true } } }
    });
    const inflowFromPayments = payments.reduce((sum, p) => sum.plus(p.amount), ZERO);

    const records = await this.store.listCashFlowRecords(from, to);
    const manualInflow = records
      .filter((r) => r.direction === "IN")
      .reduce((sum, r) => sum.plus(r.amount), ZERO);
    const outflow = records
      .filter((r) => r.direction === "OUT")
      .reduce((sum, r) => sum.plus(r.amount), ZERO);

    const inflow = inflowFromPayments.plus(manualInflow);
    const outstanding = await this.totalOutstanding(period);

    const inflowRecords = [
      ...payments.map((p) => ({
        date: p.paid_at ?? new Date(),
        amount: p.amount,
        category: "PAYMENT_VERIFIED" as const,
        reference: p.invoice.invoice_no
      })),
      ...records
        .filter((r) => r.direction === "IN")
        .map((r) => ({
          date: r.date,
          amount: r.amount,
          category: r.category,
          reference: r.referenceId
        }))
    ];
    const outflowRecords = records
      .filter((r) => r.direction === "OUT")
      .map((r) => ({
        date: r.date,
        amount: r.amount,
        category: r.category,
        reference: r.referenceId
      }));

    return {
      period,
      inflow: inflow.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      outflow: outflow.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      net: inflow.minus(outflow).toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      outstanding: outstanding.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      details: { inflowRecords, outflowRecords }
    };
  }

  /** Total outstanding seluruh invoice pada periode (tagihan belum lunas). */
  async totalOutstanding(period: string): Promise<Decimal> {
    const invoices = await prisma.invoice.findMany({
      where: { period, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      include: { payments: true }
    });
    let total = ZERO;
    for (const inv of invoices) {
      const paid = inv.payments
        .filter((p) => p.status === "PAID")
        .reduce((s, p) => s.plus(p.amount), ZERO);
      const net = money(inv.amount).minus(money(inv.discount));
      const outstanding = net.minus(paid);
      if (outstanding.gt(ZERO)) {
        total = total.plus(outstanding);
      }
    }
    return total;
  }

  /** Catat arus kas manual (pengeluaran/kas masuk non-payment). */
  async record(input: {
    date: Date;
    direction: "IN" | "OUT";
    amount: Decimal | number | string;
    category: CashFlowRecord["category"];
    referenceId?: string;
    note?: string;
    createdBy: string;
  }): Promise<CashFlowRecord> {
    return this.store.createCashFlowRecord({
      date: input.date,
      direction: input.direction,
      amount: money(input.amount),
      category: input.category,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      createdBy: input.createdBy
    });
  }
}
