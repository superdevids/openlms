import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { ImportService } from "./import.service";
import { ImportRowsDto } from "./dto/import.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * Endpoint impor data — /app/import (prd04 §9.2, 03-database-erd §4.10/4.11).
 */
@Controller("app/import")
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get("templates")
  @RequirePermission("import:preview:school")
  templates() {
    return this.importService.getTemplates();
  }

  @Post("preview")
  @RequirePermission("import:preview:school")
  preview(@Body() dto: ImportRowsDto) {
    return this.importService.preview(dto);
  }

  @Post("run")
  @RequirePermission("import:run:school")
  run(@Body() dto: ImportRowsDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.importService.run(dto, user.id, req.ip);
  }

  @Get("batches")
  @RequirePermission("import:run:school")
  batches(@Query("limit") limit?: string) {
    const parsed = Number(limit);
    return this.importService.listBatches(Number.isInteger(parsed) && parsed > 0 ? parsed : 20);
  }
}
