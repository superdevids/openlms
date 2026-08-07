import { Decimal } from "@prisma/client/runtime/library";

/**
 * Tipe domain Keuangan (prd04 §5.F).
 *
 * CATATAN PENTING (lihat ISSUES): entitas W2 berikut BELUM ada di schema.prisma
 * (03-database-erd v1.1) dan BUKAN model Prisma:
 *   LateFeeRule, DendaInvoice (invoice tipe DENDA), Refund,
 *   ReconciliationBatch, ReconciliationItem, CashFlowRecord.
 * Tipe di file ini adalah KONTRAK domain; persistence memakai FinanceStore
 * (saat ini InMemoryFinanceStore — lihat finance.store.ts) sampai integration
 * coder menambahkan skema + adapter Prisma. Invoice/Payment memakai model
 * Prisma yang sudah ada (schema §2.17/§2.18).
 */

/** Perluasan InvoiceType — schema.prisma belum punya UANG_OSIS & DENDA. */
export type FinanceInvoiceType =
  "SPP" | "UANG_KEGIATAN" | "UANG_DAFTAR" | "UANG_SERAGAM" | "UANG_OSIS" | "DENDA" | "LAINNYA";

export type LateFeeRuleType = "NOMINAL" | "PERSEN_PER_HARI";

export interface LateFeeRuleRecord {
  id: string;
  name: string;
  invoiceType: FinanceInvoiceType;
  graceDays: number;
  feeType: LateFeeRuleType;
  value: Decimal;
  maxAmount: Decimal | null;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DendaInvoiceStatus = "PENDING" | "PAID" | "CANCELLED";

export interface DendaInvoiceRecord {
  id: string;
  invoiceNo: string;
  originalInvoiceId: string;
  /** periode denda YYYY-MM — kunci idempotensi job harian */
  period: string;
  amount: Decimal;
  dueDate: Date;
  status: DendaInvoiceStatus;
  note: string;
  createdBy: string;
  createdAt: Date;
  deletedAt: Date | null;
  deleteReason: string | null;
  deletedBy: string | null;
}

export type RefundStatus =
  "DRAFT" | "PENDING" | "APPROVED_KEUANGAN" | "APPROVED_KEPSEK" | "PAID" | "REJECTED" | "CANCELLED";

export type RefundMethod = "TRANSFER" | "TUNAI";

export interface RefundRecord {
  id: string;
  refundNo: string;
  paymentId: string | null;
  invoiceId: string | null;
  studentId: string | null;
  amount: Decimal;
  reason: string;
  method: RefundMethod;
  status: RefundStatus;
  /** true bila nominal >= ambang -> butuh approval KEPSEK */
  requiresKepsekApproval: boolean;
  approvedByKeuangan: string | null;
  approvedByKepsek: string | null;
  paidAt: Date | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReconciliationRowStatus = "MATCHED" | "UNMATCHED" | "RESOLVED";

export interface ReconciliationItemRecord {
  id: string;
  batchId: string;
  rowIndex: number;
  tanggal: string;
  keterangan: string;
  referensi: string | null;
  nominal: Decimal;
  tipe: "DEBIT" | "KREDIT";
  status: ReconciliationRowStatus;
  matchedPaymentId: string | null;
  matchConfidence: number;
  resolutionNote: string | null;
}

export interface ReconciliationBatchRecord {
  id: string;
  /** periode YYYY-MM */
  period: string;
  fileName: string;
  importedAt: Date;
  importedBy: string;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  items: ReconciliationItemRecord[];
}

export type CashFlowDirection = "IN" | "OUT";
export type CashFlowCategory = "PAYMENT_VERIFIED" | "REFUND" | "EXPENSE" | "OTHER";

export interface CashFlowRecord {
  id: string;
  date: Date;
  direction: CashFlowDirection;
  amount: Decimal;
  category: CashFlowCategory;
  referenceId: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  note: string | null;
  createdAt: Date;
}
