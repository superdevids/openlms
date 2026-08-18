import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { DataExportLog } from "@prisma/client";
import type { Response } from "express";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { mkdirSync } from "fs";
import { basename, extname, join } from "path";
import { prisma } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import { canAccess, PermissionsResolver } from "../auth/permissions-resolver";
import { resolveExportPath } from "../lms/grades/grade-export.service";
import { writeAudit } from "../lms/lms-audit";
import { EXTENSION_MIMETYPE } from "../storage/storage.constants";

/**
 * ExportService — baca/unduh DataExportLog dengan autorisasi:
 * - Ekspor PERSONAL (PII): HANYA pemilik (requested_by) atau SUPERADMIN
 *   (M-05) — pemegang export:read:school TIDAK boleh mengunduh bundle PII
 *   user lain.
 * - Ekspor lain (RAPOR/DAPODIK/NILAI): pemilik ATAU export:read:school.
 * download() men-stream file dari STORAGE_EXPORT_DIR dengan
 * Content-Disposition attachment (pola storage.controller serveFile) dan
 * mencatat AuditLog VIEW data_export_log.
 */
@Injectable()
export class ExportService {
  private readonly exportDir: string;

  constructor(private readonly permissionsResolver: PermissionsResolver) {
    this.exportDir = process.env.STORAGE_EXPORT_DIR ?? join(process.cwd(), "storage", "exports");
    mkdirSync(this.exportDir, { recursive: true });
  }

  /** Ambil log ekspor + autorisasi row-level (pemilik/SUPERADMIN untuk PERSONAL). */
  async getExportLog(id: string, ctx: RequestContext): Promise<DataExportLog> {
    const log = await prisma.dataExportLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException("Ekspor tidak ditemukan");

    // M-05: ekspor data pribadi (PERSONAL) hanya pemilik ATAU SUPERADMIN —
    // export:read:school (KEPSEK/WAKEPSEK/OPERATOR/AUDITOR/SUPERADMIN) tidak
    // otomatis berhak atas bundle PII user lain.
    if (log.export_type === "PERSONAL") {
      if (log.requested_by !== ctx.userId && !ctx.roles.includes("SUPERADMIN")) {
        throw new ForbiddenException("Akses ditolak: ekspor data pribadi");
      }
      return log;
    }

    if (log.requested_by !== ctx.userId) {
      const grants = await this.permissionsResolver.resolvePermissions(ctx.roles);
      const overrides = await this.permissionsResolver.resolveOverrides(ctx.userId);
      if (!canAccess("export:read:school", grants, overrides)) {
        throw new ForbiddenException("Akses ditolak: ekspor bukan milik Anda");
      }
    }
    return log;
  }

  /**
   * Stream file ekspor sebagai attachment. Log ekspor multi-file (Dapodik)
   * memakai param `filename` (basename, mis. "peserta_didik.csv") untuk
   * memilih salah satu; log satu-file tanpa param. Download dicatat ke
   * AuditLog (entity data_export_log, action VIEW) bila ctx diberikan.
   */
  async download(
    log: DataExportLog,
    res: Response,
    filename?: string,
    ctx?: RequestContext
  ): Promise<void> {
    const urls = (log.file_url ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      throw new NotFoundException("File ekspor belum tersedia");
    }

    let target: string;
    if (urls.length === 1) {
      target = urls[0] as string;
    } else {
      if (!filename) {
        throw new BadRequestException("Pilih file yang akan diunduh (param `file`).");
      }
      const match = urls.find((u) => basename(u) === filename);
      if (!match) throw new NotFoundException("File ekspor tidak ditemukan");
      target = match;
    }

    // file_url berbentuk "exports/<path>" — resolve relatif ke exportDir
    // dengan containment check (anti traversal).
    const relative = target.replace(/^exports[\\/]/, "");
    const filePath = resolveExportPath(this.exportDir, relative);

    const s = await stat(filePath);
    const ext = extname(filePath).toLowerCase();
    res.setHeader("Content-Type", EXTENSION_MIMETYPE[ext] ?? "application/octet-stream");
    res.setHeader("Content-Length", s.size);
    res.setHeader("Content-Disposition", `attachment; filename="${basename(relative)}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (ctx) {
      await writeAudit({
        ctx,
        action: "VIEW",
        entity: "data_export_log",
        entityId: log.id,
        after: { export_type: log.export_type, filename: basename(relative) }
      });
    }

    const stream = createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) res.status(404).end();
    });
    stream.pipe(res);
  }
}
