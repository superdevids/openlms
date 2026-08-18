import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import { contextFromRequest } from "../lms/lms-context";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { RequirePermission } from "../../common/require-permission.decorator";
import { ExportService } from "./export.service";

/**
 * ExportController — baca/unduh hasil ekspor (DataExportLog).
 * RBAC guard: set gabungan agar PEMILIK log (mis. SISWA yang mengekspor
 * rapor sendiri, atau pemegang report:export:*) bisa lewat; autorisasi
 * sebenarnya (pemilik ATAU export:read:school) ditegakkan di
 * ExportService.getExportLog (row-level, defense-in-depth).
 */
@Controller("exports")
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(":id")
  @RequirePermission(
    "export:read:school",
    "report:export:school",
    "report:export:class",
    "report:export:self",
    "report:read:self"
  )
  getExportLog(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.exportService.getExportLog(id, contextFromRequest(req));
  }

  @Get(":id/download")
  @RequirePermission(
    "export:read:school",
    "report:export:school",
    "report:export:class",
    "report:export:self",
    "report:read:self"
  )
  async download(
    @Param("id") id: string,
    @Query("file") file: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<void> {
    const ctx = contextFromRequest(req);
    const log = await this.exportService.getExportLog(id, ctx);
    await this.exportService.download(log, res, file, ctx);
  }
}
