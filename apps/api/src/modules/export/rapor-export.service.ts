import { Injectable, Logger } from "@nestjs/common";
import type { DataExportLog } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { prisma } from "@opensis/database";
import { RaporService } from "../rapor/rapor.service";
import { buildRaporPdf } from "../rapor/rapor-pdf";
import { resolveExportPath } from "../lms/grades/grade-export.service";

/**
 * RaporExportService — generator PDF rapor per siswa (e-Rapor v2).
 * Job report.generate (RAPOR) memanggil generate(log, params) setelah
 * scope check dilakukan saat enqueue; service hanya menyusun data via
 * RaporService.getRaporData (tanpa auth), membangun PDF, menulis ke
 * STORAGE_EXPORT_DIR (containment resolveExportPath), lalu memperbarui
 * DataExportLog → COMPLETED (file_url) / FAILED (finished_at).
 */
@Injectable()
export class RaporExportService {
  private readonly logger = new Logger(RaporExportService.name);
  private readonly exportDir: string;

  constructor(private readonly raporService: RaporService) {
    this.exportDir = process.env.STORAGE_EXPORT_DIR ?? join(process.cwd(), "storage", "exports");
    mkdirSync(this.exportDir, { recursive: true });
  }

  async generate(log: DataExportLog, params: Record<string, unknown>): Promise<void> {
    const studentId = String(params.studentId ?? "");
    const semester = String(params.semester ?? "GANJIL");
    const academicYear =
      typeof params.academicYear === "string" && params.academicYear.length > 0
        ? params.academicYear
        : undefined;

    try {
      if (!studentId) throw new Error("params.studentId wajib untuk ekspor rapor");
      const rapor = await this.raporService.getRaporData(studentId, { semester, academicYear });
      const school = await prisma.schoolProfile.findFirst({ select: { name: true } });

      const pdf = buildRaporPdf({ schoolName: school?.name ?? "", ...rapor });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `rapor_${stamp}.pdf`;
      const filePath = resolveExportPath(this.exportDir, filename);
      writeFileSync(filePath, pdf);

      await prisma.dataExportLog.update({
        where: { id: log.id },
        data: {
          status: "COMPLETED",
          file_url: `exports/${filename}`,
          record_count: rapor.mapels.length,
          finished_at: new Date()
        }
      });
      this.logger.log(`RaporExport ${log.id}: selesai (${filename}, ${rapor.mapels.length} mapel)`);
    } catch (err) {
      this.logger.error(
        `RaporExport ${log.id} gagal: ${err instanceof Error ? err.message : String(err)}`
      );
      await prisma.dataExportLog.update({
        where: { id: log.id },
        data: { status: "FAILED", finished_at: new Date() }
      });
      throw err;
    }
  }
}
