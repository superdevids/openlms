import { Injectable, Logger } from "@nestjs/common";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@opensis/database";
import { writeAudit } from "../lms/lms-audit";
import { resolveExportPath } from "../lms/grades/grade-export.service";
import {
  PDP_ANONYMIZE_PLACEHOLDER,
  PDP_AUDIT_ENTITY_RETENTION_JOB,
  PDP_EXPORT_TYPE,
  PERSONAL_EXPORT_RETENTION_MONTHS,
  RETENTION_ENTITIES
} from "./pdp.constants";

/** Hasil satu run retensi — ringkasan count per entity/aksi. */
export interface RetentionRunResult {
  summary: Record<string, number>;
  processed: number;
}

type RetentionTargetModel = (typeof RETENTION_ENTITIES)[number];

/**
 * PdpRetentionService — job retensi data (UU PDP, G12).
 * Membaca DataRetentionPolicy enabled=true; per entity:
 * - DELETE → deleteMany where created_at < now - retentionMonths
 *   (Notification, ExamAnswerLog, Attendance, AttendanceRecord)
 * - ANONYMIZE → updateMany kolom teks → placeholder "[dihapus]"
 *   (CounselingNote — catatan BK TIDAK pernah di-hard-delete)
 * - ARCHIVE → log warning (belum diimplementasikan)
 * Semua operasi delete/anonymize diputuskan dalam satu metode processPolicy
 * (case per entity eksplisit) agar perilaku tiap entity tidak terduplikasi.
 * Ringkasan count dicatat ke AuditLog entity "retention_job" (aktor sistem).
 */
@Injectable()
export class PdpRetentionService {
  private readonly logger = new Logger(PdpRetentionService.name);
  private readonly exportDir: string;

  constructor(private readonly prisma: PrismaClient) {
    this.exportDir = process.env.STORAGE_EXPORT_DIR ?? join(process.cwd(), "storage", "exports");
  }

  async run(): Promise<RetentionRunResult> {
    const policies = await this.prisma.dataRetentionPolicy.findMany({
      where: { enabled: true },
      orderBy: { entity: "asc" }
    });

    const summary: Record<string, number> = {};
    let processed = 0;

    for (const policy of policies) {
      const entity = policy.entity as RetentionTargetModel;
      if (!RETENTION_ENTITIES.includes(entity)) {
        this.logger.warn(`retensi: entity tidak dikenal, dilewati: ${policy.entity}`);
        continue;
      }
      const cutoff = new Date(Date.now() - policy.retention_months * 30 * 24 * 60 * 60 * 1000);

      if (policy.action === "DELETE") {
        const count = await this.processPolicy(entity, "DELETE", cutoff);
        summary[`${entity}.deleted`] = count;
        processed += count;
      } else if (policy.action === "ANONYMIZE") {
        const count = await this.processPolicy(entity, "ANONYMIZE", cutoff);
        summary[`${entity}.anonymized`] = count;
        processed += count;
      } else {
        // ARCHIVE belum diimplementasikan — dicatat agar tidak senyap.
        this.logger.warn(`retensi: ARCHIVE belum diimplementasikan untuk ${entity}`);
        summary[`${entity}.archived`] = 0;
      }
    }

    // M-07: retensi file ekspor PERSONAL (PII) — 3 bulan hardcode (tanpa
    // migrasi). Baris DataExportLog DIPERTAHANKAN untuk audit; file dihapus +
    // file_url di-null (downloadMyExport → 404).
    const personalCutoff = new Date(
      Date.now() - PERSONAL_EXPORT_RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000
    );
    const expiredExports = await this.prisma.dataExportLog.findMany({
      where: {
        export_type: PDP_EXPORT_TYPE,
        file_url: { not: null },
        created_at: { lt: personalCutoff }
      },
      select: { id: true, file_url: true }
    });
    let personalExpired = 0;
    // Hapus file tetap per item (IO); referensi DB di-null SEKALI (updateMany).
    for (const exp of expiredExports) {
      if (exp.file_url) {
        await this.deleteExportFile(exp.file_url);
      }
      personalExpired += 1;
    }
    if (expiredExports.length > 0) {
      await this.prisma.dataExportLog.updateMany({
        where: { id: { in: expiredExports.map((e) => e.id) } },
        data: { file_url: null }
      });
    }
    summary["DataExportLog.personal_expired"] = personalExpired;
    processed += personalExpired;

    await writeAudit({
      ctx: { userId: "system", roles: [] },
      action: "CREATE",
      entity: PDP_AUDIT_ENTITY_RETENTION_JOB,
      entityId: new Date().toISOString(),
      after: summary
    });

    this.logger.log(`retensi selesai: ${JSON.stringify(summary)}`);
    return { summary, processed };
  }

  /**
   * Proses satu entity terhadap kebijakan retensi — case per entity EKSPLISIT:
   * - Notification/ExamAnswerLog/Attendance/AttendanceRecord → DELETE: deleteMany;
   *   action lain belum didukung → warning + 0.
   * - CounselingNote → updateMany placeholder ANONYMIZE. Catatan BK TIDAK
   *   di-hard-delete (keputusan desain): riwayat konseling dipertahankan demi
   *   kepentingan anak; hanya kolom teks yang dianonimisasi. Berlaku juga bila
   *   kebijakan meminta DELETE — di-degrade ke anonimisasi.
   */
  private async processPolicy(
    entity: RetentionTargetModel,
    action: "DELETE" | "ANONYMIZE" | "ARCHIVE",
    cutoff: Date
  ): Promise<number> {
    switch (entity) {
      case "Notification":
        return action === "DELETE"
          ? (await this.prisma.notification.deleteMany({ where: { created_at: { lt: cutoff } } }))
              .count
          : this.unsupported(entity, action);
      case "ExamAnswerLog":
        return action === "DELETE"
          ? (await this.prisma.examAnswerLog.deleteMany({ where: { created_at: { lt: cutoff } } }))
              .count
          : this.unsupported(entity, action);
      case "Attendance":
        return action === "DELETE"
          ? (await this.prisma.attendance.deleteMany({ where: { created_at: { lt: cutoff } } }))
              .count
          : this.unsupported(entity, action);
      case "AttendanceRecord":
        return action === "DELETE"
          ? (
              await this.prisma.attendanceRecord.deleteMany({
                where: { created_at: { lt: cutoff } }
              })
            ).count
          : this.unsupported(entity, action);
      case "CounselingNote":
        if (action === "DELETE") {
          this.logger.warn("retensi: CounselingNote tidak di-hard-delete; kolom dianonimisasi");
        }
        return (
          await this.prisma.counselingNote.updateMany({
            where: { created_at: { lt: cutoff } },
            data: {
              topic: PDP_ANONYMIZE_PLACEHOLDER,
              note: PDP_ANONYMIZE_PLACEHOLDER,
              follow_up: PDP_ANONYMIZE_PLACEHOLDER
            }
          })
        ).count;
    }
  }

  private unsupported(entity: string, action: string): number {
    this.logger.warn(`retensi: ${action} belum didukung untuk ${entity}`);
    return 0;
  }

  /** Hapus file ekspor relatif (containment check anti path traversal). */
  private async deleteExportFile(fileUrl: string): Promise<boolean> {
    try {
      const filename = fileUrl.replace(/^exports[\\/]/, "");
      const filePath = resolveExportPath(this.exportDir, filename);
      await unlink(filePath);
      return true;
    } catch (err) {
      this.logger.warn(`hapus file ekspor PERSONAL gagal: ${fileUrl} — ${(err as Error).message}`);
      return false;
    }
  }
}
