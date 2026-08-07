import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { JOB_NAMES, QUEUE_TOKEN, type IJobQueue } from "../queue/queue.types";
import { NotificationsProcessor } from "./processors/notifications.processor";
import { PayrollProcessor } from "./processors/payroll.processor";
import { RolloverProcessor } from "./processors/rollover.processor";
import { ReportProcessor } from "./processors/report.processor";
import { SppProcessor } from "./processors/spp.processor";

/**
 * JobsService — registrasi handler job + helper enqueue bertipe.
 * onModuleInit mendaftarkan semua processor ke queue (in-process atau BullMQ);
 * modul domain memanggil helper di sini (bukan langsung queue) agar nama job
 * terkonsentrasi dan payload tetap tervalidasi.
 */
@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(QUEUE_TOKEN) private readonly queue: IJobQueue,
    private readonly notifications: NotificationsProcessor,
    private readonly payroll: PayrollProcessor,
    private readonly rollover: RolloverProcessor,
    private readonly report: ReportProcessor,
    private readonly spp: SppProcessor
  ) {}

  onModuleInit(): void {
    this.queue.registerHandler(JOB_NAMES.NOTIFICATIONS_FANOUT, (p) => this.notifications.handle(p));
    this.queue.registerHandler(JOB_NAMES.PAYROLL_RUN, (p) => this.payroll.handle(p));
    this.queue.registerHandler(JOB_NAMES.ROLLOVER_EXECUTE, (p) => this.rollover.handle(p));
    this.queue.registerHandler(JOB_NAMES.REPORT_GENERATE, (p) => this.report.handle(p));
    this.queue.registerHandler(JOB_NAMES.SPP_GENERATE, (p) => this.spp.handle(p));
    this.logger.log(
      `JobsService siap — queue ${this.queue.isReady() ? "READY" : "NOT_READY"} (${
        this.queue.constructor.name
      })`
    );
  }

  // ---------- Helper enqueue (modul domain) ----------

  async fanoutNotifications(
    payload: Parameters<NotificationsProcessor["handle"]>[0]
  ): Promise<void> {
    await this.queue.enqueue(JOB_NAMES.NOTIFICATIONS_FANOUT, payload);
  }

  async runPayroll(payload: { period?: string; createdBy: string; note?: string }): Promise<void> {
    await this.queue.enqueue(JOB_NAMES.PAYROLL_RUN, payload);
  }

  async executeRollover(payload: {
    runId: string;
    idempotencyKey: string;
    actorId: string;
  }): Promise<void> {
    await this.queue.enqueue(JOB_NAMES.ROLLOVER_EXECUTE, payload, {
      jobId: `${JOB_NAMES.ROLLOVER_EXECUTE}:${payload.idempotencyKey}`
    });
  }

  async generateReport(payload: { exportLogId: string }): Promise<void> {
    await this.queue.enqueue(JOB_NAMES.REPORT_GENERATE, payload);
  }

  async generateSpp(payload: {
    period: string;
    amount?: string | number;
    dueDate?: string;
    academicYear?: string;
    createdBy?: string;
  }): Promise<void> {
    await this.queue.enqueue(JOB_NAMES.SPP_GENERATE, payload, {
      jobId: `${JOB_NAMES.SPP_GENERATE}:${payload.period}`
    });
  }
}
