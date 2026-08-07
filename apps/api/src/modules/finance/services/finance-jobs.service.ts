import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { SppSchedulerService, SppSchedulerResult } from "./spp-scheduler.service";
import { LateFeeService, LateFeeJobResult } from "./late-fee.service";

/**
 * FinanceJobsService — penjadwal internal job keuangan (prd04 §5.F.1/§5.F.3).
 *
 * Catatan: @nestjs/schedule belum terpasang (tanpa dependensi baru). Scheduler
 * memakai setInterval sederhana yang AKTIF hanya bila env OPENLMS_ENABLE_JOBS =
 * "true" (default off — job tetap bisa dipicu manual via controller).
 * Job dijamin IDEMPOTEN oleh masing-masing service:
 * - SPP: kunci student_id + period (tidak menduplikasi).
 * - Denda: kunci original_invoice_id + period.
 */

const DEFAULT_JOB_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 jam (job harian dilindungi tanggal)

@Injectable()
export class FinanceJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinanceJobsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly sppScheduler: SppSchedulerService,
    private readonly lateFee: LateFeeService
  ) {}

  onModuleInit(): void {
    if (process.env.OPENLMS_ENABLE_JOBS !== "true") {
      this.logger.log("Job keuangan nonaktif (set OPENLMS_ENABLE_JOBS=true untuk aktif)");
      return;
    }
    const interval = Number(process.env.OPENLMS_JOB_INTERVAL_MS ?? DEFAULT_JOB_INTERVAL_MS);
    this.timer = setInterval(() => {
      void this.runAll().catch((err) =>
        this.logger.error(`Job keuangan gagal: ${(err as Error).message}`)
      );
    }, interval);
    this.timer.unref?.();
    this.logger.log(`Job keuangan aktif (interval ${interval}ms)`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /** Pemicu semua job (dipanggil manual / scheduler). */
  async runAll(now = new Date()): Promise<{
    spp: SppSchedulerResult | null;
    lateFee: LateFeeJobResult;
  }> {
    // SPP: nominal diambil dari konfigurasi/template — default kosong berarti
    // job SPP hanya dipicu manual dengan amount (lihat controller).
    const lateFee = await this.lateFee.runDailyDenda(now);
    return { spp: null, lateFee };
  }

  /** Job SPP bulanan (manual trigger dengan nominal). */
  runSppJob(period: string, amount: string, dueDate?: Date): Promise<SppSchedulerResult> {
    return this.sppScheduler.generateSpp(period, amount, dueDate);
  }
}
