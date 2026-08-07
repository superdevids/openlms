import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { prisma } from "@openlms/database";
import { Decimal } from "@prisma/client/runtime/library";
import {
  matchRowToPayments,
  parseMutasiCsv,
  toPaymentCandidates
} from "../calculator/reconciliation-match";
import { FinanceStore } from "../finance.store";
import { ReconciliationBatchRecord, ReconciliationItemRecord } from "../finance.types";
import { FINANCE_STORE, monthPeriod } from "../finance.constants";

/**
 * ReconciliationService — rekonsiliasi bank (prd04 §5.F.5).
 * Import mutasi CSV -> cocokkan otomatis dengan Payment (referensi/no. invoice,
 * nominal, tanggal) -> MATCHED / UNMATCHED -> resolusi manual.
 *
 * CATATAN: ReconciliationBatch/Item belum ada di schema.prisma — persistence
 * via FinanceStore. Proposal skema di ISSUES.
 */

export interface ImportReconciliationInput {
  csv: string;
  period?: string;
  fileName?: string;
  importedBy: string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(@Inject(FINANCE_STORE) private readonly store: FinanceStore) {}

  async import(input: ImportReconciliationInput): Promise<ReconciliationBatchRecord> {
    const rows = parseMutasiCsv(input.csv);
    if (rows.length === 0) {
      throw new BadRequestException(
        "CSV kosong atau format tidak dikenali (tanggal,keterangan,referensi,nominal,tipe)"
      );
    }

    const period = input.period ?? monthPeriod(new Date());
    // Kandidat pembayaran: semua Payment di periode tsb (paid_at dalam bulan).
    const [year, month] = period.split("-").map(Number);
    const from = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1));
    const to = new Date(Date.UTC(year ?? 1970, month ?? 1, 0, 23, 59, 59));
    const payments = await prisma.payment.findMany({
      where: {
        status: "PAID",
        paid_at: { gte: from, lte: to }
      },
      include: { invoice: true }
    });

    const candidates = toPaymentCandidates(
      payments.map((p) => ({
        id: p.id,
        invoiceNo: p.invoice.invoice_no,
        amount: p.amount,
        paidAt: p.paid_at,
        method: p.method
      }))
    );

    const items: ReconciliationItemRecord[] = rows.map((row) => {
      const result = matchRowToPayments(row, candidates);
      return {
        id: "",
        batchId: "",
        rowIndex: row.rowIndex,
        tanggal: row.tanggal,
        keterangan: row.keterangan,
        referensi: row.referensi,
        nominal: row.nominal,
        tipe: row.tipe,
        status: result.status,
        matchedPaymentId: result.matchedPaymentId,
        matchConfidence: result.confidence,
        resolutionNote: result.reason
      };
    });

    const batch = await this.store.createReconciliationBatch({
      period,
      fileName: input.fileName ?? "mutasi.csv",
      importedBy: input.importedBy,
      items
    });
    await this.store.appendAuditLog({
      actorId: input.importedBy,
      actorRole: "KEUANGAN",
      action: "CREATE",
      entity: "ReconciliationBatch",
      entityId: batch.id,
      before: {},
      after: { period, totalRows: batch.totalRows, matchedRows: batch.matchedRows },
      note: "import mutasi bank"
    });
    this.logger.log(`Rekonsiliasi ${period}: ${batch.matchedRows}/${batch.totalRows} MATCHED`);
    return batch;
  }

  async get(id: string): Promise<ReconciliationBatchRecord> {
    const batch = await this.store.getReconciliationBatch(id);
    if (!batch) {
      throw new BadRequestException("Batch rekonsiliasi tidak ditemukan");
    }
    return batch;
  }

  async list(): Promise<ReconciliationBatchRecord[]> {
    return this.store.listReconciliationBatches();
  }

  /** Resolusi manual item UNMATCHED (reconciliation:run:school). */
  async resolveItem(
    itemId: string,
    patch: { matchedPaymentId?: string; resolutionNote?: string },
    actorId: string
  ): Promise<ReconciliationItemRecord> {
    return this.store.resolveReconciliationItem(itemId, patch, actorId);
  }
}

export { Decimal };
