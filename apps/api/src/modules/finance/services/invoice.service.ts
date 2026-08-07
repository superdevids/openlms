import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Invoice, PaymentStatus } from "@prisma/client";
import { prisma } from "@openlms/database";
import { Decimal } from "@prisma/client/runtime/library";
import { computeInvoiceTotals } from "../calculator/invoice-status";
import { money } from "../calculator/money";
import { INVOICE_NO_PREFIX, monthPeriod } from "../finance.constants";
import { FinanceInvoiceType } from "../finance.types";
import { isBlank } from "../dto/finance.dto";

/**
 * InvoiceService — tagihan (prd04 §5.F.1). Prisma-backed (model Invoice ada).
 * - invoice_no unik per sekolah, format INV-{tahun}-{urutan:5}.
 * - status dihitung dari total pembayaran terverifikasi (PENDING/PARTIAL/PAID/OVERDUE/CARRIED_OVER).
 * - carry-over: tagihan lama dipindah ke tahun ajaran baru (original_invoice_id).
 */

export interface CreateInvoiceInput {
  studentId: string;
  type: FinanceInvoiceType;
  period?: string;
  amount: Decimal | number | string;
  discount?: Decimal | number | string;
  dueDate: Date;
  academicYear: string;
  note?: string;
  createdBy: string;
}

/** Invoice + pembayaran (hasil include Prisma). */
export type InvoiceWithPayments = Invoice & {
  payments: Array<{ status: PaymentStatus; amount: Decimal }>;
};

@Injectable()
export class InvoiceService {
  /** Generate invoice_no unik: INV-2026-00001 (berbasis hitung tahun berjalan). */
  async nextInvoiceNo(now = new Date()): Promise<string> {
    const year = now.getFullYear();
    const count = await prisma.invoice.count({
      where: { invoice_no: { startsWith: `${INVOICE_NO_PREFIX}-${year}-` } }
    });
    return `${INVOICE_NO_PREFIX}-${year}-${String(count + 1).padStart(5, "0")}`;
  }

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    if (isBlank(input.studentId)) {
      throw new BadRequestException("studentId wajib diisi");
    }
    if (input.type === "UANG_OSIS" || input.type === "DENDA") {
      // Enum InvoiceType schema.prisma belum memuat UANG_OSIS/DENDA (ISSUES).
      // Persistence via FinanceStore adapter (PrismaFinanceStore) setelah skema
      // ditambah oleh integration coder; untuk sekarang ditolak dengan jelas.
      throw new BadRequestException(
        `InvoiceType ${input.type} belum tersedia di schema (UANG_OSIS/DENDA menyusul)`
      );
    }
    const student = await prisma.user.findUnique({ where: { id: input.studentId } });
    if (!student) {
      throw new NotFoundException("Siswa tidak ditemukan");
    }
    const invoiceNo = await this.nextInvoiceNo();
    const amount = money(input.amount);
    if (amount.lte(0)) {
      throw new BadRequestException("amount harus lebih besar dari 0");
    }
    const discount = money(input.discount ?? 0);
    const period = input.period ?? monthPeriod(input.dueDate);

    return prisma.invoice.create({
      data: {
        student_id: input.studentId,
        invoice_no: invoiceNo,
        type: input.type,
        period,
        amount,
        discount,
        due_date: input.dueDate,
        academic_year: input.academicYear,
        created_by: input.createdBy
      }
    });
  }

  /** Buat massal per kelas/angkatan (prd04 §5.F.1). */
  async createBulk(
    students: string[],
    base: Omit<CreateInvoiceInput, "studentId">
  ): Promise<Invoice[]> {
    const results: Invoice[] = [];
    for (const studentId of students) {
      results.push(await this.create({ ...base, studentId }));
    }
    return results;
  }

  async findById(id: string): Promise<InvoiceWithPayments> {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true }
    });
    if (!invoice) {
      throw new NotFoundException("Tagihan tidak ditemukan");
    }
    return invoice;
  }

  async list(
    query: {
      studentId?: string;
      type?: string;
      status?: string;
      period?: string;
      academicYear?: string;
    } = {}
  ): Promise<Array<Invoice & { outstanding: Decimal; paidAmount: Decimal }>> {
    const invoices = await prisma.invoice.findMany({
      where: {
        ...(query.studentId ? { student_id: query.studentId } : {}),
        ...(query.type ? { type: query.type as never } : {}),
        ...(query.period ? { period: query.period } : {}),
        ...(query.academicYear ? { academic_year: query.academicYear } : {})
      },
      include: { payments: true },
      orderBy: { created_at: "desc" }
    });

    return invoices
      .map((inv) => {
        const paidAmount = inv.payments
          .filter((p) => p.status === "PAID")
          .reduce((sum, p) => sum.plus(p.amount), new Decimal(0));
        const totals = computeInvoiceTotals({
          amount: inv.amount,
          discount: inv.discount,
          paidSum: paidAmount,
          dueDate: inv.due_date,
          now: new Date()
        });
        return {
          ...inv,
          paidAmount: totals.paidAmount,
          outstanding: totals.outstanding
        };
      })
      .filter((inv) => (query.status ? inv.status === query.status : true));
  }

  /** Rekap status bulanan per siswa (prd04 §5.F.1). */
  async monthlySummary(period: string): Promise<{
    total: number;
    paid: number;
    partial: number;
    overdue: number;
    outstanding: Decimal;
  }> {
    const invoices = await this.list({ period });
    const outstanding = invoices.reduce((s, i) => s.plus(i.outstanding), new Decimal(0));
    return {
      total: invoices.length,
      paid: invoices.filter((i) => i.status === "PAID").length,
      partial: invoices.filter((i) => i.status === "PARTIAL").length,
      overdue: invoices.filter((i) => i.status === "OVERDUE").length,
      outstanding
    };
  }

  /**
   * Carry-over: tandai tagihan lama CARRIED_OVER dan buat tagihan baru yang
   * menyalin sisa (outstanding) ke tahun ajaran baru (prd04 §5.R, Invoice.
   * original_invoice_id). Idempoten: bila sudah ada tagihan carry dari sumber,
   * dilewati.
   */
  async carryOver(
    invoiceId: string,
    targetAcademicYear: string,
    createdBy: string
  ): Promise<Invoice> {
    const source = await this.findById(invoiceId);
    const existing = await prisma.invoice.findFirst({
      where: { original_invoice_id: source.id, academic_year: targetAcademicYear }
    });
    if (existing) {
      return existing;
    }

    const paidAmount = source.payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum.plus(p.amount), new Decimal(0));
    const totals = computeInvoiceTotals({
      amount: source.amount,
      discount: source.discount,
      paidSum: paidAmount,
      dueDate: source.due_date,
      now: new Date()
    });

    const carried = await prisma.$transaction([
      prisma.invoice.update({
        where: { id: source.id },
        data: {
          status: "CARRIED_OVER",
          carried_to_academic_year: targetAcademicYear,
          carry_over_note: `Sisa Rp${totals.outstanding} dibawa ke ${targetAcademicYear}`
        }
      }),
      prisma.invoice.create({
        data: {
          student_id: source.student_id,
          invoice_no: await this.nextInvoiceNo(),
          type: source.type,
          period: source.period,
          amount: totals.outstanding,
          discount: 0,
          due_date: source.due_date,
          academic_year: targetAcademicYear,
          original_invoice_id: source.id,
          created_by: createdBy
        }
      })
    ]);
    return carried[1];
  }

  /** Hapus tagihan (mis. salah input) — dicatat AuditLog. */
  async remove(id: string, actorId: string): Promise<void> {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException("Tagihan tidak ditemukan");
    }
    await prisma.$transaction([
      prisma.invoice.delete({ where: { id } }),
      prisma.auditLog.create({
        data: {
          actor_id: actorId,
          action: "DELETE",
          entity: "Invoice",
          entity_id: id,
          after: { invoice_no: invoice.invoice_no }
        }
      })
    ]);
  }
}
