import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Invoice, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@opensis/database";
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
 * - Scope baca (SEC-002): aktor scope SEKOLAH (invoice:read:school) boleh baca
 *   semua; SISWA/WALI_MURID hanya tagihan milik sendiri/anak (ParentStudentLink).
 */

/** Aktor pemanggil invoice — subset RequestContext (auth.guard). */
export interface InvoiceActor {
  userId: string;
  roles: string[];
  classIds: string[];
}

/** Role dengan invoice:read:school (seed permissions.ts — SUPERADMIN/OPERATOR/KEUANGAN/WAKEPSEK/KEPSEK/AUDITOR). */
const INVOICE_SCHOOL_READ_ROLES = new Set([
  "SUPERADMIN",
  "OPERATOR",
  "KEUANGAN",
  "WAKEPSEK",
  "KEPSEK",
  "AUDITOR"
]);

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

/** Satu halaman hasil list invoice (pagination). */
export interface InvoiceListPage {
  items: Array<Invoice & { outstanding: Decimal; paidAmount: Decimal }>;
  total: number;
  page: number;
  pageSize: number;
}

/** Filter list invoice + pagination (page 1-based, pageSize default 20 max 100). */
export interface InvoiceListQuery {
  studentId?: string;
  type?: string;
  status?: string;
  period?: string;
  academicYear?: string;
  page?: number;
  pageSize?: number;
}

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

  /**
   * Buat massal per kelas/angkatan (prd04 §5.F.1).
   * @deprecated Gunakan createManyForStudents (batch createMany + validasi IN).
   * Dipertahankan hanya untuk kompatibilitas kontrak endpoint /invoices/bulk
   * yang mengembalikan Invoice[]; implementasi lama memanggil create() per
   * siswa (2 query per siswa = N+1). Sekarang mendelegasikan ke
   * createManyForStudents lalu membaca ulang baris yang dibuat (3 query tetap,
   * tidak bergantung jumlah siswa).
   */
  async createBulk(
    students: string[],
    base: Omit<CreateInvoiceInput, "studentId">
  ): Promise<Invoice[]> {
    if (students.length === 0) return [];
    if (base.type === "UANG_OSIS" || base.type === "DENDA") {
      throw new BadRequestException(
        `InvoiceType ${base.type} tidak didukung endpoint bulk (lihat create())`
      );
    }
    const startedAt = new Date();
    const createdCount = await this.createManyForStudents(students, base);
    if (createdCount === 0) return [];

    // Baca ulang baris yang baru dibuat (batas waktu panggilan + slice ke
    // jumlah yang benar-benar dibuat) — 1 query tambahan, bukan per siswa.
    const rows = await prisma.invoice.findMany({
      where: {
        student_id: { in: students },
        type: base.type,
        period: base.period ?? monthPeriod(base.dueDate),
        academic_year: base.academicYear,
        created_by: base.createdBy,
        created_at: { gte: startedAt }
      },
      orderBy: { created_at: "asc" }
    });
    return rows.slice(-createdCount);
  }

  /**
   * Buat banyak tagihan SEKALIGUS (createMany) — menggantikan loop create
   * serial (N+1) pada generasi SPP massal. Nomor invoice dihitung sekali
   * (hitung basis per tahun + indeks) agar unik; validasi siswa dilakukan
   * bulk (findMany IN). Return jumlah baris yang berhasil dibuat.
   */
  async createManyForStudents(
    students: string[],
    base: Omit<CreateInvoiceInput, "studentId">
  ): Promise<number> {
    if (students.length === 0) return 0;
    const amount = money(base.amount);
    if (amount.lte(0)) {
      throw new BadRequestException("amount harus lebih besar dari 0");
    }
    const discount = money(base.discount ?? 0);
    const period = base.period ?? monthPeriod(base.dueDate);

    // Validasi siswa aktif dalam SATU query (bukan findUnique per siswa).
    const found = await prisma.user.findMany({
      where: { id: { in: students }, is_active: true },
      select: { id: true }
    });
    const foundIds = new Set(found.map((u) => u.id));
    const valid = students.filter((id) => foundIds.has(id));
    if (valid.length === 0) return 0;

    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: { invoice_no: { startsWith: `${INVOICE_NO_PREFIX}-${year}-` } }
    });

    const data = valid.map((studentId, index) => ({
      student_id: studentId,
      invoice_no: `${INVOICE_NO_PREFIX}-${year}-${String(count + 1 + index).padStart(5, "0")}`,
      type: base.type,
      period,
      amount,
      discount,
      due_date: base.dueDate,
      academic_year: base.academicYear,
      created_by: base.createdBy
    }));

    const result = await prisma.invoice.createMany({ data });
    return result.count;
  }

  async findById(id: string, actor: InvoiceActor): Promise<InvoiceWithPayments> {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true }
    });
    if (!invoice) {
      throw new NotFoundException("Tagihan tidak ditemukan");
    }
    if (!this.isSchoolScoped(actor)) {
      const allowed = await this.resolveAllowedStudentIds(actor);
      if (!allowed.includes(invoice.student_id)) {
        throw new ForbiddenException({
          error: {
            code: "FORBIDDEN",
            message: "Anda tidak memiliki akses ke tagihan ini"
          }
        });
      }
    }
    return invoice;
  }

  /**
   * Daftar tagihan dengan pagination (prd04 §5.F.1).
   * Tanpa filter status: pagination di SQL (skip/take) + count — efisien.
   * Dengan filter status: status DERIVED dari pembayaran (computeInvoiceTotals),
   * tidak bisa dipaginasi/di-count di SQL, jadi ambil semua baris yang cocok
   * filter dasar lalu paginate + total dari hasil terfilter di memori.
   * Trade-off (didokumentasikan): request ber-filter status memuat semua baris
   * dasar tanpa limit; hanya terjadi saat klien memfilter status (jarang).
   */
  async list(query: InvoiceListQuery = {}, actor: InvoiceActor): Promise<InvoiceListPage> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where = await this.buildListWhere(query, actor);

    if (query.status) {
      const filtered = (await this.listAll(query, actor)).filter(
        (inv) => inv.status === query.status
      );
      return {
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
        page,
        pageSize
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { payments: true },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.invoice.count({ where })
    ]);

    return {
      items: this.enrich(invoices),
      total,
      page,
      pageSize
    };
  }

  /** Rekap status bulanan per siswa (prd04 §5.F.1) — agregasi penuh tanpa pagination. */
  async monthlySummary(
    period: string,
    actor: InvoiceActor
  ): Promise<{
    total: number;
    paid: number;
    partial: number;
    overdue: number;
    outstanding: Decimal;
  }> {
    const invoices = await this.listAll({ period }, actor);
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
    createdBy: string,
    actor: InvoiceActor
  ): Promise<Invoice> {
    const source = await this.findById(invoiceId, actor);
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

  /** Aktor scope SEKOLAH (punya invoice:read:school). */
  private isSchoolScoped(actor: InvoiceActor): boolean {
    return actor.roles.some((r) => INVOICE_SCHOOL_READ_ROLES.has(r));
  }

  /** Bangun where clause list dari filter + scope (SEC-002). */
  private async buildListWhere(
    query: InvoiceListQuery,
    actor: InvoiceActor
  ): Promise<Prisma.InvoiceWhereInput> {
    const schoolScoped = this.isSchoolScoped(actor);
    let studentFilter: { student_id: string } | { student_id: { in: string[] } } | undefined;
    if (schoolScoped) {
      if (query.studentId) studentFilter = { student_id: query.studentId };
    } else {
      // SISWA/WALI_MURID: paksa scope ke diri sendiri/anak (ParentStudentLink).
      const allowed = await this.resolveAllowedStudentIds(actor);
      if (query.studentId) {
        if (!allowed.includes(query.studentId)) {
          throw new ForbiddenException({
            error: {
              code: "FORBIDDEN",
              message: "Anda tidak memiliki akses ke tagihan siswa ini"
            }
          });
        }
        studentFilter = { student_id: query.studentId };
      } else {
        studentFilter = { student_id: { in: allowed } };
      }
    }

    return {
      ...(studentFilter ?? {}),
      ...(query.type ? { type: query.type as never } : {}),
      ...(query.period ? { period: query.period } : {}),
      ...(query.academicYear ? { academic_year: query.academicYear } : {})
    };
  }

  /** Semua baris yang cocok filter dasar (tanpa pagination) + enrichment status. */
  private async listAll(
    query: InvoiceListQuery,
    actor: InvoiceActor
  ): Promise<Array<Invoice & { outstanding: Decimal; paidAmount: Decimal }>> {
    const where = await this.buildListWhere(query, actor);
    const invoices = await prisma.invoice.findMany({
      where,
      include: { payments: true },
      orderBy: { created_at: "desc" }
    });
    return this.enrich(invoices);
  }

  /** Enrich invoice dengan paidAmount/outstanding (computeInvoiceTotals). */
  private enrich(
    invoices: InvoiceWithPayments[]
  ): Array<Invoice & { outstanding: Decimal; paidAmount: Decimal }> {
    return invoices.map((inv) => {
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
    });
  }

  /** Student id yang sah diakses aktor SENDIRI: diri sendiri (SISWA) + anak (WALI_MURID via ParentStudentLink). */
  private async resolveAllowedStudentIds(actor: InvoiceActor): Promise<string[]> {
    const allowed = new Set<string>();
    if (actor.roles.includes("SISWA")) {
      allowed.add(actor.userId);
    }
    if (actor.roles.includes("WALI_MURID")) {
      // Rv5-17 (SEC-001): hanya tautan APPROVED (allowlist OPERATOR) yang
      // memberi hak baca tagihan anak — PENDING/REJECTED tidak.
      const links = await prisma.parentStudentLink.findMany({
        where: { parent: { user_id: actor.userId }, status: "APPROVED" },
        select: { student_id: true }
      });
      for (const link of links) allowed.add(link.student_id);
    }
    return [...allowed];
  }
}
