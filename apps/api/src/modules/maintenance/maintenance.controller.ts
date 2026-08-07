import { Body, Controller, Get, Put, Req } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@prisma/client";
import { MaintenanceService, PublicSystemStatus } from "./maintenance.service";
import { UpdateMaintenanceDto } from "./dto/update-maintenance.dto";
import { Public } from "../../common/public.decorator";
import { Roles } from "../../common/roles.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * MaintenanceController — status sistem global (dev/maintenance mode).
 * - GET  /public/system-status        → publik, SELALU bekerja (allowlist middleware).
 * - GET  /admin/system/maintenance    → SUPERADMIN (system:status:read).
 * - PUT  /admin/system/maintenance    → SUPERADMIN (system:maintenance:write) + AuditLog.
 */
@Controller()
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get("public/system-status")
  @Public()
  getPublicStatus(): Promise<PublicSystemStatus> {
    return this.maintenanceService.getPublicStatus();
  }

  @Get("admin/system/maintenance")
  @Roles(Role.SUPERADMIN)
  @RequirePermission("system:status:read")
  getAdminStatus() {
    return this.maintenanceService.getStatus();
  }

  @Put("admin/system/maintenance")
  @Roles(Role.SUPERADMIN)
  @RequirePermission("system:maintenance:write")
  update(@Body() dto: UpdateMaintenanceDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.maintenanceService.update(dto, user.id, req.ip);
  }
}
