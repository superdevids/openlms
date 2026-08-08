import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { QueueModule } from "../queue/queue.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PayrollModule } from "../payroll/payroll.module";
import { RolloverModule } from "../rollover/rollover.module";
import { FinanceModule } from "../finance/finance.module";
import { ExamModule } from "../exam/exam.module";
import { QuizModule } from "../quiz/quiz.module";
import { StorageModule } from "../storage/storage.module";
import { OnboardingModule } from "../onboarding/onboarding.module";
import { JobsService } from "./jobs.service";
import { NotificationsProcessor } from "./processors/notifications.processor";
import { PayrollProcessor } from "./processors/payroll.processor";
import { RolloverProcessor } from "./processors/rollover.processor";
import { ReportProcessor } from "./processors/report.processor";
import { SppProcessor } from "./processors/spp.processor";
import { ExamAutoSubmitProcessor } from "./processors/exam-autosubmit.processor";
import { StorageCleanupProcessor } from "./processors/storage-cleanup.processor";
import { ImportProcessor } from "./processors/import.processor";

/**
 * JobsModule — antrean job + cron (@nestjs/schedule).
 * - QueueModule (global) menyediakan IJobQueue (BullMQ bila REDIS_URL, else in-process).
 * - SPP bulanan dijadwalkan @Cron di SppProcessor; enqueue dengan period
 *   sebagai idempotency key.
 * - Auto-submit attempt ujian/kuis tiap menit (G-05) di ExamAutoSubmitProcessor
 *   dengan guard per-instance (BullMQ jobId tetap / boolean in-process).
 * - Export JobsService untuk modul domain yang ingin enqueue job.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    QueueModule,
    NotificationsModule,
    PayrollModule,
    RolloverModule,
    FinanceModule,
    ExamModule,
    QuizModule,
    StorageModule,
    OnboardingModule
  ],
  providers: [
    JobsService,
    NotificationsProcessor,
    PayrollProcessor,
    RolloverProcessor,
    ReportProcessor,
    SppProcessor,
    ExamAutoSubmitProcessor,
    StorageCleanupProcessor,
    ImportProcessor
  ],
  exports: [JobsService]
})
export class JobsModule {}
