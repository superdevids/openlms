import { Controller, Get } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AdminStatsService, DashboardStatsView } from "./admin-stats.service";
import { RequirePermission } from "../../common/require-permission.decorator";
import { Roles } from "../../common/roles.decorator";

/**
 * AdminStatsController — statistik dashboard sekolah (R-06).
 * GET /admin/dashboard/stats: angka nyata dari database, hanya SUPERADMIN
 * dengan permission dashboard:read:school.
 */
@Controller("admin/dashboard")
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get("stats")
  @Roles(Role.SUPERADMIN)
  @RequirePermission("dashboard:read:school")
  getStats(): Promise<DashboardStatsView> {
    return this.adminStatsService.getDashboardStats();
  }
}
