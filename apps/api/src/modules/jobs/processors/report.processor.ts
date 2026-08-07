import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@openlms/database";

/**
 * Payload job report.generate.
 * exportLogId: baris DataExportLog (dibuat REST sebelum job di-enqueue).
 */
export interface ReportGeneratePayload {
  exportLogId: string;
}

/**
 * ReportProcessor — generasi laporan/ekspor (DataExportLog: Dapodik/ANBK/RAPOR/NILAI).
 *
 * STATUS SKELETON: generator file (Excel/CSV) belum terpasang — dimiliki modul
 * Export. Processor ini hanya memastikan transisi status DataExportLog jujur
 * (PENDING → PROCESSING → FAILED dengan alasan jelas), tanpa mencatat
 * keberhasilan palsu. Bila REDIS/in-process digunakan, job gagal akan tercatat
 * di log queue; agent modul Export akan mengganti body generasi di sini.
 */
@Injectable()
export class ReportProcessor {
  private readonly logger = new Logger(ReportProcessor.name);

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
    if (log.status === "COMPLETED") {
      this.logger.log(`report.generate ${input.exportLogId}: sudah COMPLETED, dilewati`);
      return;
    }

    await prisma.dataExportLog.update({
      where: { id: log.id },
      data: { status: "PROCESSING", started_at: new Date() }
    });

    this.logger.warn(
      `report.generate ${input.exportLogId} (${log.export_type}): generator belum terpasang — diserahkan ke modul Export`
    );
    await prisma.dataExportLog.update({
      where: { id: log.id },
      data: { status: "FAILED", finished_at: new Date() }
    });
  }
}
