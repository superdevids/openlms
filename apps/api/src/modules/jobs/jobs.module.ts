import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { QueueModule } from "../queue/queue.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PayrollModule } from "../payroll/payroll.module";
import { RolloverModule } from "../rollover/rollover.module";
import { FinanceModule } from "../finance/finance.module";
import { JobsService } from "./jobs.service";
import { NotificationsProcessor } from "./processors/notifications.processor";
import { PayrollProcessor } from "./processors/payroll.processor";
import { RolloverProcessor } from "./processors/rollover.processor";
import { ReportProcessor } from "./processors/report.processor";
import { SppProcessor } from "./processors/spp.processor";

/**
 * JobsModule — antrean job + cron (@nestjs/schedule).
 * - QueueModule (global) menyediakan IJobQueue (BullMQ bila REDIS_URL, else in-process).
 * - SPP bulanan dijadwalkan @Cron di SppProcessor; enqueue dengan period
 *   sebagai idempotency key.
 * - Export JobsService untuk modul domain yang ingin enqueue job.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    QueueModule,
    NotificationsModule,
    PayrollModule,
    RolloverModule,
    FinanceModule
  ],
  providers: [
    JobsService,
    NotificationsProcessor,
    PayrollProcessor,
    RolloverProcessor,
    ReportProcessor,
    SppProcessor
  ],
  exports: [JobsService]
})
export class JobsModule {}
