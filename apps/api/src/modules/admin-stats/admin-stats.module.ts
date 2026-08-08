import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { AdminStatsController } from "./admin-stats.controller";
import { AdminStatsService } from "./admin-stats.service";

/**
 * AdminStatsModule — statistik dashboard (R-06).
 * Menyediakan GET /admin/dashboard/stats (dashboard:read:school, SUPERADMIN).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [AdminStatsController],
  providers: [AdminStatsService],
  exports: [AdminStatsService]
})
export class AdminStatsModule {}
