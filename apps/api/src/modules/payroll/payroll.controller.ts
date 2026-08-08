import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";
import { JOB_NAMES, QUEUE_TOKEN, type IJobQueue } from "../queue/queue.types";
import { monthPeriod } from "../finance/finance.constants";
import {
  CalculateRunDto,
  CreateJobPositionDto,
  CreateRunDto,
  CreateSalaryStructureDto,
  PayrollQueryDto,
  UpdateJobPositionDto,
  UpsertComponentDto
} from "./dto/payroll.dto";
import {
  JobPositionService,
  PayrollComponentService,
  SalaryStructureService
} from "./services/payroll-master.service";
import { PayrollRunService } from "./services/payroll-run.service";
import { PayslipService, PayslipActor } from "./services/payslip.service";
import { PayrollReportService } from "./services/payroll-report.service";

/**
 * PayrollController — REST payroll (prd04 §5.E).
 * RBAC via @RequirePermission (guard global AuthGuard → PermissionsGuard).
 * Aktor WAJIB dari @CurrentUser (AuthGuard); tidak ada fallback "system" —
 * handler non-publik melempar UnauthorizedException bila konteks tidak ada.
 * Payslip scope: payslip:read:self → staffId di-resolve dari actor (anti-IDOR);
 * payroll:read:school → bebas.
 */

@Controller("payroll")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PayrollController {
  constructor(
    private readonly jobPositions: JobPositionService,
    private readonly components: PayrollComponentService,
    private readonly salaryStructures: SalaryStructureService,
    private readonly runs: PayrollRunService,
    private readonly payslips: PayslipService,
    private readonly reports: PayrollReportService,
    @Inject(QUEUE_TOKEN) private readonly jobQueue: IJobQueue
  ) {}

  private actorId(user: AuthUser | undefined): string {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return user.id;
  }

  private payslipActor(user: AuthUser | undefined): PayslipActor {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: user.id, roles: user.roles };
  }

  // ---------- Master: JobPosition ----------

  @Post("job-positions")
  @RequirePermission("payroll:write:school")
  createJobPosition(@Body() dto: CreateJobPositionDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.jobPositions.create({
      code: dto.code,
      name: dto.name,
      defaultJabatanAllowance: dto.defaultJabatanAllowance,
      createdBy: userId
    });
  }

  @Get("job-positions")
  @RequirePermission("payroll:read:school")
  listJobPositions() {
    return this.jobPositions.list();
  }

  @Post("job-positions/:id")
  @RequirePermission("payroll:write:school")
  updateJobPosition(@Param("id") id: string, @Body() dto: UpdateJobPositionDto) {
    return this.jobPositions.update(id, dto);
  }

  // ---------- Master: PayrollComponent ----------

  @Get("components")
  @RequirePermission("payroll:read:school")
  listComponents(@Query("active") active?: string) {
    return this.components.list(active !== "false");
  }

  @Post("components")
  @RequirePermission("payroll:component:write:school")
  upsertComponent(@Body() dto: UpsertComponentDto) {
    return this.components.upsert({
      code: dto.code,
      name: dto.name,
      category: dto.category as never,
      kind: dto.kind as never,
      isTaxable: dto.isTaxable,
      isBpjsApplicable: dto.isBpjsApplicable,
      unit: (dto.unit ?? null) as never,
      description: dto.description ?? "",
      active: true
    });
  }

  // ---------- Master: SalaryStructure ----------

  @Post("salary-structures")
  @RequirePermission("payroll:write:school")
  createSalaryStructure(
    @Body() dto: CreateSalaryStructureDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.salaryStructures.create({
      staffId: dto.staffId,
      effectiveFrom: dto.effectiveFrom,
      components: dto.components,
      attendanceAllowancePerDay: dto.attendanceAllowancePerDay ?? null,
      createdBy: userId
    });
  }

  @Get("salary-structures")
  @RequirePermission("payroll:read:school")
  listSalaryStructures(@Query("staffId") staffId?: string) {
    return this.salaryStructures.list(staffId);
  }

  // ---------- PayrollRun ----------

  @Post("runs")
  @RequirePermission("payroll:run:school")
  @HttpCode(HttpStatus.ACCEPTED)
  async createRun(@Body() dto: CreateRunDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    const period = dto.period ?? monthPeriod(new Date());
    // Pembuatan run diantrekan (processor payroll.run idempoten per periode);
    // fallback inline bila queue tidak tersedia.
    try {
      await this.jobQueue.enqueue(
        JOB_NAMES.PAYROLL_RUN,
        { period, createdBy: userId, note: dto.note },
        { jobId: `${JOB_NAMES.PAYROLL_RUN}:${period}` }
      );
      return { accepted: true, job: JOB_NAMES.PAYROLL_RUN, period };
    } catch {
      return this.runs.create({
        period,
        note: dto.note,
        variableHours: dto.variableHours,
        createdBy: userId
      });
    }
  }

  @Get("runs")
  @RequirePermission("payroll:read:school")
  listRuns() {
    return this.runs.list();
  }

  @Get("runs/:id")
  @RequirePermission("payroll:read:school")
  getRun(@Param("id") id: string) {
    return this.runs.get(id);
  }

  @Post("runs/:id/calculate")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("payroll:run:school")
  calculateRun(@Param("id") id: string, @Body() dto: CalculateRunDto) {
    return this.runs.calculate(id, dto.variableHours);
  }

  @Post("runs/:id/validate")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("payroll:run:school")
  validateRun(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.runs.validate(id, userId);
  }

  @Post("runs/:id/approve-keuangan")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("payroll:approve:school")
  approveKeuangan(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.runs.approveByKeuangan(id, userId);
  }

  /** KEPSEK melihat REKAP (ringkasan) sebelum menyetujui — privasi gaji. */
  @Get("runs/:id/rekap")
  @RequirePermission("payroll:approve:school")
  rekapKepsek(@Param("id") id: string) {
    return this.runs.rekapForKepsek(id);
  }

  @Post("runs/:id/approve-kepsek")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("payroll:approve:school")
  approveKepsek(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.runs.approveByKepsek(id, userId);
  }

  // ---------- Payslip ----------

  /** Pegawai: slip sendiri (scope payslip:read:self — staffId di-resolve dari actor). */
  @Get("payslips/me/:staffId")
  @RequirePermission("payslip:read:self", "payroll:read:school")
  myPayslips(@Param("staffId") staffId: string, @CurrentUser() user: AuthUser | undefined) {
    return this.payslips.myPayslips(staffId, this.payslipActor(user));
  }

  @Get("payslips/:id")
  @RequirePermission("payroll:read:school", "payslip:read:self")
  getPayslip(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.payslips.get(id, this.payslipActor(user));
  }

  // ---------- Laporan ----------

  @Get("reports/summary")
  @RequirePermission("payroll:read:school", "payroll:approve:school")
  reportSummary(@Query("periods") periods?: string) {
    const list = periods ? periods.split(",").filter(Boolean) : [];
    return this.reports.summaryByPeriod(list);
  }

  @Get("reports/comparison")
  @RequirePermission("payroll:read:school", "payroll:approve:school")
  monthlyComparison(@Query("period") period?: string) {
    const p =
      period ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    return this.reports.monthlyComparison(p);
  }

  @Get("reports/deductions")
  @RequirePermission("payroll:read:school")
  deductionRecap(@Query("period") period?: string) {
    const p =
      period ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    return this.reports.deductionRecap(p);
  }
}

export type { PayrollQueryDto };
