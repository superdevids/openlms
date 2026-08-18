import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Payment, PaymentStatus, Prisma, type PrismaClient } from "@prisma/client";
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
import { resolveActorRole, writeAudit } from "../../lms/lms-audit";

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
  /** Role aktor untuk actor_role AuditLog (deterministik via resolveActorRole). */
  actorRoles?: string[];
  /** Idempotency-Key klien — replay mengembalikan Payment yang sama. */
  idempotencyKey?: string;
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
    // Idempotensi (replay): key yang sama mengembalikan Payment pertama.
    if (input.idempotencyKey) {
      const existing = await prisma.payment.findFirst({
        where: { idempotency_key: input.idempotencyKey }
      });
      if (existing) {
        return existing;
      }
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

    let payment: Payment;
    try {
      payment = await prisma.payment.create({
        data: {
          invoice_id: input.invoiceId,
          amount,
          method: input.method,
          proof_url: input.proofUrl ?? null,
          note: input.note ?? null,
          status: "PENDING",
          idempotency_key: input.idempotencyKey ?? null
        }
      });
    } catch (err) {
      // Race (dua request dengan key sama): yang kalah P2002 → kembalikan
      // Payment yang sudah dibuat pemenang (replay).
      if (input.idempotencyKey && this.isUniqueViolation(err)) {
        const existing = await prisma.payment.findFirst({
          where: { idempotency_key: input.idempotencyKey }
        });
        if (existing) {
          return existing;
        }
      }
      throw err;
    }
    await writeAudit({
      ctx: { userId: input.createdBy, roles: input.actorRoles ?? [] },
      action: "CREATE",
      entity: "payment",
      entityId: payment.id,
      after: {
        invoice_id: payment.invoice_id,
        amount: payment.amount.toFixed(2),
        method: payment.method,
        status: payment.status
      }
    });
    return payment;
  }

  /**
   * Alokasi satu pembayaran ke BANYAK invoice (bayar muka gabungan / cicilan).
   * Pembuatan Payment + update status invoice dalam satu transaksi.
   * Idempoten: key sama → replay { payment, allocations } dari kolom allocations.
   */
  async recordAllocated(input: {
    invoiceIds: string[];
    amount: Decimal | number | string;
    method: "TUNAI" | "TRANSFER" | "LAINNYA";
    proofUrl?: string;
    note?: string;
    createdBy: string;
    /** Role aktor untuk actor_role AuditLog (deterministik via resolveActorRole). */
    actorRoles?: string[];
    idempotencyKey?: string;
  }): Promise<{ payment: Payment; allocations: Array<{ invoiceId: string; allocated: Decimal }> }> {
    const amount = money(input.amount);
    if (amount.lte(ZERO)) {
      throw new BadRequestException("amount harus lebih besar dari 0");
    }
    // Idempotensi (replay): key yang sama mengembalikan alokasi asli.
    if (input.idempotencyKey) {
      const existing = await prisma.payment.findFirst({
        where: { idempotency_key: input.idempotencyKey }
      });
      if (existing) {
        return { payment: existing, allocations: this.allocationsFromRow(existing) };
      }
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

    const allocation = allocatePayment(amount, targets);

    let result: { payment: Payment; allocations: Array<{ invoiceId: string; allocated: Decimal }> };
    try {
      result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            invoice_id: primaryInvoiceId,
            amount,
            method: input.method,
            proof_url: input.proofUrl ?? null,
            note: input.note ?? null,
            status: "PENDING",
            idempotency_key: input.idempotencyKey ?? null,
            allocations: allocation.allocations.map((a) => ({
              invoiceId: a.invoiceId,
              allocated: a.allocated.toFixed(2)
            }))
          }
        });
        // Simpan catatan alokasi di note (alokasi penuh disimpan saat verifikasi).
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            note: input.note
              ? `${input.note} | alokasi: ${allocation.allocations.map((a) => `${a.invoiceId}=${a.allocated}`).join(",")}`
              : `alokasi: ${allocation.allocations.map((a) => `${a.invoiceId}=${a.allocated}`).join(",")}`
          }
        });
        return { payment, allocations: allocation.allocations };
      });
    } catch (err) {
      // Race (dua request dengan key sama): yang kalah P2002 → replay alokasi pemenang.
      if (input.idempotencyKey && this.isUniqueViolation(err)) {
        const existing = await prisma.payment.findFirst({
          where: { idempotency_key: input.idempotencyKey }
        });
        if (existing) {
          return { payment: existing, allocations: this.allocationsFromRow(existing) };
        }
      }
      throw err;
    }
    await writeAudit({
      ctx: { userId: input.createdBy, roles: input.actorRoles ?? [] },
      action: "CREATE",
      entity: "payment",
      entityId: result.payment.id,
      after: {
        invoice_ids: input.invoiceIds,
        amount: result.payment.amount.toFixed(2),
        method: result.payment.method,
        status: result.payment.status,
        allocations: result.allocations.map((a) => ({
          invoiceId: a.invoiceId,
          allocated: a.allocated.toFixed(2)
        }))
      }
    });
    return result;
  }

  /** Verifikasi pembayaran oleh KEUANGAN (payment:verify:school). */
  async verify(
    paymentId: string,
    approved: boolean,
    verifiedBy: string,
    note?: string,
    actorRoles: string[] = []
  ): Promise<Payment> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true }
    });
    if (!payment) {
      throw new NotFoundException("Pembayaran tidak ditemukan");
    }

    const nextStatus: PaymentStatus = approved ? "PAID" : "CANCELLED";
    // Optimistic lock: klaim status PENDING secara ATOMIK di dalam transaksi.
    // updateMany dengan where status menjadikan cek-then-update satu statement —
    // dua verify bersamaan hanya satu yang menang; yang kalah dapat count 0
    // → ConflictException (bukan status nondeterministik/notifikasi ganda).
    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: "PENDING" },
        data: {
          status: nextStatus,
          verified_by: verifiedBy,
          verified_at: approved ? new Date() : null,
          note: note ?? payment.note
        }
      });
      if (claimed.count === 0) {
        throw new ConflictException("Payment sudah diverifikasi atau status berubah");
      }
      const p = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: true }
      });
      if (!p) {
        throw new NotFoundException("Pembayaran tidak ditemukan");
      }
      await tx.auditLog.create({
        data: {
          actor_id: verifiedBy,
          actor_role: resolveActorRole(actorRoles) ?? null,
          action: approved ? "UPDATE" : "DELETE",
          entity: "payment",
          entity_id: paymentId,
          before: { status: "PENDING" },
          after: { status: nextStatus, note: note ?? null }
        }
      });
      // Recompute status SEMUA invoice yang tersentuh alokasi DI DALAM transaksi
      // yang sama agar konsisten dengan status payment terbaru (tidak ada jendela
      // status tidak sinkron): invoice primer + setiap invoice_id di kolom
      // allocations (payment alokasi lintas tagihan — recordAllocated).
      const allocationInvoiceIds = this.allocationsFromRow(p).map((a) => a.invoiceId);
      for (const invoiceId of new Set([p.invoice_id, ...allocationInvoiceIds])) {
        await this.recomputeInvoiceStatus(invoiceId, tx);
      }
      return p;
    });

    // Notifikasi HANYA setelah transaksi commit sukses — verify yang kalah
    // race (ConflictException) atau commit gagal tidak memicu notifikasi.
    if (approved) {
      await this.notifyInvoicePaid(updated, updated.invoice);
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

  /**
   * Hitung ulang status invoice dari total pembayaran PAID.
   * `client` default ke prisma global; verify() melewatkan TransactionClient
   * agar recompute berjalan DALAM transaksi yang sama dengan update payment.
   */
  async recomputeInvoiceStatus(
    invoiceId: string,
    client: Prisma.TransactionClient | PrismaClient = prisma
  ): Promise<void> {
    const invoice = await client.invoice.findUnique({
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
    await client.invoice.update({
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
    // Hitung ulang status di memori, lalu update SEKALI (updateMany) —
    // menggantikan invoice.update per baris (N+1).
    const toOverdueIds: string[] = [];
    for (const inv of overdue) {
      const totals = computeInvoiceTotals({
        amount: inv.amount,
        discount: inv.discount,
        paidSum: this.paidSumOf(inv),
        dueDate: inv.due_date,
        now
      });
      if (totals.status === "OVERDUE") {
        toOverdueIds.push(inv.id);
      }
    }
    if (toOverdueIds.length > 0) {
      await prisma.invoice.updateMany({
        where: { id: { in: toOverdueIds } },
        data: { status: "OVERDUE" }
      });
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

  /** Deteksi pelanggaran unique constraint Prisma (P2002). */
  private isUniqueViolation(err: unknown): boolean {
    return (err as { code?: string } | undefined)?.code === "P2002";
  }

  /** Baca alokasi tersimpan (kolom Json allocations) menjadi kontrak domain. */
  private allocationsFromRow(row: {
    allocations: Prisma.JsonValue | null;
  }): Array<{ invoiceId: string; allocated: Decimal }> {
    if (!Array.isArray(row.allocations)) {
      return [];
    }
    return (row.allocations as Array<{ invoiceId: string; allocated: string | number | Decimal }>)
      .filter((a) => a && typeof a === "object" && "invoiceId" in a)
      .map((a) => ({ invoiceId: a.invoiceId, allocated: money(a.allocated) }));
  }
}

/** Re-export untuk kompatibilitas pemakaian alokasi di controller. */
export type { Prisma };
