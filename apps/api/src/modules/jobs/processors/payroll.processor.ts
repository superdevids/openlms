import { Injectable, Logger } from "@nestjs/common";
import { PayrollRunService } from "../../payroll/services/payroll-run.service";

/**
 * Payload job payroll.run.
 * period: "YYYY-MM" (default bulan berjalan — lihat PayrollRunService.create).
 */
export interface PayrollRunPayload {
  period?: string;
  createdBy: string;
  note?: string;
}

/**
 * PayrollProcessor — job payroll.run.
 * Idempoten per periode: PayrollRunService.create mengembalikan run yang sudah
 * ada (kunci unik PayrollRun.period) dan hanya membuat DRAFT bila belum ada.
 * Perhitungan item dilakukan lewat REST (PayrollModule) — job ini menjamin
 * tepat satu run per periode dibuat.
 */
@Injectable()
export class PayrollProcessor {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(private readonly payroll: PayrollRunService) {}

  async handle(payload: unknown): Promise<void> {
    const input = payload as PayrollRunPayload;
    if (!input || !input.createdBy) {
      this.logger.warn("payroll.run: payload tidak lengkap (butuh createdBy), dilewati");
      return;
    }

    const run = await this.payroll.create({
      period: input.period,
      createdBy: input.createdBy,
      note: input.note
    });
    this.logger.log(`payroll.run ${run.period}: run ${run.id} (status ${run.status})`);
  }
}
