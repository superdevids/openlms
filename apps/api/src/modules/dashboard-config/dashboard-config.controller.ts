import { Body, Controller, Get, Param, ParseEnumPipe, Put, Req } from "@nestjs/common";
import { Role } from "@prisma/client";
import {
  DashboardConfigService,
  DashboardConfigView,
  DashboardCardView
} from "./dashboard-config.service";
import { UpdateDashboardConfigDto } from "./dto/update-dashboard-config.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { Roles } from "../../common/roles.decorator";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import type { AuditActorContext } from "../lms/lms-audit";

/**
 * DashboardConfigController — konfigurasi kartu dashboard per role (R-05/R-10).
 * - GET /admin/dashboard-config (SUPERADMIN, dashboard:read:school)
 * - PUT /admin/dashboard-config/:role (SUPERADMIN, dashboard:write:school)
 * - GET /dashboard/me (semua role aktif; kartu difilter required_permission)
 */
@Controller()
export class DashboardConfigController {
  constructor(private readonly dashboardConfigService: DashboardConfigService) {}

  @Get("admin/dashboard-config")
  @Roles(Role.SUPERADMIN)
  @RequirePermission("dashboard:read:school")
  getAdminConfigs(): Promise<DashboardConfigView[]> {
    return this.dashboardConfigService.getAdminConfigs();
  }

  @Put("admin/dashboard-config/:role")
  @Roles(Role.SUPERADMIN)
  @RequirePermission("dashboard:write:school")
  updateRoleConfig(
    @Param("role", new ParseEnumPipe(Role)) role: Role,
    @Body() dto: UpdateDashboardConfigDto,
    @Req() req: AuthenticatedRequest
  ): Promise<DashboardConfigView[]> {
    return this.dashboardConfigService.updateRoleConfig(role, dto, this.actorContext(req), req.ip);
  }

  @Get("dashboard/me")
  @RequirePermission("dashboard:read:self")
  getMyCards(@Req() req: AuthenticatedRequest): Promise<DashboardCardView[]> {
    const ctx = req.requestContext;
    if (!ctx) {
      return Promise.resolve([]);
    }
    return this.dashboardConfigService.getMyCards(ctx.userId, ctx.roles);
  }

  private actorContext(req: AuthenticatedRequest): AuditActorContext {
    const ctx = req.requestContext;
    if (!ctx) {
      return { userId: "system", roles: [] };
    }
    return { userId: ctx.userId, roles: ctx.roles };
  }
}
