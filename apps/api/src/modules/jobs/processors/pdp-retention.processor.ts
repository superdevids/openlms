import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PdpRetentionService } from "../../pdp/pdp-retention.service";

/**
 * PdpRetentionProcessor — cron retensi data (UU PDP, G12).
 * Bulanan (tanggal 1 pukul 03:00) menjalankan PdpRetentionService.run()
 * sesuai DataRetentionPolicy enabled=true (pola storage-cleanup.processor).
 */
@Injectable()
export class PdpRetentionProcessor {
  private readonly logger = new Logger(PdpRetentionProcessor.name);

  constructor(private readonly retentionService: PdpRetentionService) {}

  /** Bulanan 1 pukul 03:00 — di luar jam penggunaan sistem. */
  @Cron("0 3 1 * *", { name: "pdp-retention-monthly" })
  async cronMonthly(): Promise<void> {
    const result = await this.retentionService.run();
    this.logger.log(`pdp retention selesai: ${JSON.stringify(result.summary)}`);
  }
}
