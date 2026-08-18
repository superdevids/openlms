import { Injectable, Logger } from "@nestjs/common";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { PrismaClient } from "@opensis/database";
import { writeAudit, type AuditActorContext } from "../lms/lms-audit";
import { resolveExportPath } from "../lms/grades/grade-export.service";
import {
  PDP_ANONYMIZE_PLACEHOLDER,
  PDP_AUDIT_ENTITY_REQUEST,
  PDP_EXPORT_TYPE
} from "./pdp.constants";

/**
 * PdpAnonymizeService — eksekusi penghapusan data pribadi (UU PDP).
 *
 * Saat permintaan DELETE di-approve:
 * - User dinonaktifkan (is_active=false) + PII diganti placeholder "[dihapus]".
 *   email/username di-null (kolom UNIQUE — placeholder sama untuk banyak user
 *   akan melanggar constraint); password_hash diganti nilai non-matching agar
 *   login tidak mungkin (lapisan kedua setelah is_active=false). avatar_url
 *   di-null (referensi file dibuang; file fisik tidak dihapus — cukup orphan).
 * - RefreshToken/Notification/UserPermissionOverride milik user dihapus.
 * - PII pada PpdbApplicant/ParentGuardian/Alumni/PdpRequest milik user
 *   dianonimisasi; data akademik (tahun lulus, grade, enrollment, consent,
 *   audit log, data export log) DIPERTAHANKAN — kepatuhan audit & riwayat.
 * - File ekspor PERSONAL (PII) milik user dihapus + file_url di-null
 *   (baris DataExportLog dipertahankan untuk audit).
 * - Audit DELETE entity "pdp_request" dicatat saat eksekusi.
 */
@Injectable()
export class PdpAnonymizeService {
  private readonly logger = new Logger(PdpAnonymizeService.name);
  private readonly exportDir: string;

  constructor(private readonly prisma: PrismaClient) {
    this.exportDir = process.env.STORAGE_EXPORT_DIR ?? join(process.cwd(), "storage", "exports");
  }

  async anonymizeUser(userId: string, pdpRequestId: string, ctx: AuditActorContext): Promise<void> {
    // Kumpulkan referensi ekspor PERSONAL SEBELUM transaksi — file dihapus
    // setelah referensi DB di-null agar file tidak "lolos" bila transaksi gagal.
    const personalExports = await this.prisma.dataExportLog.findMany({
      where: { requested_by: userId, export_type: PDP_EXPORT_TYPE },
      select: { id: true, file_url: true }
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          is_active: false,
          full_name: PDP_ANONYMIZE_PLACEHOLDER,
          phone: PDP_ANONYMIZE_PLACEHOLDER,
          avatar_url: null, // referensi file dibuang; file fisik tidak dihapus
          email: null,
          username: null,
          preferred_language: null,
          password_hash: "!" // non-matching Argon2 — login nonaktif
        }
      });
      await tx.refreshToken.deleteMany({ where: { user_id: userId } });
      await tx.notification.deleteMany({ where: { user_id: userId } });
      await tx.userPermissionOverride.deleteMany({ where: { user_id: userId } });

      // H1: anonimisasi PII pendaftar PPDB (documents JSON dibuang → []).
      await tx.ppdbApplicant.updateMany({
        where: { user_id: userId },
        data: {
          full_name: PDP_ANONYMIZE_PLACEHOLDER,
          nisn: PDP_ANONYMIZE_PLACEHOLDER,
          birth_place: PDP_ANONYMIZE_PLACEHOLDER,
          phone: PDP_ANONYMIZE_PLACEHOLDER,
          email: null,
          parent_name: PDP_ANONYMIZE_PLACEHOLDER,
          parent_phone: PDP_ANONYMIZE_PLACEHOLDER,
          documents: []
        }
      });

      // H1: anonimisasi PII orang tua/wali (schema tidak punya kolom address).
      await tx.parentGuardian.updateMany({
        where: { user_id: userId },
        data: {
          full_name: PDP_ANONYMIZE_PLACEHOLDER,
          phone: PDP_ANONYMIZE_PLACEHOLDER,
          email: null
        }
      });

      // H1: Alumni = data akademik legal — anonimisasi parsial: hapus NISN
      // (identitas), PERTAHANKAN tahun kelulusan (graduation_academic_year_id,
      // graduation_date) untuk statistik kelulusan.
      await tx.alumni.updateMany({
        where: { student_id: userId },
        data: { final_nisn: PDP_ANONYMIZE_PLACEHOLDER }
      });

      // H1: PdpRequest milik user — reason/processed_note bisa berisi PII.
      await tx.pdpRequest.updateMany({
        where: { user_id: userId },
        data: {
          reason: PDP_ANONYMIZE_PLACEHOLDER,
          processed_note: PDP_ANONYMIZE_PLACEHOLDER
        }
      });

      // M-03: null-kan file_url ekspor PERSONAL (baris log tetap untuk audit).
      // Batch updateMany (sebelumnya dataExportLog.update per baris = N+1).
      if (personalExports.length > 0) {
        await tx.dataExportLog.updateMany({
          where: { id: { in: personalExports.map((e) => e.id) } },
          data: { file_url: null }
        });
      }
    });

    // M-03: hapus file ekspor PDP (PII) setelah commit — best-effort;
    // kegagalan tidak menggagalkan anonimisasi (file jadi orphan → dibersihkan
    // storage-cleanup, dan file_url sudah null → download 404).
    for (const exp of personalExports) {
      if (exp.file_url) {
        await this.deleteExportFile(exp.file_url);
      }
    }

    await writeAudit({
      ctx,
      action: "DELETE",
      entity: PDP_AUDIT_ENTITY_REQUEST,
      entityId: pdpRequestId,
      after: { status: "EXECUTED", anonymized_user_id: userId }
    });
  }

  /** Hapus file ekspor relatif (containment check anti path traversal). */
  private async deleteExportFile(fileUrl: string): Promise<boolean> {
    try {
      const filename = fileUrl.replace(/^exports[\\/]/, "");
      const filePath = resolveExportPath(this.exportDir, filename);
      await unlink(filePath);
      return true;
    } catch (err) {
      this.logger.warn(`hapus file ekspor PDP gagal: ${fileUrl} — ${(err as Error).message}`);
      return false;
    }
  }
}
