import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { AssessmentStatus } from "@prisma/client";
import { Request } from "express";
import { ExamService } from "./exam.service";
import { ExamAttemptService, AttemptActor } from "./exam-attempt.service";
import {
  CreateExamDto,
  UpdateExamDto,
  CreateExamPackageDto,
  UpdateExamPackageDto,
  CreateExamSessionDto,
  GenerateSessionTokenDto
} from "./dto/exam.dto";
import {
  StartExamAttemptDto,
  SaveExamAnswersDto,
  GradeExamAttemptDto,
  LogExamActivityDto
} from "./dto/exam-attempt.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * ExamController — ujian online (prd04 §5.A.6; docs/05 M-EXAM-T1..T12).
 * RBAC: kelola ujian/paket/sesi/token/grade = exam:write:school /
 * exam:session:write:school / exam:token:* / exam:grade-esai:class;
 * start attempt/autosave/submit = exam:attempt:self (SISWA) atau
 * exam:attempt:school (staff atas nama siswa);
 * log = exam:log:read:school; analisis = exam:analysis:read:school.
 * Aktor diambil dari @CurrentUser (AuthGuard) dan diteruskan ke service untuk
 * binding student_id + cek kepemilikan attempt (anti-IDOR).
 */
@Controller("exam")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly examAttemptService: ExamAttemptService
  ) {}

  private actor(user: AuthUser | undefined): AttemptActor {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return {
      userId: user.id,
      roles: user.roles,
      classIds: user.classIds,
      homeroomClassId: user.homeroomClassId
    };
  }

  private userId(user: AuthUser | undefined): string {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return user.id;
  }

  private clientIp(req: Request): string | null {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim() ?? null;
    }
    return req.ip ?? null;
  }

  // ---------------- Exam ----------------

  @Post()
  @RequirePermission("exam:write:school")
  createExam(@Body() dto: CreateExamDto, @CurrentUser() user: AuthUser | undefined) {
    return this.examService.create(dto, this.userId(user));
  }

  @Get()
  @RequirePermission("exam:attempt:self", "exam:read:school")
  listExams(@Query() query: { subject_id?: string; status?: AssessmentStatus; q?: string }) {
    return this.examService.findAll(query);
  }

  /** Daftar ujian siswa (G-02): sesi yang menyasar kelas siswa, dipetakan ke
   *  { id, title, subject, className, startsAt, endsAt, durationMinutes, status }.
   *  Dideklarasikan SEBELUM @Get(":examId") agar "list-for-student" tidak tertangkap param. */
  @Get("list-for-student")
  @RequirePermission("exam:attempt:self", "exam:read:school")
  listForStudent(@CurrentUser() user: AuthUser | undefined) {
    return this.examService.listForStudent(this.userId(user));
  }

  @Get(":examId")
  @RequirePermission("exam:attempt:self", "exam:read:school")
  getExam(@Param("examId") examId: string) {
    return this.examService.findOne(examId);
  }

  @Patch(":examId")
  @RequirePermission("exam:write:school")
  updateExam(@Param("examId") examId: string, @Body() dto: UpdateExamDto) {
    return this.examService.update(examId, dto);
  }

  @Post(":examId/publish")
  @RequirePermission("exam:write:school")
  publishExam(@Param("examId") examId: string) {
    return this.examService.setStatus(examId, AssessmentStatus.PUBLISHED);
  }

  @Post(":examId/close")
  @RequirePermission("exam:write:school")
  closeExam(@Param("examId") examId: string) {
    return this.examService.setStatus(examId, AssessmentStatus.CLOSED);
  }

  // ---------------- ExamPackage ----------------

  @Post(":examId/packages")
  @RequirePermission("exam:write:school")
  createPackage(@Param("examId") examId: string, @Body() dto: CreateExamPackageDto) {
    return this.examService.createPackage(examId, dto);
  }

  @Get(":examId/packages")
  @RequirePermission("exam:attempt:self", "exam:read:school")
  listPackages(@Param("examId") examId: string) {
    return this.examService.listPackages(examId);
  }

  @Patch("packages/:packageId")
  @RequirePermission("exam:write:school")
  updatePackage(@Param("packageId") packageId: string, @Body() dto: UpdateExamPackageDto) {
    return this.examService.updatePackage(packageId, dto);
  }

  @Post("packages/:packageId/questions")
  @RequirePermission("exam:write:school")
  addPackageQuestion(@Param("packageId") packageId: string, @Body() body: { question_id: string }) {
    return this.examService.addQuestion(packageId, body.question_id);
  }

  @Get("packages/:packageId/questions")
  @RequirePermission("exam:attempt:self", "exam:read:school")
  listPackageQuestions(@Param("packageId") packageId: string) {
    return this.examService.listPackageQuestions(packageId);
  }

  @Delete("packages/:packageId/questions/:questionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission("exam:write:school")
  async removePackageQuestion(
    @Param("packageId") packageId: string,
    @Param("questionId") questionId: string
  ): Promise<void> {
    await this.examService.removeQuestion(packageId, questionId);
  }

  // ---------------- ExamSession & token ----------------

  @Post(":examId/sessions")
  @RequirePermission("exam:session:write:school")
  createSession(@Param("examId") examId: string, @Body() dto: CreateExamSessionDto) {
    return this.examService.createSession(examId, dto);
  }

  @Get(":examId/sessions")
  @RequirePermission("exam:session:write:school", "exam:attempt:self")
  listSessions(@Param("examId") examId: string) {
    return this.examService.listSessions(examId);
  }

  @Post("sessions/:sessionId/token/generate")
  @RequirePermission("exam:token:class", "exam:token:school")
  generateToken(@Param("sessionId") sessionId: string, @Body() dto: GenerateSessionTokenDto) {
    return this.examService.generateToken(sessionId, dto);
  }

  @Get("sessions/:sessionId/token/status")
  @RequirePermission("exam:token:class", "exam:token:school")
  tokenStatus(@Param("sessionId") sessionId: string) {
    return this.examService.tokenStatus(sessionId);
  }

  // ---------------- Attempt ----------------

  @Post("sessions/:sessionId/attempts")
  @RequirePermission("exam:attempt:self", "exam:attempt:school")
  startAttempt(
    @Param("sessionId") sessionId: string,
    @Body() dto: StartExamAttemptDto,
    @Req() req: Request,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.examAttemptService.start(sessionId, dto, this.actor(user), this.clientIp(req));
  }

  @Get("attempts/:attemptId")
  @RequirePermission("exam:attempt:self", "exam:read:school")
  getAttempt(@Param("attemptId") attemptId: string, @CurrentUser() user: AuthUser | undefined) {
    return this.examAttemptService.getAttempt(attemptId, this.actor(user));
  }

  @Get("attempts/:attemptId/logs")
  @RequirePermission("exam:attempt:self", "exam:log:read:school")
  getAttemptLogs(@Param("attemptId") attemptId: string, @CurrentUser() user: AuthUser | undefined) {
    return this.examAttemptService.getLogs(attemptId, this.actor(user));
  }

  @Post("attempts/:attemptId/answers")
  @RequirePermission("exam:attempt:self", "exam:attempt:school")
  saveAnswers(
    @Param("attemptId") attemptId: string,
    @Body() dto: SaveExamAnswersDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() req: Request,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.examAttemptService.saveAnswers(
      attemptId,
      dto,
      this.actor(user),
      idempotencyKey,
      this.clientIp(req)
    );
  }

  @Post("attempts/:attemptId/submit")
  @RequirePermission("exam:attempt:self", "exam:attempt:school")
  submitAttempt(@Param("attemptId") attemptId: string, @CurrentUser() user: AuthUser | undefined) {
    return this.examAttemptService.submit(attemptId, this.actor(user));
  }

  @Post("attempts/:attemptId/grade")
  @RequirePermission("exam:grade-esai:class")
  manualGrade(
    @Param("attemptId") attemptId: string,
    @Body() dto: GradeExamAttemptDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.examAttemptService.manualGrade(attemptId, dto, this.actor(user));
  }

  @Post("attempts/:attemptId/log")
  @RequirePermission("exam:attempt:self")
  logActivity(
    @Param("attemptId") attemptId: string,
    @Body() dto: LogExamActivityDto,
    @Req() req: Request,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.examAttemptService.logActivity(
      attemptId,
      dto,
      this.actor(user),
      this.clientIp(req)
    );
  }

  @Post("attempts/:attemptId/expire")
  @RequirePermission("exam:session:write:school", "exam:write:school")
  markExpired(@Param("attemptId") attemptId: string, @CurrentUser() user: AuthUser | undefined) {
    return this.examAttemptService.markExpired(attemptId, this.actor(user));
  }

  /** Pemicu auto-submit (dipanggil scheduler/job internal). */
  @Post("attempts/auto-submit")
  @RequirePermission("exam:write:school")
  autoSubmitExpired() {
    return this.examAttemptService.autoSubmitExpired();
  }

  // ---------------- Analisis butir (M-EXAM-T10) ----------------

  @Get(":examId/item-analysis")
  @RequirePermission("exam:analysis:read:school")
  itemAnalysis(@Param("examId") examId: string, @Query("packageId") packageId?: string) {
    return this.examService.itemAnalysis(examId, packageId);
  }
}
