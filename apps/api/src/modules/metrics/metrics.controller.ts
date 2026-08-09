import { Controller, Get, Header } from "@nestjs/common";
import { Role } from "@prisma/client";
import { MetricsService, MetricsView } from "./metrics.service";
import { RequirePermission } from "../../common/require-permission.decorator";
import { Roles } from "../../common/roles.decorator";

/**
 * MetricsController — observability proses (R-obs).
 * GET /metrics: metrik runtime (uptime, memori, event loop lag), hanya
 * SUPERADMIN dengan permission system:status:read (fail-closed RBAC).
 */
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Roles(Role.SUPERADMIN)
  @RequirePermission("system:status:read")
  @Header("Cache-Control", "no-store")
  getMetrics(): Promise<MetricsView> {
    return this.metricsService.collect();
  }
}
