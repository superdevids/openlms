import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@opensis/database";
import { Decimal } from "@prisma/client/runtime/library";
import { money } from "../calculator/money";
import { endOfMonth, INVOICE_NO_PREFIX, monthPeriod } from "../finance.constants";

/**
 * SppSchedulerService — penjadwalan SPP bulanan otomatis (prd04 §5.F.1).
 * Job IDEMPOTEN per periode: kunci = student_id + period. Dijalankan ulang
 * tidak menduplikasi tagihan (cek eksistensi SPP periode tsb per siswa +
 * unique (student_id, type, period) di schema + skipDuplicates saat insert).
 */

export interface SppSchedulerResult {
  period: string;
  generated: number;
  skipped: number;
  /** jumlah siswa aktif (role SISWA) yang menjadi kandidat */
  candidates: number;
}

@Injectable()
export class SppSchedulerService {
  private readonly logger = new Logger(SppSchedulerService.name);

  /**
   * Generate tagihan SPP bulanan untuk seluruh siswa aktif.
   * @param period periode "YYYY-MM" (default bulan berjalan)
   * @param amount nominal SPP (dari template/config; wajib saat panggil manual)
   * @param dueDate tanggal jatuh tempo (default akhir bulan periode)
   */
  async generateSpp(
    period: string,
    amount: Decimal | number | string,
    dueDate?: Date,
    academicYear?: string,
    createdBy = "system"
  ): Promise<SppSchedulerResult> {
    const targetPeriod = period ?? monthPeriod(new Date());
    const nominal = money(amount);
    if (nominal.lte(0)) {
      return { period: targetPeriod, generated: 0, skipped: 0, candidates: 0 };
    }

    // Siswa aktif = user dengan role SISWA yang statusnya ACTIVE.
    const students = await prisma.user.findMany({
      where: {
        is_active: true,
        roles: { some: { role: "SISWA", status: "ACTIVE" } }
      },
      select: { id: true }
    });

    const existing = await prisma.invoice.findMany({
      where: { type: "SPP", period: targetPeriod },
      select: { student_id: true }
    });
    const existingStudentIds = new Set(existing.map((e) => e.student_id));
    const missing = students.filter((s) => !existingStudentIds.has(s.id));

    const targetYear = academicYear ?? String(new Date().getFullYear());
    const targetDue = dueDate ?? endOfMonth(targetPeriod);

    // Batch create (bukan loop create serial) — satu createMany untuk seluruh
    // siswa yang belum punya tagihan SPP periode ini. skipDuplicates: true
    // adalah jaring pengaman race (scheduler paralel / jalur tulis lain) —
    // baris yang melanggar unique (student_id, type, period) atau invoice_no
    // di-skip oleh Postgres; generated dihitung dari result.count, bukan
    // panjang array input.
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: { invoice_no: { startsWith: `${INVOICE_NO_PREFIX}-${year}-` } }
    });
    const data = missing.map((student, index) => ({
      student_id: student.id,
      invoice_no: `${INVOICE_NO_PREFIX}-${year}-${String(count + 1 + index).padStart(5, "0")}`,
      type: "SPP" as const,
      period: targetPeriod,
      amount: nominal,
      discount: new Decimal(0),
      due_date: targetDue,
      academic_year: targetYear,
      created_by: createdBy
    }));
    const generated = data.length
      ? (await prisma.invoice.createMany({ data, skipDuplicates: true })).count
      : 0;
    const skipped = students.length - generated;

    this.logger.log(`SPP ${targetPeriod}: ${generated} dibuat, ${skipped} dilewati (sudah ada)`);
    return {
      period: targetPeriod,
      generated,
      skipped,
      candidates: students.length
    };
  }
}
