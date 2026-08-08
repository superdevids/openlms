import { Decimal } from "@prisma/client/runtime/library";
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import type { Prisma } from "@prisma/client";
import type { AuditAction, Role } from "@prisma/client";
import { money } from "./calculator/money";
import {
  AuditLogRecord,
  CashFlowDirection,
  CashFlowRecord,
  DendaInvoiceRecord,
  FinanceInvoiceType,
  LateFeeRuleRecord,
  ReconciliationBatchRecord,
  ReconciliationItemRecord,
  RefundRecord
} from "./finance.types";
import type { FinanceStore } from "./finance.store";

/**
 * PrismaFinanceStore — adapter persisten FinanceStore (W2).
 *
 * Memetakan kontrak domain (finance.types.ts) ke model Prisma yang ditambahkan
 * pada migrasi integrate_w2: LateFeeRule, DendaInvoice, Refund,
 * ReconciliationBatch/Item, CashFlowRecord, AuditLog. Uang memakai Decimal
 * (Prisma.Decimal, 12,2) sesuai keputusan desain prd04 §5.F.
 */
@Injectable()
export class PrismaFinanceStore implements FinanceStore {
  constructor(private readonly prisma: PrismaClient) {}

  // ---------- LateFeeRule ----------

  async createLateFeeRule(input: {
    name: string;
    invoiceType: string;
    graceDays: number;
    feeType: "NOMINAL" | "PERSEN_PER_HARI";
    value: Decimal | number | string;
    maxAmount: Decimal | number | string | null;
    enabled: boolean;
    createdBy: string;
  }): Promise<LateFeeRuleRecord> {
    const row = await this.prisma.lateFeeRule.create({
      data: {
        name: input.name,
        invoice_type: input.invoiceType as FinanceInvoiceType,
        grace_days: Math.max(0, Math.floor(input.graceDays)),
        fee_type: input.feeType,
        value: money(input.value),
        max_amount:
          input.maxAmount === null || input.maxAmount === undefined ? null : money(input.maxAmount),
        enabled: input.enabled,
        created_by: input.createdBy
      }
    });
    return this.toLateFeeRule(row);
  }

  async listLateFeeRules(onlyEnabled = false): Promise<LateFeeRuleRecord[]> {
    const rows = await this.prisma.lateFeeRule.findMany({
      where: onlyEnabled ? { enabled: true } : {},
      orderBy: { created_at: "asc" }
    });
    return rows.map((r) => this.toLateFeeRule(r));
  }

  async updateLateFeeRule(
    id: string,
    patch: Partial<
      Pick<LateFeeRuleRecord, "name" | "graceDays" | "feeType" | "value" | "maxAmount" | "enabled">
    >
  ): Promise<LateFeeRuleRecord> {
    const row = await this.prisma.lateFeeRule.update({
      where: { id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.graceDays !== undefined && { grace_days: patch.graceDays }),
        ...(patch.feeType !== undefined && { fee_type: patch.feeType }),
        ...(patch.value !== undefined && { value: money(patch.value) }),
        ...(patch.maxAmount !== undefined && {
          max_amount: patch.maxAmount === null ? null : money(patch.maxAmount)
        }),
        ...(patch.enabled !== undefined && { enabled: patch.enabled })
      }
    });
    return this.toLateFeeRule(row);
  }

  // ---------- Denda invoice ----------

  async createDendaInvoice(input: {
    invoiceNo: string;
    originalInvoiceId: string;
    period: string;
    amount: Decimal | number | string;
    dueDate: Date;
    note: string;
    createdBy: string;
  }): Promise<DendaInvoiceRecord> {
    const row = await this.prisma.dendaInvoice.create({
      data: {
        invoice_no: input.invoiceNo,
        original_invoice_id: input.originalInvoiceId,
        period: input.period,
        amount: money(input.amount),
        due_date: input.dueDate,
        note: input.note,
        created_by: input.createdBy
      }
    });
    return this.toDendaInvoice(row);
  }

  async findDendaInvoice(
    originalInvoiceId: string,
    period: string
  ): Promise<DendaInvoiceRecord | null> {
    const row = await this.prisma.dendaInvoice.findFirst({
      where: { original_invoice_id: originalInvoiceId, period, deleted_at: null }
    });
    return row ? this.toDendaInvoice(row) : null;
  }

  async listDendaInvoices(originalInvoiceId?: string): Promise<DendaInvoiceRecord[]> {
    const rows = await this.prisma.dendaInvoice.findMany({
      where: originalInvoiceId ? { original_invoice_id: originalInvoiceId } : {},
      orderBy: { created_at: "asc" }
    });
    return rows.map((r) => this.toDendaInvoice(r));
  }

  async deleteDendaInvoice(id: string, reason: string, deletedBy: string): Promise<void> {
    await this.prisma.dendaInvoice.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        delete_reason: reason,
        deleted_by: deletedBy,
        status: "CANCELLED"
      }
    });
    await this.appendAuditLog({
      actorId: deletedBy,
      actorRole: "KEUANGAN",
      action: "DELETE",
      entity: "DendaInvoice",
      entityId: id,
      before: {},
      after: { status: "CANCELLED", reason },
      note: "hapus manual denda"
    });
  }

  // ---------- Refund ----------

  async createRefund(input: {
    refundNo: string;
    paymentId: string | null;
    invoiceId: string | null;
    studentId: string | null;
    amount: Decimal | number | string;
    reason: string;
    method: "TRANSFER" | "TUNAI";
    requiresKepsekApproval: boolean;
    createdBy: string;
  }): Promise<RefundRecord> {
    const row = await this.prisma.refund.create({
      data: {
        refund_no: input.refundNo,
        payment_id: input.paymentId,
        invoice_id: input.invoiceId,
        student_id: input.studentId,
        amount: money(input.amount),
        reason: input.reason,
        method: input.method,
        requires_kepsek_approval: input.requiresKepsekApproval,
        created_by: input.createdBy
      }
    });
    return this.toRefund(row);
  }

  async getRefund(id: string): Promise<RefundRecord | null> {
    const row = await this.prisma.refund.findUnique({ where: { id } });
    return row ? this.toRefund(row) : null;
  }

  async listRefunds(): Promise<RefundRecord[]> {
    const rows = await this.prisma.refund.findMany({ orderBy: { created_at: "desc" } });
    return rows.map((r) => this.toRefund(r));
  }

  async updateRefund(id: string, patch: Partial<RefundRecord>): Promise<RefundRecord> {
    const row = await this.prisma.refund.update({
      where: { id },
      data: {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.approvedByKeuangan !== undefined && {
          approved_by_keuangan: patch.approvedByKeuangan
        }),
        ...(patch.approvedByKepsek !== undefined && { approved_by_kepsek: patch.approvedByKepsek }),
        ...(patch.paidAt !== undefined && { paid_at: patch.paidAt }),
        ...(patch.note !== undefined && { note: patch.note }),
        ...(patch.method !== undefined && { method: patch.method }),
        ...(patch.reason !== undefined && { reason: patch.reason }),
        ...(patch.amount !== undefined && { amount: money(patch.amount) }),
        ...(patch.requiresKepsekApproval !== undefined && {
          requires_kepsek_approval: patch.requiresKepsekApproval
        })
      }
    });
    return this.toRefund(row);
  }

  // ---------- Rekonsiliasi ----------

  async createReconciliationBatch(input: {
    period: string;
    fileName: string;
    importedBy: string;
    items: ReconciliationItemRecord[];
  }): Promise<ReconciliationBatchRecord> {
    const batch = await this.prisma.reconciliationBatch.create({
      data: {
        period: input.period,
        file_name: input.fileName,
        imported_by: input.importedBy,
        total_rows: input.items.length,
        matched_rows: input.items.filter((i) => i.status === "MATCHED").length,
        unmatched_rows: input.items.filter((i) => i.status === "UNMATCHED").length,
        items: {
          create: input.items.map((it) => ({
            row_index: it.rowIndex,
            tanggal: it.tanggal,
            keterangan: it.keterangan,
            referensi: it.referensi,
            nominal: it.nominal,
            tipe: it.tipe,
            status: it.status,
            matched_payment_id: it.matchedPaymentId,
            match_confidence: it.matchConfidence,
            resolution_note: it.resolutionNote,
            created_by: input.importedBy
          }))
        }
      },
      include: { items: true }
    });
    return this.toReconciliationBatch(batch);
  }

  async getReconciliationBatch(id: string): Promise<ReconciliationBatchRecord | null> {
    const batch = await this.prisma.reconciliationBatch.findUnique({
      where: { id },
      include: { items: true }
    });
    return batch ? this.toReconciliationBatch(batch) : null;
  }

  async listReconciliationBatches(): Promise<ReconciliationBatchRecord[]> {
    const batches = await this.prisma.reconciliationBatch.findMany({
      include: { items: true },
      orderBy: { imported_at: "desc" }
    });
    return batches.map((b) => this.toReconciliationBatch(b));
  }

  async resolveReconciliationItem(
    itemId: string,
    patch: {
      status?: "RESOLVED";
      matchedPaymentId?: string | null;
      resolutionNote?: string | null;
    },
    actorId: string
  ): Promise<ReconciliationItemRecord> {
    const row = await this.prisma.reconciliationItem.update({
      where: { id: itemId },
      data: {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.matchedPaymentId !== undefined && {
          matched_payment_id: patch.matchedPaymentId
        }),
        ...(patch.resolutionNote !== undefined && { resolution_note: patch.resolutionNote })
      }
    });
    await this.appendAuditLog({
      actorId,
      actorRole: "KEUANGAN",
      action: "UPDATE",
      entity: "ReconciliationItem",
      entityId: itemId,
      before: {},
      after: { status: row.status, matchedPaymentId: row.matched_payment_id },
      note: "resolusi manual item rekonsiliasi"
    });
    return this.toReconciliationItem(row);
  }

  // ---------- Arus kas ----------

  async createCashFlowRecord(input: {
    date: Date;
    direction: CashFlowDirection;
    amount: Decimal | number | string;
    category: CashFlowRecord["category"];
    referenceId: string | null;
    note: string | null;
    createdBy: string;
  }): Promise<CashFlowRecord> {
    const row = await this.prisma.cashFlowRecord.create({
      data: {
        date: input.date,
        direction: input.direction,
        amount: money(input.amount),
        category: input.category,
        reference_id: input.referenceId,
        note: input.note,
        created_by: input.createdBy
      }
    });
    return this.toCashFlow(row);
  }

  async listCashFlowRecords(from?: Date, to?: Date): Promise<CashFlowRecord[]> {
    const rows = await this.prisma.cashFlowRecord.findMany({
      where: {
        ...(from ? { date: { gte: from } } : {}),
        ...(to ? { date: { lte: to } } : {})
      },
      orderBy: { date: "asc" }
    });
    return rows.map((r) => this.toCashFlow(r));
  }

  // ---------- Audit log ----------

  async appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void> {
    const after = this.toJsonValue(entry.after);
    await this.prisma.auditLog.create({
      data: {
        actor_id: entry.actorId,
        actor_role: (entry.actorRole as Role | null) ?? undefined,
        action: entry.action as AuditAction,
        entity: entry.entity,
        entity_id: entry.entityId,
        before: this.toJsonValue(entry.before) ?? undefined,
        after:
          entry.note != null
            ? {
                ...(after &&
                typeof after === "object" &&
                !Array.isArray(after) &&
                !(after instanceof Date)
                  ? (after as Record<string, unknown>)
                  : {}),
                _note: entry.note
              }
            : (after ?? undefined),
        ip_address: null
      }
    });
  }

  async listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: { ...(entity ? { entity } : {}), ...(entityId ? { entity_id: entityId } : {}) },
      orderBy: { created_at: "desc" }
    });
    return rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorRole: r.actor_role ?? null,
      action: (r.action as AuditLogRecord["action"]) ?? "CREATE",
      entity: r.entity,
      entityId: r.entity_id,
      before: r.before,
      after: r.after,
      note: null,
      createdAt: r.created_at
    }));
  }

  // ---------- Mapper ----------

  private toLateFeeRule(r: Prisma.LateFeeRuleGetPayload<Record<string, never>>): LateFeeRuleRecord {
    return {
      id: r.id,
      name: r.name,
      invoiceType: r.invoice_type,
      graceDays: r.grace_days,
      feeType: r.fee_type,
      value: r.value,
      maxAmount: r.max_amount,
      enabled: r.enabled,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toDendaInvoice(
    r: Prisma.DendaInvoiceGetPayload<Record<string, never>>
  ): DendaInvoiceRecord {
    return {
      id: r.id,
      invoiceNo: r.invoice_no,
      originalInvoiceId: r.original_invoice_id,
      period: r.period,
      amount: r.amount,
      dueDate: r.due_date,
      status:
        r.status === "PAID" || r.status === "CANCELLED"
          ? r.status
          : ("PENDING" as DendaInvoiceRecord["status"]),
      note: r.note ?? "",
      createdBy: r.created_by,
      createdAt: r.created_at,
      deletedAt: r.deleted_at,
      deleteReason: r.delete_reason,
      deletedBy: r.deleted_by
    };
  }

  private toRefund(r: Prisma.RefundGetPayload<Record<string, never>>): RefundRecord {
    return {
      id: r.id,
      refundNo: r.refund_no,
      paymentId: r.payment_id,
      invoiceId: r.invoice_id,
      studentId: r.student_id,
      amount: r.amount,
      reason: r.reason,
      method: r.method,
      status: r.status,
      requiresKepsekApproval: r.requires_kepsek_approval,
      approvedByKeuangan: r.approved_by_keuangan,
      approvedByKepsek: r.approved_by_kepsek,
      paidAt: r.paid_at,
      note: r.note,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toReconciliationItem(
    r: Prisma.ReconciliationItemGetPayload<Record<string, never>>
  ): ReconciliationItemRecord {
    return {
      id: r.id,
      batchId: r.batch_id,
      rowIndex: r.row_index,
      tanggal: r.tanggal,
      keterangan: r.keterangan,
      referensi: r.referensi,
      nominal: r.nominal,
      tipe: r.tipe as ReconciliationItemRecord["tipe"],
      status: r.status,
      matchedPaymentId: r.matched_payment_id,
      matchConfidence: r.match_confidence.toNumber(),
      resolutionNote: r.resolution_note
    };
  }

  private toReconciliationBatch(
    r: Prisma.ReconciliationBatchGetPayload<{ include: { items: true } }>
  ): ReconciliationBatchRecord {
    return {
      id: r.id,
      period: r.period,
      fileName: r.file_name,
      importedAt: r.imported_at,
      importedBy: r.imported_by,
      totalRows: r.total_rows,
      matchedRows: r.matched_rows,
      unmatchedRows: r.unmatched_rows,
      items: r.items.map((i) => this.toReconciliationItem(i))
    };
  }

  private toCashFlow(r: Prisma.CashFlowRecordGetPayload<Record<string, never>>): CashFlowRecord {
    return {
      id: r.id,
      date: r.date,
      direction: r.direction,
      amount: r.amount,
      category: r.category,
      referenceId: r.reference_id,
      note: r.note,
      createdBy: r.created_by,
      createdAt: r.created_at
    };
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | null {
    if (value === undefined || value === null) {
      return null;
    }
    return value as Prisma.InputJsonValue;
  }
}
