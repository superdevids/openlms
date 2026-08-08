import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { AuthModule } from "../auth/auth.module";
import { DashboardConfigController } from "./dashboard-config.controller";
import { DashboardConfigService } from "./dashboard-config.service";

/**
 * DashboardConfigModule — konfigurasi kartu dashboard per role (R-05/R-10).
 * Endpoint admin (SUPERADMIN) + GET /dashboard/me untuk semua role.
 * Memakai PermissionsResolver (AuthModule) untuk filter required_permission.
 */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DashboardConfigController],
  providers: [DashboardConfigService],
  exports: [DashboardConfigService]
})
export class DashboardConfigModule {}
