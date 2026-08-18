import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { prisma } from "@opensis/database";
import { Decimal } from "@prisma/client/runtime/library";
import { computeInvoiceTotals } from "../calculator/invoice-status";
import { computeLateFee } from "../calculator/late-fee";
import { money, ZERO } from "../calculator/money";
import { FinanceStore } from "../finance.store";
import { LateFeeRuleRecord } from "../finance.types";
import { DENDA_NO_PREFIX, FINANCE_STORE, monthPeriod } from "../finance.constants";
import { PaymentService } from "./payment.service";

/**
 * LateFeeService — denda keterlambatan otomatis (prd04 §5.F.3).
 * - LateFeeRule per jenis tagihan (grace period, tipe NOMINAL/PERSEN_PER_HARI,
 *   nilai, denda maksimum).
 * - Job harian: hitung denda invoice OVERDUE -> buat invoice DENDA terpisah
 *   (idempoten per original_invoice_id + periode).
 * - Denda bisa dihapus manual oleh KEUANGAN dengan alasan (AuditLog).
 *
 * CATATAN: LateFeeRule & DendaInvoice belum ada di schema.prisma — persistence
 * via FinanceStore (InMemoryFinanceStore). Proposal skema di ISSUES.
 */

export interface CreateLateFeeRuleInput {
  name: string;
  invoiceType: string;
  graceDays: number;
  feeType: "NOMINAL" | "PERSEN_PER_HARI";
  value: Decimal | number | string;
  maxAmount?: Decimal | number | string | null;
  enabled?: boolean;
  createdBy: string;
}

export interface LateFeeJobResult {
  period: string;
  checked: number;
  created: number;
  skipped: number;
}

@Injectable()
export class LateFeeService {
  private readonly logger = new Logger(LateFeeService.name);

  constructor(
    @Inject(FINANCE_STORE) private readonly store: FinanceStore,
    private readonly paymentService: PaymentService
  ) {}

  async createRule(input: CreateLateFeeRuleInput): Promise<LateFeeRuleRecord> {
    const value = money(input.value);
    if (value.lte(ZERO)) {
      throw new BadRequestException("value harus lebih besar dari 0");
    }
    if (input.feeType === "PERSEN_PER_HARI" && value.gt(new Decimal(100))) {
      throw new BadRequestException("persen per hari maksimal 100");
    }
    return this.store.createLateFeeRule({
      name: input.name,
      invoiceType: input.invoiceType,
      graceDays: input.graceDays,
      feeType: input.feeType,
      value,
      maxAmount: input.maxAmount ?? null,
      enabled: input.enabled ?? true,
      createdBy: input.createdBy
    });
  }

  async listRules(onlyEnabled = false): Promise<LateFeeRuleRecord[]> {
    return this.store.listLateFeeRules(onlyEnabled);
  }

  async updateRule(
    id: string,
    patch: Partial<Omit<CreateLateFeeRuleInput, "createdBy">>
  ): Promise<LateFeeRuleRecord> {
    return this.store.updateLateFeeRule(id, {
      name: patch.name,
      graceDays: patch.graceDays,
      feeType: patch.feeType,
      value: patch.value !== undefined ? money(patch.value) : undefined,
      maxAmount:
        patch.maxAmount === null
          ? null
          : patch.maxAmount !== undefined
            ? money(patch.maxAmount)
            : undefined,
      enabled: patch.enabled
    });
  }

  /** Hapus manual denda dengan alasan (prd04 §5.F.3 — AuditLog di store). */
  async deleteDenda(invoiceNo: string, reason: string, deletedBy: string): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException("Alasan penghapusan denda wajib diisi");
    }
    const found = await this.findDendaByNo(invoiceNo);
    if (!found) {
      throw new NotFoundException("Denda tidak ditemukan");
    }
    await this.store.deleteDendaInvoice(found.id, reason, deletedBy);
  }

  private async findDendaByNo(invoiceNo: string) {
    const all = await this.store.listDendaInvoices();
    return all.find((d) => d.invoiceNo === invoiceNo) ?? null;
  }

  /**
   * Job harian denda (prd04 §5.F.3). Idempoten:
   * - hanya invoice berstatus OVERDUE yang diproses;
   * - denda sudah ada untuk (original_invoice, periode) -> dilewati.
   */
  async runDailyDenda(now = new Date()): Promise<LateFeeJobResult> {
    const period = monthPeriod(now);
    const rules = await this.store.listLateFeeRules(true);
    if (rules.length === 0) {
      return { period, checked: 0, created: 0, skipped: 0 };
    }

    // Segarkan status OVERDUE lebih dulu agar akurat.
    await this.paymentService.refreshOverdueStatuses(now);

    const overdueInvoices = await prisma.invoice.findMany({
      where: { status: "OVERDUE" },
      include: { payments: true }
    });

    // Batch lookup denda yang SUDAH ada (original_invoice_id + periode) dalam
    // SATU query — menggantikan findDendaInvoice per-invoice (N+1).
    const existingDendas = await prisma.dendaInvoice.findMany({
      where: { period, deleted_at: null },
      select: { original_invoice_id: true }
    });
    const existingDendaKeys = new Set(existingDendas.map((d) => d.original_invoice_id));

    // Basis nomor denda dihitung SEKALI (bukan listDendaInvoices per invoice).
    const dendaYearPrefix = `${DENDA_NO_PREFIX}-${now.getFullYear()}-`;
    let dendaSeq = await prisma.dendaInvoice.count({
      where: { invoice_no: { startsWith: dendaYearPrefix } }
    });

    let checked = 0;
    let created = 0;
    let skipped = 0;
    const toCreate: Array<{
      invoiceNo: string;
      originalInvoiceId: string;
      period: string;
      amount: Decimal;
      dueDate: Date;
      note: string;
      createdBy: string;
    }> = [];

    for (const invoice of overdueInvoices) {
      const rule = rules.find((r) => r.invoiceType === invoice.type);
      if (!rule) {
        skipped++;
        continue;
      }
      const daysLate = Math.floor((now.getTime() - invoice.due_date.getTime()) / 86_400_000);
      const paidSum = this.paymentService.paidSumOf(invoice);
      const totals = computeInvoiceTotals({
        amount: invoice.amount,
        discount: invoice.discount,
        paidSum,
        dueDate: invoice.due_date,
        now
      });
      if (totals.outstanding.lte(ZERO)) {
        skipped++;
        continue;
      }

      const fee = computeLateFee(
        {
          graceDays: rule.graceDays,
          feeType: rule.feeType,
          value: rule.value,
          maxAmount: rule.maxAmount
        },
        totals.outstanding,
        daysLate
      );
      if (fee.amount.lte(ZERO)) {
        skipped++;
        continue;
      }

      if (existingDendaKeys.has(invoice.id)) {
        skipped++;
        continue;
      }

      checked++;
      dendaSeq += 1;
      toCreate.push({
        invoiceNo: `${DENDA_NO_PREFIX}-${now.getFullYear()}-${String(dendaSeq).padStart(5, "0")}`,
        originalInvoiceId: invoice.id,
        period,
        amount: fee.amount,
        dueDate: new Date(now.getTime() + 14 * 86_400_000),
        note: `Denda keterlambatan ${rule.name} (${fee.chargeableDays} hari)`,
        createdBy: "system"
      });
      // Guard duplikat dalam run yang sama (dua invoice dengan sumber sama).
      existingDendaKeys.add(invoice.id);
    }

    // Batch create denda (createMany + skipDuplicates per original_invoice+period).
    if (toCreate.length > 0) {
      created = await this.store.createDendaInvoices(toCreate);
    }

    this.logger.log(`Denda ${period}: ${created} dibuat, ${skipped} dilewati`);
    return { period, checked, created, skipped };
  }

  /** Nomor denda: DEN-{tahun}-{urutan:5} (basis hitung existing di store). */
  async nextDendaNo(now = new Date()): Promise<string> {
    const year = now.getFullYear();
    const all = await this.store.listDendaInvoices();
    const yearDendas = all.filter((d) => d.invoiceNo.startsWith(`${DENDA_NO_PREFIX}-${year}-`));
    return `${DENDA_NO_PREFIX}-${year}-${String(yearDendas.length + 1).padStart(5, "0")}`;
  }

  /** Laporan denda aktif (opsional filter original invoice). */
  async listDendas(originalInvoiceId?: string) {
    return this.store.listDendaInvoices(originalInvoiceId);
  }
}
