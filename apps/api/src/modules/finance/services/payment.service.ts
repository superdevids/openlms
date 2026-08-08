import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Payment, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@opensis/database";
import { Decimal } from "@prisma/client/runtime/library";
import { computeInvoiceTotals } from "../calculator/invoice-status";
import { allocatePayment } from "../calculator/payment-allocation";
import { money, ZERO } from "../calculator/money";
import { FinanceStore } from "../finance.store";
import { FINANCE_STORE } from "../finance.constants";
import { NotificationService } from "../../notifications/notifications.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { INVOICE_PAID_EVENT } from "../../notifications/notification-events";

/**
 * PaymentService — pembayaran parsial/cicilan + alokasi (prd04 §5.F.2).
 * - Payment per transaksi; banyak Payment per invoice = cicilan.
 * - status invoice dihitung ulang setelah pembayaran (PENDING/PARTIAL/PAID/OVERDUE).
 * - verifikasi manual oleh KEUANGAN (payment:verify:school); hanya status PAID
 *   yang dihitung ke outstanding.
 * - idempotensi via Idempotency-Key (header) di controller.
 */

export interface RecordPaymentInput {
  invoiceId: string;
  amount: Decimal | number | string;
  method: "TUNAI" | "TRANSFER" | "LAINNYA";
  proofUrl?: string;
  note?: string;
  createdBy: string;
}

@Injectable()
export class PaymentService {
  constructor(
    @Inject(FINANCE_STORE) private readonly store: FinanceStore,
    private readonly notifications: NotificationService,
    private readonly realtime: RealtimeGateway
  ) {}

  /** Catat pembayaran (status PENDING sampai diverifikasi KEUANGAN). */
  async record(input: RecordPaymentInput): Promise<Payment> {
    const amount = money(input.amount);
    if (amount.lte(ZERO)) {
      throw new BadRequestException("amount harus lebih besar dari 0");
    }
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { payments: true }
    });
    if (!invoice) {
      throw new NotFoundException("Tagihan tidak ditemukan");
    }
    if (invoice.status === "CANCELLED" || invoice.status === "REFUNDED") {
      throw new BadRequestException(`Tagihan berstatus ${invoice.status} tidak bisa dibayar`);
    }

    return prisma.payment.create({
      data: {
        invoice_id: input.invoiceId,
        amount,
        method: input.method,
        proof_url: input.proofUrl ?? null,
        note: input.note ?? null,
        status: "PENDING"
      }
    });
  }

  /**
   * Alokasi satu pembayaran ke BANYAK invoice (bayar muka gabungan / cicilan).
   * Pembuatan Payment + update status invoice dalam satu transaksi.
   */
  async recordAllocated(input: {
    invoiceIds: string[];
    amount: Decimal | number | string;
    method: "TUNAI" | "TRANSFER" | "LAINNYA";
    proofUrl?: string;
    note?: string;
    createdBy: string;
  }): Promise<{ payment: Payment; allocations: Array<{ invoiceId: string; allocated: Decimal }> }> {
    const amount = money(input.amount);
    if (amount.lte(ZERO)) {
      throw new BadRequestException("amount harus lebih besar dari 0");
    }
    const primary = input.invoiceIds[0];
    if (!primary) {
      throw new BadRequestException("invoiceIds wajib diisi minimal 1");
    }
    const primaryInvoiceId = primary;
    // Batch lookup SEMUA invoice target dalam SATU query (sebelumnya
    // invoiceService.findById per invoice = N+1), lalu map di memori.
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: input.invoiceIds } },
      include: { payments: true }
    });
    const byId = new Map(invoices.map((inv) => [inv.id, inv]));
    const targets: Array<{ invoiceId: string; outstanding: Decimal }> = [];
    for (const invoiceId of input.invoiceIds) {
      const inv = byId.get(invoiceId);
      if (!inv) {
        throw new NotFoundException(`Tagihan ${invoiceId} tidak ditemukan`);
      }
      const paidSum = this.paidSumOf(inv);
      const totals = computeInvoiceTotals({
        amount: inv.amount,
        discount: inv.discount,
        paidSum,
        dueDate: inv.due_date,
        now: new Date()
      });
      targets.push({ invoiceId, outstanding: totals.outstanding });
    }

    const result = allocatePayment(amount, targets);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoice_id: primaryInvoiceId,
          amount,
          method: input.method,
          proof_url: input.proofUrl ?? null,
          note: input.note ?? null,
          status: "PENDING"
        }
      });
      // Simpan catatan alokasi di note (alokasi penuh disimpan saat verifikasi).
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          note: input.note
            ? `${input.note} | alokasi: ${result.allocations.map((a) => `${a.invoiceId}=${a.allocated}`).join(",")}`
            : `alokasi: ${result.allocations.map((a) => `${a.invoiceId}=${a.allocated}`).join(",")}`
        }
      });
      return { payment, allocations: result.allocations };
    });
  }

  /** Verifikasi pembayaran oleh KEUANGAN (payment:verify:school). */
  async verify(
    paymentId: string,
    approved: boolean,
    verifiedBy: string,
    note?: string
  ): Promise<Payment> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true }
    });
    if (!payment) {
      throw new NotFoundException("Pembayaran tidak ditemukan");
    }
    if (payment.status !== "PENDING") {
      throw new BadRequestException(`Pembayaran sudah ${payment.status}`);
    }

    const nextStatus: PaymentStatus = approved ? "PAID" : "CANCELLED";
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: nextStatus,
          verified_by: verifiedBy,
          verified_at: approved ? new Date() : null,
          note: note ?? payment.note
        }
      });
      await tx.auditLog.create({
        data: {
          actor_id: verifiedBy,
          action: approved ? "UPDATE" : "DELETE",
          entity: "Payment",
          entity_id: paymentId,
          before: { status: "PENDING" },
          after: { status: nextStatus, note: note ?? null }
        }
      });
      return p;
    });

    // Hitung ulang status invoice induk setelah verifikasi.
    await this.recomputeInvoiceStatus(payment.invoice_id);
    if (approved) {
      await this.notifyInvoicePaid(updated, payment.invoice);
    }
    return updated;
  }

  /**
   * Notifikasi + event realtime ke siswa saat pembayaran terverifikasi (PAID):
   * NotificationService → inbox (notification:new + payment:confirmed) dan
   * event eksplisit invoice:paid (payload ringkas). Best-effort.
   */
  private async notifyInvoicePaid(
    payment: Payment,
    invoice: { id: string; invoice_no: string; student_id: string }
  ): Promise<void> {
    try {
      await this.notifications.createForUser({
        userId: invoice.student_id,
        type: "PAYMENT_CONFIRMED",
        title: "Pembayaran terverifikasi",
        body: `Tagihan ${invoice.invoice_no} telah lunas`,
        data: {
          invoiceId: invoice.id,
          invoiceNo: invoice.invoice_no,
          amount: payment.amount.toFixed(2),
          status: "PAID"
        }
      });
      this.realtime.emitToUser(invoice.student_id, INVOICE_PAID_EVENT, {
        invoiceId: invoice.id,
        invoiceNo: invoice.invoice_no,
        amount: payment.amount.toFixed(2),
        status: "PAID"
      });
    } catch {
      // best-effort
    }
  }

  /** Jumlah pembayaran terverifikasi sebuah invoice (PAID). */
  paidSumOf(invoice: { payments: Array<{ status: PaymentStatus; amount: Decimal }> }): Decimal {
    return invoice.payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum.plus(p.amount), ZERO);
  }

  /** Hitung ulang status invoice dari total pembayaran PAID (Prisma tx aman). */
  async recomputeInvoiceStatus(invoiceId: string): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });
    if (!invoice) {
      return;
    }
    const totals = computeInvoiceTotals({
      amount: invoice.amount,
      discount: invoice.discount,
      paidSum: this.paidSumOf(invoice),
      dueDate: invoice.due_date,
      now: new Date()
    });
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: totals.status }
    });
  }

  /** Lunas-kan status semua invoice overdue (job harian / pemicu). */
  async refreshOverdueStatuses(now = new Date()): Promise<number> {
    const overdue = await prisma.invoice.findMany({
      where: { status: { in: ["PENDING", "PARTIAL"] }, due_date: { lt: now } },
      include: { payments: true }
    });
    for (const inv of overdue) {
      const totals = computeInvoiceTotals({
        amount: inv.amount,
        discount: inv.discount,
        paidSum: this.paidSumOf(inv),
        dueDate: inv.due_date,
        now
      });
      if (totals.status === "OVERDUE") {
        await prisma.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" } });
      }
    }
    return overdue.length;
  }

  /** Riwayat pembayaran sebuah invoice. */
  async history(invoiceId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { invoice_id: invoiceId },
      orderBy: { created_at: "asc" }
    });
  }
}

/** Re-export untuk kompatibilitas pemakaian alokasi di controller. */
export type { Prisma };
