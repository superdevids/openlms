import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@openlms/database";
import { Decimal } from "@prisma/client/runtime/library";
import { money } from "../calculator/money";
import { endOfMonth, monthPeriod } from "../finance.constants";
import { InvoiceService } from "./invoice.service";

/**
 * SppSchedulerService — penjadwalan SPP bulanan otomatis (prd04 §5.F.1).
 * Job IDEMPOTEN per periode: kunci = student_id + period. Dijalankan ulang
 * tidak menduplikasi tagihan (cek eksistensi SPP periode tsb per siswa).
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

  constructor(private readonly invoiceService: InvoiceService) {}

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

    const targetYear = academicYear ?? String(new Date().getFullYear());
    const targetDue = dueDate ?? endOfMonth(targetPeriod);

    let generated = 0;
    let skipped = 0;
    for (const student of students) {
      if (existingStudentIds.has(student.id)) {
        skipped++;
        continue;
      }
      await this.invoiceService.create({
        studentId: student.id,
        type: "SPP",
        period: targetPeriod,
        amount: nominal,
        dueDate: targetDue,
        academicYear: targetYear,
        createdBy
      });
      generated++;
    }

    this.logger.log(`SPP ${targetPeriod}: ${generated} dibuat, ${skipped} dilewati (sudah ada)`);
    return {
      period: targetPeriod,
      generated,
      skipped,
      candidates: students.length
    };
  }
}
