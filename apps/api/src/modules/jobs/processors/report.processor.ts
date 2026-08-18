import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@opensis/database";
import { RaporExportService } from "../../export/rapor-export.service";
import { DapodikExportService } from "../../export/dapodik-export.service";

/**
 * Payload job report.generate.
 * exportLogId: baris DataExportLog (dibuat REST sebelum job di-enqueue).
 * params: parameter generasi per export_type (RAPOR: studentId/semester/
 * academicYear; DAPODIK: academicYear). Auth scope DIVERIFIKASI saat
 * enqueue — job tidak mengulang scope check.
 */
export interface ReportGeneratePayload {
  exportLogId: string;
  params?: Record<string, unknown>;
}

/**
 * ReportProcessor — dispatcher generasi laporan/ekspor (DataExportLog).
 * Alur: PENDING → PROCESSING (started_at) → switch export_type → generator
 * modul Export memperbarui COMPLETED (file_url) / FAILED (finished_at).
 * COMPLETED/PROCESSING dilewati (idempoten); export_type tak dikenal → FAILED.
 */
@Injectable()
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly raporExportService: RaporExportService,
    private readonly dapodikExportService: DapodikExportService
  ) {}

  async handle(payload: unknown): Promise<void> {
    const input = payload as ReportGeneratePayload;
    if (!input || !input.exportLogId) {
      this.logger.warn("report.generate: payload tidak lengkap (butuh exportLogId), dilewati");
      return;
    }

    const log = await prisma.dataExportLog.findUnique({ where: { id: input.exportLogId } });
    if (!log) {
      this.logger.warn(`report.generate: DataExportLog ${input.exportLogId} tidak ditemukan`);
      return;
    }
    // Idempoten: job yang sudah COMPLETED / sedang PROCESSING tidak diulang.
    if (log.status === "COMPLETED" || log.status === "PROCESSING") {
      this.logger.log(`report.generate ${input.exportLogId}: status ${log.status}, dilewati`);
      return;
    }

    await prisma.dataExportLog.update({
      where: { id: log.id },
      data: { status: "PROCESSING", started_at: new Date() }
    });

    const params = input.params ?? {};
    try {
      switch (log.export_type) {
        case "RAPOR":
          await this.raporExportService.generate(log, params);
          break;
        case "DAPODIK":
          await this.dapodikExportService.generate(log, params);
          break;
        case "NILAI":
          // Ekspor NILAI tetap sinkron via GradesController (grade-export.service);
          // via job belum didukung — gagal jujur agar tidak mencatat sukses palsu.
          throw new Error("export_type NILAI belum didukung via job report.generate");
        default:
          throw new Error(`export_type ${log.export_type} tidak didukung`);
      }
      this.logger.log(`report.generate ${input.exportLogId}: ${log.export_type} selesai`);
    } catch (err) {
      this.logger.error(
        `report.generate ${input.exportLogId} (${log.export_type}) gagal: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      await prisma.dataExportLog.update({
        where: { id: log.id },
        data: { status: "FAILED", finished_at: new Date() }
      });
      throw err;
    }
  }
}
