import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { money, ZERO } from "../calculator/money";
import { FinanceStore } from "../finance.store";
import { RefundRecord, RefundStatus } from "../finance.types";
import { FINANCE_STORE, REFUND_NO_PREFIX } from "../finance.constants";
import { FinanceConfigService } from "./finance-config.service";

/**
 * RefundService — pengembalian dana (prd04 §5.F.4).
 * - Alasan: kelebihan bayar, pembatalan, mutasi.
 * - Approval berlapis: KEUANGAN -> (bila nominal >= ambang) KEPSEK.
 * - Metode transfer/tunai; status DRAFT/PENDING/APPROVED_KEUANGAN/APPROVED_KEPSEK/PAID/REJECTED/CANCELLED.
 * - Saat PAID dicatat ke arus kas keluar (REFUND).
 * - Idempoten via refund_no unik.
 *
 * CATATAN: Refund belum ada di schema.prisma — persistence via FinanceStore.
 * Proposal skema di ISSUES.
 */

export interface CreateRefundInput {
  paymentId?: string;
  invoiceId?: string;
  studentId?: string;
  amount: Decimal | number | string;
  reason: string;
  method: "TRANSFER" | "TUNAI";
  note?: string;
  createdBy: string;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @Inject(FINANCE_STORE) private readonly store: FinanceStore,
    private readonly configService: FinanceConfigService
  ) {}

  async create(input: CreateRefundInput): Promise<RefundRecord> {
    const amount = money(input.amount);
    if (amount.lte(ZERO)) {
      throw new BadRequestException("amount refund harus lebih besar dari 0");
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new BadRequestException("Alasan refund wajib diisi");
    }
    const requiresKepsek = await this.configService.requiresKepsekApproval(amount);
    const refundNo = await this.nextRefundNo();

    const record = await this.store.createRefund({
      refundNo,
      paymentId: input.paymentId ?? null,
      invoiceId: input.invoiceId ?? null,
      studentId: input.studentId ?? null,
      amount,
      reason: input.reason.trim(),
      method: input.method,
      requiresKepsekApproval: requiresKepsek,
      createdBy: input.createdBy
    });
    await this.store.appendAuditLog({
      actorId: input.createdBy,
      actorRole: "KEUANGAN",
      action: "CREATE",
      entity: "Refund",
      entityId: record.id,
      before: {},
      after: { refundNo, amount: amount.toString(), requiresKepsekApproval: requiresKepsek },
      note: input.note ?? null
    });
    return record;
  }

  async get(id: string): Promise<RefundRecord> {
    const record = await this.store.getRefund(id);
    if (!record) {
      throw new NotFoundException("Refund tidak ditemukan");
    }
    return record;
  }

  async list(): Promise<RefundRecord[]> {
    return this.store.listRefunds();
  }

  /**
   * Approval KEUANGAN (refund:approve:school). Bila perlu approval KEPSEK,
   * status -> APPROVED_KEUANGAN menunggu kepsek; bila tidak -> PAID.
   */
  async approveByKeuangan(
    id: string,
    approved: boolean,
    actorId: string,
    note?: string
  ): Promise<RefundRecord> {
    const record = await this.get(id);
    if (record.status !== "PENDING") {
      throw new BadRequestException(
        `Refund berstatus ${record.status} tidak bisa di-approve KEUANGAN`
      );
    }
    if (!approved) {
      return this.reject(record, actorId, note);
    }
    const next: RefundStatus = record.requiresKepsekApproval ? "APPROVED_KEUANGAN" : "PAID";
    const updated = await this.store.updateRefund(record.id, {
      status: next,
      approvedByKeuangan: actorId
    });
    if (next === "PAID") {
      await this.markPaid(updated);
    }
    return updated;
  }

  /** Approval KEPSEK (rekap ringkasan, bukan detail pegawai — prd04 §5.E.5 analog). */
  async approveByKepsek(
    id: string,
    approved: boolean,
    actorId: string,
    note?: string
  ): Promise<RefundRecord> {
    const record = await this.get(id);
    if (record.status !== "APPROVED_KEUANGAN") {
      throw new BadRequestException(
        `Refund harus disetujui KEUANGAN dulu (sekarang ${record.status})`
      );
    }
    if (!approved) {
      return this.reject(record, actorId, note);
    }
    const updated = await this.store.updateRefund(record.id, {
      status: "PAID",
      approvedByKepsek: actorId
    });
    await this.markPaid(updated);
    return updated;
  }

  private async reject(
    record: RefundRecord,
    actorId: string,
    note?: string
  ): Promise<RefundRecord> {
    const updated = await this.store.updateRefund(record.id, {
      status: "REJECTED",
      note: note ?? record.note
    });
    await this.store.appendAuditLog({
      actorId,
      actorRole: "KEUANGAN",
      action: "UPDATE",
      entity: "Refund",
      entityId: record.id,
      before: { status: record.status },
      after: { status: "REJECTED", note: note ?? null },
      note: "refund ditolak"
    });
    return updated;
  }

  private async markPaid(record: RefundRecord): Promise<void> {
    await this.store.updateRefund(record.id, { status: "PAID", paidAt: new Date() });
    await this.store.createCashFlowRecord({
      date: new Date(),
      direction: "OUT",
      amount: record.amount,
      category: "REFUND",
      referenceId: record.refundNo,
      note: `Refund ${record.reason}`,
      createdBy: record.approvedByKeuangan ?? record.createdBy
    });
    this.logger.log(`Refund ${record.refundNo} dibayar Rp${record.amount}`);
  }

  /** Nomor refund: REF-{tahun}-{urutan:5}. */
  async nextRefundNo(now = new Date()): Promise<string> {
    const year = now.getFullYear();
    const all = await this.store.listRefunds();
    const yearRefunds = all.filter((r) => r.refundNo.startsWith(`${REFUND_NO_PREFIX}-${year}-`));
    return `${REFUND_NO_PREFIX}-${year}-${String(yearRefunds.length + 1).padStart(5, "0")}`;
  }
}
