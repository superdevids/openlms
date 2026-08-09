import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@opensis/database";
import { RolloverService } from "../../rollover/rollover.service";

/**
 * Payload job rollover.execute.
 * runId: draft rollover yang sudah dibuat via REST (POST /app/rollover/drafts).
 * idempotencyKey: kunci unik RolloverRun.idempotency_key — eksekusi berulang
 * dengan key sama tidak mengeksekusi ulang.
 */
export interface RolloverExecutePayload {
  runId: string;
  idempotencyKey: string;
  actorId: string;
}

/**
 * RolloverProcessor — eksekusi rollover tahun ajaran.
 * Idempoten via RolloverRun.idempotency_key: job HANYA dilewati untuk status
 * terminal/eksklusif (RUNNING/DONE/ROLLED_BACK). DRAFT (belum pre-check),
 * PREVIEW (siap eksekusi), dan FAILED (resume) diteruskan ke RolloverService
 * (alur preview → run → rollback yang sudah ada). Eksekusi diteruskan ke
 * RolloverService yang mengunci status secara atomik (optimistic lock).
 */
@Injectable()
export class RolloverProcessor {
  private readonly logger = new Logger(RolloverProcessor.name);

  constructor(private readonly rollover: RolloverService) {}

  async handle(payload: unknown): Promise<void> {
    const input = payload as RolloverExecutePayload;
    if (!input || !input.runId || !input.idempotencyKey || !input.actorId) {
      this.logger.warn("rollover.execute: payload tidak lengkap, dilewati");
      return;
    }

    const existing = await prisma.rolloverRun.findUnique({
      where: { idempotency_key: input.idempotencyKey }
    });
    // Skip HANYA status terminal/eksklusif. PREVIEW dan FAILED WAJIB diproses
    // (execute menyala precheck, FAILED = resume); DRAFT juga diproses agar
    // service bisa memberi error yang jelas bila pre-check belum dijalankan.
    if (existing && ["RUNNING", "DONE", "ROLLED_BACK"].includes(existing.status)) {
      this.logger.log(
        `rollover.execute ${input.runId}: sudah ${existing.status} (terminal/eksklusif), dilewati`
      );
      return;
    }
    if (existing && existing.id !== input.runId) {
      this.logger.warn(
        `rollover.execute: runId=${input.runId} tidak cocok dengan idempotency_key (run=${existing.id})`
      );
    }

    const run = await this.rollover.execute(input.runId, input.actorId);
    this.logger.log(`rollover.execute ${input.runId}: status ${run.status}`);
  }
}
