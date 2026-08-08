/**
 * RolloverController — endpoint wizard rollover tahun ajaran.
 * RBAC: draft/preview = rollover:preview:school (OPERATOR/KEPSEK/SUPERADMIN);
 * execute = rollover:execute:school; rollback = rollover:rollback:school;
 * riwayat = rollover:history:read:school (KEPSEK/SUPERADMIN).
 * "actorId" diambil dari request.requestContext (AuthGuard), bukan header.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException
} from "@nestjs/common";
import { RolloverService } from "./rollover.service";
import { CreateRolloverDraftDto, RollbackRolloverDto } from "./dto/rollover.dto";
import type { RolloverRunStatus } from "@openlms/types";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { RequirePermission } from "../../common/require-permission.decorator";
import { prisma } from "@openlms/database";
import { JOB_NAMES, QUEUE_TOKEN, type IJobQueue } from "../queue/queue.types";

@Controller("rollover")
export class RolloverController {
  constructor(
    private readonly rolloverService: RolloverService,
    @Inject(QUEUE_TOKEN) private readonly jobQueue: IJobQueue
  ) {}

  @Post("draft")
  @RequirePermission("rollover:preview:school")
  draft(@Req() req: AuthenticatedRequest, @Body() dto: CreateRolloverDraftDto) {
    return this.rolloverService.draft(this.actorId(req), {
      sourceYearId: dto.sourceYearId,
      newYearCode: dto.newYearCode,
      newYearName: dto.newYearName,
      startDate: dto.startDate,
      endDate: dto.endDate,
      idempotencyKey: dto.idempotencyKey,
      includeFinanceRollover: dto.includeFinanceRollover,
      includePayrollRollover: dto.includePayrollRollover,
      ppdbTargetClassId: dto.ppdbTargetClassId,
      overrides: dto.overrides,
      backup: dto.backup
    });
  }

  @Post(":runId/pre-check")
  @RequirePermission("rollover:preview:school")
  precheck(@Param("runId") runId: string) {
    return this.rolloverService.precheck(runId);
  }

  @Post(":runId/dry-run")
  @RequirePermission("rollover:preview:school")
  dryRun(@Param("runId") runId: string) {
    return this.rolloverService.dryRun(runId);
  }

  @Post(":runId/execute")
  @RequirePermission("rollover:execute:school")
  @HttpCode(HttpStatus.ACCEPTED)
  async execute(@Param("runId") runId: string, @Req() req: AuthenticatedRequest) {
    const actorId = this.actorId(req);
    // Operasi berat (exec rollover berjenjang) diantrekan via queue; jobId
    // memakai idempotency_key run → eksekusi ulang tidak menduplikasi.
    const run = await prisma.rolloverRun.findUnique({
      where: { id: runId },
      select: { idempotency_key: true }
    });
    if (!run) {
      throw new NotFoundException("Rollover run tidak ditemukan");
    }
    try {
      await this.jobQueue.enqueue(
        JOB_NAMES.ROLLOVER_EXECUTE,
        { runId, idempotencyKey: run.idempotency_key, actorId },
        { jobId: `${JOB_NAMES.ROLLOVER_EXECUTE}:${run.idempotency_key}` }
      );
      return { accepted: true, job: JOB_NAMES.ROLLOVER_EXECUTE, runId };
    } catch {
      // Queue tidak tersedia → fallback inline agar endpoint tetap berfungsi.
      return this.rolloverService.execute(runId, actorId);
    }
  }

  @Post(":runId/rollback")
  @RequirePermission("rollover:rollback:school")
  rollback(
    @Param("runId") runId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: RollbackRolloverDto
  ) {
    return this.rolloverService.rollback(runId, this.actorId(req), dto.reason);
  }

  @Get()
  @RequirePermission("rollover:history:read:school", "rollover:preview:school")
  list(
    @Query("academicYearId") academicYearId?: string,
    @Query("status") status?: RolloverRunStatus
  ) {
    return this.rolloverService.list({ academicYearId, status });
  }

  private actorId(req: AuthenticatedRequest): string {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return ctx.userId;
  }
}
