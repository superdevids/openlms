import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import { prisma } from "@opensis/database";
import { contextFromRequest } from "../lms/lms-context";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { RequirePermission } from "../../common/require-permission.decorator";
import { JOB_NAMES, QUEUE_TOKEN, type IJobQueue } from "../queue/queue.types";
import { ExportDapodikDto } from "./dto/export-dapodik.dto";

/**
 * DapodikController — ekspor data Dapodik (3 CSV) via job.
 * POST /dapodik/export: catat DataExportLog(DAPODIK, PENDING), enqueue
 * report.generate, respons { exportLogId, status, files }. File aktual
 * tersedia setelah COMPLETED lewat GET /exports/:id (file_url berisi 3 URL
 * comma-separated) dan GET /exports/:id/download?file=<nama>.
 * RBAC: export:run:school (KEPSEK/WAKEPSEK/OPERATOR/SUPERADMIN).
 */
@Controller("dapodik")
export class DapodikController {
  constructor(@Inject(QUEUE_TOKEN) private readonly queue: IJobQueue) {}

  @Post("export")
  @RequirePermission("export:run:school")
  async export(@Body() dto: ExportDapodikDto, @Req() req: AuthenticatedRequest) {
    const ctx = contextFromRequest(req);
    const log = await prisma.dataExportLog.create({
      data: {
        export_type: "DAPODIK",
        requested_by: ctx.userId,
        status: "PENDING"
      }
    });

    await this.queue.enqueue(JOB_NAMES.REPORT_GENERATE, {
      exportLogId: log.id,
      params: { academicYear: dto.academicYear ?? null }
    });

    // files diisi setelah job selesai (status COMPLETED) — UI memakai
    // GET /exports/:id lalu memecah file_url (comma-separated).
    return { exportLogId: log.id, status: "PENDING", files: [] };
  }
}
