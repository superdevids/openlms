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
 * Idempoten via RolloverRun.idempotency_key: bila run dengan key sama sudah
 * dalam status RUNNING/DONE/ROLLED_BACK/FAILED, job dilewati. Eksekusi
 * diteruskan ke RolloverService (alur preview → run → rollback yang sudah ada).
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
    if (existing && existing.status !== "DRAFT") {
      this.logger.log(
        `rollover.execute ${input.runId}: sudah ${existing.status} (idempotent), dilewati`
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
