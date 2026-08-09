import { Module } from "@nestjs/common";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

/**
 * MetricsModule — observability ringan (GET /metrics, SUPERADMIN).
 * Tanpa dependency npm baru; data dari process.* + setImmediate delta.
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService]
})
export class MetricsModule {}
