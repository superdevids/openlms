import { Decimal } from "@prisma/client/runtime/library";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
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
import { money } from "./calculator/money";

/**
 * FinanceStore — abstraksi persistence entitas keuangan W2 yang BELUM ada di
 * schema.prisma (LateFeeRule, denda invoice, refund, rekonsiliasi, arus kas).
 *
 * Implementasi saat ini: InMemoryFinanceStore (untuk unit test + pengembangan).
 * Integration coder menambah model Prisma + adapter PrismaFinanceStore setelah
 * skema ditambahkan — lihat ISSUES untuk proposal skema.
 * Invoice & Payment tetap memakai PrismaClient (model sudah ada di schema).
 */

export interface FinanceStore {
  // ---- LateFeeRule ----
  createLateFeeRule(input: {
    name: string;
    invoiceType: string;
    graceDays: number;
    feeType: "NOMINAL" | "PERSEN_PER_HARI";
    value: Decimal | number | string;
    maxAmount: Decimal | number | string | null;
    enabled: boolean;
    createdBy: string;
  }): Promise<LateFeeRuleRecord>;

  listLateFeeRules(onlyEnabled?: boolean): Promise<LateFeeRuleRecord[]>;

  updateLateFeeRule(
    id: string,
    patch: Partial<
      Pick<LateFeeRuleRecord, "name" | "graceDays" | "feeType" | "value" | "maxAmount" | "enabled">
    >
  ): Promise<LateFeeRuleRecord>;

  // ---- Denda invoice (tipe DENDA belum ada di enum schema) ----
  createDendaInvoice(input: {
    invoiceNo: string;
    originalInvoiceId: string;
    period: string;
    amount: Decimal | number | string;
    dueDate: Date;
    note: string;
    createdBy: string;
  }): Promise<DendaInvoiceRecord>;

  /** Cek idempotensi job: sudah ada denda aktif untuk invoice+periode. */
  findDendaInvoice(originalInvoiceId: string, period: string): Promise<DendaInvoiceRecord | null>;

  listDendaInvoices(originalInvoiceId?: string): Promise<DendaInvoiceRecord[]>;

  /** Hapus manual oleh KEUANGAN dengan alasan (prd04 §5.F.3) — dicatat AuditLog. */
  deleteDendaInvoice(id: string, reason: string, deletedBy: string): Promise<void>;

  // ---- Refund ----
  createRefund(input: {
    refundNo: string;
    paymentId: string | null;
    invoiceId: string | null;
    studentId: string | null;
    amount: Decimal | number | string;
    reason: string;
    method: "TRANSFER" | "TUNAI";
    requiresKepsekApproval: boolean;
    createdBy: string;
  }): Promise<RefundRecord>;

  getRefund(id: string): Promise<RefundRecord | null>;

  listRefunds(): Promise<RefundRecord[]>;

  updateRefund(id: string, patch: Partial<RefundRecord>): Promise<RefundRecord>;

  // ---- Rekonsiliasi ----
  createReconciliationBatch(input: {
    period: string;
    fileName: string;
    importedBy: string;
    items: ReconciliationItemRecord[];
  }): Promise<ReconciliationBatchRecord>;

  getReconciliationBatch(id: string): Promise<ReconciliationBatchRecord | null>;

  listReconciliationBatches(): Promise<ReconciliationBatchRecord[]>;

  resolveReconciliationItem(
    itemId: string,
    patch: {
      status?: "RESOLVED";
      matchedPaymentId?: string | null;
      resolutionNote?: string | null;
    },
    actorId: string
  ): Promise<ReconciliationItemRecord>;

  // ---- Arus kas ----
  createCashFlowRecord(input: {
    date: Date;
    direction: CashFlowDirection;
    amount: Decimal | number | string;
    category: CashFlowRecord["category"];
    referenceId: string | null;
    note: string | null;
    createdBy: string;
  }): Promise<CashFlowRecord>;

  listCashFlowRecords(from?: Date, to?: Date): Promise<CashFlowRecord[]>;

  // ---- Audit log ----
  appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void>;

  listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]>;
}

const nowIso = () => new Date();

@Injectable()
export class InMemoryFinanceStore implements FinanceStore {
  private readonly lateFeeRules = new Map<string, LateFeeRuleRecord>();
  private readonly dendaInvoices = new Map<string, DendaInvoiceRecord>();
  private readonly refunds = new Map<string, RefundRecord>();
  private readonly batches = new Map<string, ReconciliationBatchRecord>();
  private readonly cashFlows = new Map<string, CashFlowRecord>();
  private readonly auditLogs: AuditLogRecord[] = [];

  private nextId(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

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
    const now = nowIso();
    const record: LateFeeRuleRecord = {
      id: this.nextId("lfr"),
      name: input.name,
      invoiceType: input.invoiceType as FinanceInvoiceType,
      graceDays: Math.max(0, Math.floor(input.graceDays)),
      feeType: input.feeType,
      value: money(input.value),
      maxAmount:
        input.maxAmount === null || input.maxAmount === undefined ? null : money(input.maxAmount),
      enabled: input.enabled,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now
    };
    this.lateFeeRules.set(record.id, record);
    return record;
  }

  async listLateFeeRules(onlyEnabled = false): Promise<LateFeeRuleRecord[]> {
    const all = [...this.lateFeeRules.values()];
    return onlyEnabled ? all.filter((r) => r.enabled) : all;
  }

  async updateLateFeeRule(
    id: string,
    patch: Partial<
      Pick<LateFeeRuleRecord, "name" | "graceDays" | "feeType" | "value" | "maxAmount" | "enabled">
    >
  ): Promise<LateFeeRuleRecord> {
    const existing = this.lateFeeRules.get(id);
    if (!existing) {
      throw new Error(`LateFeeRule ${id} tidak ditemukan`);
    }
    const updated: LateFeeRuleRecord = {
      ...existing,
      ...patch,
      value: patch.value !== undefined ? money(patch.value) : existing.value,
      maxAmount:
        patch.maxAmount === null || patch.maxAmount === undefined
          ? existing.maxAmount
          : money(patch.maxAmount),
      updatedAt: nowIso()
    };
    this.lateFeeRules.set(id, updated);
    return updated;
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
    const record: DendaInvoiceRecord = {
      id: this.nextId("den"),
      invoiceNo: input.invoiceNo,
      originalInvoiceId: input.originalInvoiceId,
      period: input.period,
      amount: money(input.amount),
      dueDate: input.dueDate,
      status: "PENDING",
      note: input.note,
      createdBy: input.createdBy,
      createdAt: nowIso(),
      deletedAt: null,
      deleteReason: null,
      deletedBy: null
    };
    this.dendaInvoices.set(record.id, record);
    return record;
  }

  async findDendaInvoice(
    originalInvoiceId: string,
    period: string
  ): Promise<DendaInvoiceRecord | null> {
    for (const d of this.dendaInvoices.values()) {
      if (
        d.originalInvoiceId === originalInvoiceId &&
        d.period === period &&
        d.deletedAt === null
      ) {
        return d;
      }
    }
    return null;
  }

  async listDendaInvoices(originalInvoiceId?: string): Promise<DendaInvoiceRecord[]> {
    const all = [...this.dendaInvoices.values()];
    return originalInvoiceId ? all.filter((d) => d.originalInvoiceId === originalInvoiceId) : all;
  }

  async deleteDendaInvoice(id: string, reason: string, deletedBy: string): Promise<void> {
    const existing = this.dendaInvoices.get(id);
    if (!existing) {
      throw new Error(`DendaInvoice ${id} tidak ditemukan`);
    }
    existing.deletedAt = nowIso();
    existing.deleteReason = reason;
    existing.deletedBy = deletedBy;
    existing.status = "CANCELLED";
    await this.appendAuditLog({
      actorId: deletedBy,
      actorRole: "KEUANGAN",
      action: "DELETE",
      entity: "DendaInvoice",
      entityId: id,
      before: { amount: existing.amount.toString() },
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
    const now = nowIso();
    const record: RefundRecord = {
      id: this.nextId("ref"),
      refundNo: input.refundNo,
      paymentId: input.paymentId,
      invoiceId: input.invoiceId,
      studentId: input.studentId,
      amount: money(input.amount),
      reason: input.reason,
      method: input.method,
      status: "PENDING",
      requiresKepsekApproval: input.requiresKepsekApproval,
      approvedByKeuangan: null,
      approvedByKepsek: null,
      paidAt: null,
      note: null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now
    };
    this.refunds.set(record.id, record);
    return record;
  }

  async getRefund(id: string): Promise<RefundRecord | null> {
    return this.refunds.get(id) ?? null;
  }

  async listRefunds(): Promise<RefundRecord[]> {
    return [...this.refunds.values()];
  }

  async updateRefund(id: string, patch: Partial<RefundRecord>): Promise<RefundRecord> {
    const existing = this.refunds.get(id);
    if (!existing) {
      throw new Error(`Refund ${id} tidak ditemukan`);
    }
    const updated: RefundRecord = {
      ...existing,
      ...patch,
      amount: patch.amount !== undefined ? money(patch.amount) : existing.amount,
      updatedAt: nowIso()
    };
    this.refunds.set(id, updated);
    return updated;
  }

  // ---------- Rekonsiliasi ----------

  async createReconciliationBatch(input: {
    period: string;
    fileName: string;
    importedBy: string;
    items: ReconciliationItemRecord[];
  }): Promise<ReconciliationBatchRecord> {
    const batchId = this.nextId("rcb");
    const items = input.items.map((it) => ({
      ...it,
      id: this.nextId("rci"),
      batchId
    }));
    const batch: ReconciliationBatchRecord = {
      id: batchId,
      period: input.period,
      fileName: input.fileName,
      importedAt: nowIso(),
      importedBy: input.importedBy,
      totalRows: items.length,
      matchedRows: items.filter((i) => i.status === "MATCHED").length,
      unmatchedRows: items.filter((i) => i.status === "UNMATCHED").length,
      items
    };
    this.batches.set(batchId, batch);
    return batch;
  }

  async getReconciliationBatch(id: string): Promise<ReconciliationBatchRecord | null> {
    return this.batches.get(id) ?? null;
  }

  async listReconciliationBatches(): Promise<ReconciliationBatchRecord[]> {
    return [...this.batches.values()];
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
    for (const batch of this.batches.values()) {
      const item = batch.items.find((i) => i.id === itemId);
      if (item) {
        item.status = patch.status ?? "RESOLVED";
        if (patch.matchedPaymentId !== undefined) item.matchedPaymentId = patch.matchedPaymentId;
        if (patch.resolutionNote !== undefined) item.resolutionNote = patch.resolutionNote;
        // perbarui hitung matched/unmatched batch
        batch.matchedRows = batch.items.filter((i) => i.status === "MATCHED").length;
        batch.unmatchedRows = batch.items.filter((i) => i.status === "UNMATCHED").length;
        await this.appendAuditLog({
          actorId,
          actorRole: "KEUANGAN",
          action: "UPDATE",
          entity: "ReconciliationItem",
          entityId: itemId,
          before: {},
          after: { status: item.status, matchedPaymentId: item.matchedPaymentId },
          note: "resolusi manual item rekonsiliasi"
        });
        return item;
      }
    }
    throw new Error(`ReconciliationItem ${itemId} tidak ditemukan`);
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
    const record: CashFlowRecord = {
      id: this.nextId("cf"),
      date: input.date,
      direction: input.direction,
      amount: money(input.amount),
      category: input.category,
      referenceId: input.referenceId,
      note: input.note,
      createdBy: input.createdBy,
      createdAt: nowIso()
    };
    this.cashFlows.set(record.id, record);
    return record;
  }

  async listCashFlowRecords(from?: Date, to?: Date): Promise<CashFlowRecord[]> {
    let records = [...this.cashFlows.values()];
    if (from) records = records.filter((r) => r.date >= from);
    if (to) records = records.filter((r) => r.date <= to);
    return records;
  }

  // ---------- Audit log ----------

  async appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void> {
    this.auditLogs.push({
      ...entry,
      id: this.nextId("aud"),
      createdAt: nowIso()
    });
  }

  async listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]> {
    let logs = this.auditLogs;
    if (entity) logs = logs.filter((l) => l.entity === entity);
    if (entityId) logs = logs.filter((l) => l.entityId === entityId);
    return [...logs];
  }
}
