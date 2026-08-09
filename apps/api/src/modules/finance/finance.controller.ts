import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { IDEMPOTENCY_HEADER } from "./finance.constants";
import {
  AllocatePaymentDto,
  ApproveRefundDto,
  CashFlowRecordDto,
  CreateBulkInvoiceDto,
  CreateInvoiceDto,
  CreateLateFeeRuleDto,
  CreateRefundDto,
  ImportReconciliationDto,
  InvoiceQueryDto,
  MonthPeriodQueryDto,
  RecordPaymentDto,
  ResolveReconciliationItemDto,
  SppSchedulerDto,
  VerifyPaymentDto
} from "./dto/finance.dto";
import { InvoiceService, type InvoiceActor } from "./services/invoice.service";
import { PaymentService } from "./services/payment.service";
import { SppSchedulerService } from "./services/spp-scheduler.service";
import { LateFeeService } from "./services/late-fee.service";
import { RefundService } from "./services/refund.service";
import { ReconciliationService } from "./services/reconciliation.service";
import { CashFlowService } from "./services/cash-flow.service";
import { FinanceJobsService } from "./services/finance-jobs.service";
import { money } from "./calculator/money";

/**
 * FinanceController — REST keuangan (prd04 §5.F).
 * RBAC via @RequirePermission (guard global AuthGuard → PermissionsGuard).
 * Aktor WAJIB dari @CurrentUser (AuthGuard); handler non-publik melempar
 * UnauthorizedException bila konteks autentikasi tidak ditemukan.
 */

@Controller("finance")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FinanceController {
  constructor(
    private readonly invoices: InvoiceService,
    private readonly payments: PaymentService,
    private readonly spp: SppSchedulerService,
    private readonly lateFee: LateFeeService,
    private readonly refunds: RefundService,
    private readonly reconciliation: ReconciliationService,
    private readonly cashFlow: CashFlowService,
    private readonly jobs: FinanceJobsService,
    @Inject(QUEUE_TOKEN) private readonly jobQueue: IJobQueue
  ) {}

  private actorId(user: AuthUser | undefined): string {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return user.id;
  }

  /** Aktor untuk scope invoice (SEC-002): userId + roles + classIds dari AuthGuard. */
  private actor(user: AuthUser | undefined): InvoiceActor {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: user.id, roles: user.roles, classIds: user.classIds };
  }

  // ---------- Invoice ----------

  @Post("invoices")
  @RequirePermission("invoice:write:school")
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.invoices.create({
      studentId: dto.studentId,
      type: dto.type,
      period: dto.period,
      amount: dto.amount,
      discount: dto.discount ?? 0,
      dueDate: new Date(dto.dueDate),
      academicYear: dto.academicYear,
      createdBy: userId
    });
  }

  @Post("invoices/bulk")
  @RequirePermission("invoice:write:school")
  createBulk(@Body() dto: CreateBulkInvoiceDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.invoices.createBulk(
      dto.students.map((s) => s.studentId),
      {
        type: dto.type,
        period: dto.period,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        academicYear: dto.academicYear,
        createdBy: userId
      }
    );
  }

  @Get("invoices")
  @RequirePermission("invoice:read:school", "invoice:read:self")
  listInvoices(@Query() query: InvoiceQueryDto, @CurrentUser() user: AuthUser | undefined) {
    return this.invoices.list(query, this.actor(user));
  }

  @Get("invoices/:id")
  @RequirePermission("invoice:read:school", "invoice:read:self")
  getInvoice(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.invoices.findById(id, this.actor(user));
  }

  @Post("invoices/:id/carry-over")
  @RequirePermission("invoice:write:school")
  carryOver(
    @Param("id") id: string,
    @Body() body: { academicYear: string },
    @CurrentUser() user: AuthUser | undefined
  ) {
    const actor = this.actor(user);
    return this.invoices.carryOver(id, body.academicYear, actor.userId, actor);
  }

  @Delete("invoices/:id")
  @RequirePermission("invoice:write:school")
  removeInvoice(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.invoices.remove(id, userId);
  }

  // ---------- SPP scheduler ----------

  @Post("jobs/spp")
  @RequirePermission("invoice:write:school")
  @HttpCode(HttpStatus.ACCEPTED)
  async runSpp(@Body() dto: SppSchedulerDto) {
    const period =
      dto.period ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const amount = dto.amount ?? "0";
    // Operasi berat (generate tagihan untuk semua siswa) diantrekan — jobId
    // per periode membuat eksekusi ulang idempoten (tidak menduplikasi tagihan).
    try {
      await this.jobQueue.enqueue(
        JOB_NAMES.SPP_GENERATE,
        {
          period,
          amount,
          dueDate: dto.dueDate,
          createdBy: "system"
        },
        { jobId: `${JOB_NAMES.SPP_GENERATE}:${period}` }
      );
      return { accepted: true, job: JOB_NAMES.SPP_GENERATE, period };
    } catch {
      // Queue tidak tersedia (mis. Redis down) → fallback inline agar endpoint tetap berfungsi.
      return this.spp.generateSpp(period, amount, dto.dueDate ? new Date(dto.dueDate) : undefined);
    }
  }

  @Get("invoices/summary/monthly")
  @RequirePermission("invoice:read:school", "cashflow:read:school")
  monthlySummary(@Query("period") period?: string, @CurrentUser() user?: AuthUser) {
    const p =
      period ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    return this.invoices.monthlySummary(p, this.actor(user));
  }

  // ---------- Payment ----------

  @Post("payments")
  @RequirePermission("payment:record:school")
  recordPayment(@Body() dto: RecordPaymentDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.payments.record({
      invoiceId: dto.invoiceId,
      amount: dto.amount,
      method: dto.method,
      proofUrl: dto.proofUrl,
      note: dto.note,
      createdBy: userId
    });
  }

  /** Pembayaran gabungan lintas tagihan (alokasi parsial/cicilan). */
  @Post("payments/allocate")
  @RequirePermission("payment:record:school")
  allocatePayment(@Body() dto: AllocatePaymentDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.payments.recordAllocated({
      invoiceIds: dto.invoiceIds,
      amount: dto.amount,
      method: dto.method,
      proofUrl: dto.proofUrl,
      note: dto.note,
      createdBy: userId
    });
  }

  @Post("payments/:id/verify")
  @RequirePermission("payment:verify:school")
  verifyPayment(
    @Param("id") id: string,
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.payments.verify(id, dto.approved, userId, dto.note);
  }

  @Get("payments/invoice/:invoiceId")
  @RequirePermission("invoice:read:school", "invoice:read:self")
  async paymentHistory(
    @Param("invoiceId") invoiceId: string,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const actor = this.actor(user);
    // SEC-002: validasi kepemilikan invoice dulu (403 bila bukan milik aktor/anak)
    // sebelum riwayat pembayaran dikembalikan.
    await this.invoices.findById(invoiceId, actor);
    return this.payments.history(invoiceId);
  }

  // ---------- Denda ----------

  @Post("late-fee-rules")
  @RequirePermission("invoice:write:school")
  createLateFeeRule(@Body() dto: CreateLateFeeRuleDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.lateFee.createRule({
      name: dto.name,
      invoiceType: dto.invoiceType,
      graceDays: dto.graceDays,
      feeType: dto.feeType,
      value: dto.value,
      maxAmount: dto.maxAmount ?? null,
      enabled: dto.enabled ?? true,
      createdBy: userId
    });
  }

  @Get("late-fee-rules")
  @RequirePermission("invoice:read:school")
  listLateFeeRules(@Query("enabled") enabled?: string) {
    return this.lateFee.listRules(enabled === "true");
  }

  @Post("jobs/late-fee")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("invoice:write:school")
  runLateFeeJob() {
    return this.lateFee.runDailyDenda(new Date());
  }

  @Get("dendas")
  @RequirePermission("invoice:read:school")
  listDendas(@Query("originalInvoiceId") originalInvoiceId?: string) {
    return this.lateFee.listDendas(originalInvoiceId);
  }

  @Delete("dendas/:invoiceNo")
  @RequirePermission("invoice:write:school")
  deleteDenda(
    @Param("invoiceNo") invoiceNo: string,
    @Body() body: { reason: string },
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.lateFee.deleteDenda(invoiceNo, body.reason, userId);
  }

  // ---------- Refund ----------

  @Post("refunds")
  @RequirePermission("refund:approve:school")
  createRefund(@Body() dto: CreateRefundDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.refunds.create({
      paymentId: dto.paymentId,
      invoiceId: dto.invoiceId,
      amount: dto.amount,
      reason: dto.reason,
      method: dto.method,
      note: dto.note,
      createdBy: userId
    });
  }

  @Get("refunds")
  @RequirePermission("refund:approve:school", "cashflow:read:school")
  listRefunds() {
    return this.refunds.list();
  }

  @Post("refunds/:id/approve-keuangan")
  @RequirePermission("refund:approve:school")
  approveRefundKeuangan(
    @Param("id") id: string,
    @Body() dto: ApproveRefundDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.refunds.approveByKeuangan(id, dto.approved, userId, dto.note);
  }

  @Post("refunds/:id/approve-kepsek")
  @RequirePermission("refund:approve:school")
  approveRefundKepsek(
    @Param("id") id: string,
    @Body() dto: ApproveRefundDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.refunds.approveByKepsek(id, dto.approved, userId, dto.note);
  }

  // ---------- Rekonsiliasi ----------

  @Post("reconciliation/import")
  @RequirePermission("reconciliation:run:school")
  importReconciliation(
    @Body() dto: ImportReconciliationDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.reconciliation.import({
      csv: dto.csv,
      period: dto.period,
      fileName: dto.fileName,
      importedBy: userId
    });
  }

  @Get("reconciliation")
  @RequirePermission("reconciliation:run:school")
  listReconciliation() {
    return this.reconciliation.list();
  }

  @Get("reconciliation/:id")
  @RequirePermission("reconciliation:run:school")
  getReconciliation(@Param("id") id: string) {
    return this.reconciliation.get(id);
  }

  @Post("reconciliation/items/:itemId/resolve")
  @RequirePermission("reconciliation:run:school")
  resolveReconciliationItem(
    @Param("itemId") itemId: string,
    @Body() dto: ResolveReconciliationItemDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.reconciliation.resolveItem(
      itemId,
      { matchedPaymentId: dto.matchedPaymentId, resolutionNote: dto.resolutionNote },
      userId
    );
  }

  // ---------- Arus kas ----------

  @Get("cash-flow")
  @RequirePermission("cashflow:read:school")
  cashFlowSummary(@Query() query: MonthPeriodQueryDto) {
    const period =
      query.period ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    return this.cashFlow.summary(period);
  }

  @Post("cash-flow")
  @RequirePermission("invoice:write:school")
  recordCashFlow(@Body() dto: CashFlowRecordDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.cashFlow.record({
      date: new Date(dto.date),
      direction: dto.direction,
      amount: money(dto.amount),
      category: dto.category,
      referenceId: dto.referenceId,
      note: dto.note,
      createdBy: userId
    });
  }

  // ---------- Jobs (pemicu manual) ----------

  @Post("jobs/run-all")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("invoice:write:school")
  runAllJobs(@Headers(IDEMPOTENCY_HEADER) _idempotencyKey?: string) {
    // Idempotensi job (SPP, denda) berbasis data (student_id+period / invoice_id+period).
    // Idempotency-Key klien diterima tetapi belum disimpan di store (duplikasi
    // retry klien dicegah oleh idempotensi data; lihat ISSUES).
    return this.jobs.runAll(new Date());
  }
}
