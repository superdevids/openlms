import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SppSchedulerService } from "../../finance/services/spp-scheduler.service";
import { monthPeriod } from "../../finance/finance.constants";
import { JOB_NAMES, QUEUE_TOKEN, type IJobQueue } from "../../queue/queue.types";

/**
 * Payload job spp.generate.
 * period: "YYYY-MM" (default bulan berjalan); amount wajib untuk benar-benar
 * membuat tagihan (nominal SPP dari template/config — lihat SppSchedulerService).
 * idempotencyKey default = period → eksekusi berulang tidak menduplikasi.
 */
export interface SppGeneratePayload {
  period: string;
  amount?: string | number;
  dueDate?: string;
  academicYear?: string;
  createdBy?: string;
}

/**
 * SppProcessor — generasi tagihan SPP bulanan.
 * Cron @nestjs/schedule selalu berjalan (awal bulan) lalu ENQUEUE job dengan
 * period sebagai idempotency key. Eksekusi idempoten per siswa+periode
 * (SppSchedulerService: cek Invoice SPP periode tsb sebelum create).
 */
@Injectable()
export class SppProcessor {
  private readonly logger = new Logger(SppProcessor.name);

  constructor(
    private readonly sppScheduler: SppSchedulerService,
    @Inject(QUEUE_TOKEN) private readonly queue: IJobQueue
  ) {}

  /** Awal bulan, 00:05 — enqueue SPP periode berjalan. */
  @Cron("5 0 1 * *", { name: "spp-monthly" })
  async cronMonthly(): Promise<void> {
    const period = monthPeriod(new Date());
    const payload: SppGeneratePayload = { period, createdBy: "system" };
    await this.queue.enqueue(JOB_NAMES.SPP_GENERATE, payload, {
      jobId: `${JOB_NAMES.SPP_GENERATE}:${period}`
    });
    this.logger.log(`spp cron: enqueue ${JOB_NAMES.SPP_GENERATE} period=${period}`);
  }

  async handle(payload: unknown): Promise<void> {
    const input = payload as SppGeneratePayload;
    if (!input || !input.period) {
      this.logger.warn("spp.generate: payload tidak lengkap (butuh period), dilewati");
      return;
    }

    // Tanpa amount → tidak membuat tagihan (nominal harus dari template/config);
    // scheduler tetap memberi tahu jumlah kandidat tanpa generate.
    const result = await this.sppScheduler.generateSpp(
      input.period,
      input.amount ?? "0",
      input.dueDate ? new Date(input.dueDate) : undefined,
      input.academicYear,
      input.createdBy ?? "system"
    );
    this.logger.log(
      `spp.generate ${input.period}: ${result.generated} dibuat, ${result.skipped} dilewati`
    );
  }
}
