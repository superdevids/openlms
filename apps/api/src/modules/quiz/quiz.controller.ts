import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { AssessmentStatus } from "@prisma/client";
import { QuestionService } from "./question.service";
import { QuizService } from "./quiz.service";
import { QuizAttemptService, AttemptActor } from "./quiz-attempt.service";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { ListQuestionsQueryDto } from "./dto/list-questions-query.dto";
import { ImportQuestionsDto } from "./dto/import-questions.dto";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { UpdateQuizDto } from "./dto/update-quiz.dto";
import { ListQuizzesQueryDto } from "./dto/list-quizzes-query.dto";
import {
  StartQuizAttemptDto,
  SaveQuizAnswerDto,
  SubmitQuizAttemptDto
} from "./dto/quiz-attempt.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * QuizController — bank soal & kuis (prd04 §5.A.5).
 * RBAC: bank soal & kelola kuis = question:write:class/quiz:write:class
 * (GURU/WAKEPSEK); baca soal & kuis = question:read:class atau quiz:attempt:self
 * (SISWA); start/submit attempt = quiz:attempt:self (SISWA) atau
 * quiz:attempt:school (staff atas nama siswa).
 * Aktor diambil dari @CurrentUser (AuthGuard) dan diteruskan ke service untuk
 * binding student_id + cek kepemilikan attempt (anti-IDOR).
 */
@Controller("quiz")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class QuizController {
  constructor(
    private readonly questionService: QuestionService,
    private readonly quizService: QuizService,
    private readonly quizAttemptService: QuizAttemptService
  ) {}

  private actor(user: AuthUser | undefined): AttemptActor {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: user.id, roles: user.roles };
  }

  private userId(user: AuthUser | undefined): string {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return user.id;
  }

  // ---------------- Bank soal ----------------

  @Post("questions")
  @RequirePermission("question:write:class")
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.questionService.create(dto);
  }

  @Get("questions")
  @RequirePermission("question:read:class")
  listQuestions(@Query() query: ListQuestionsQueryDto) {
    return this.questionService.findAll(query);
  }

  @Get("questions/:questionId")
  @RequirePermission("question:read:class")
  getQuestion(@Param("questionId") questionId: string) {
    return this.questionService.findOne(questionId);
  }

  @Patch("questions/:questionId")
  @RequirePermission("question:write:class")
  updateQuestion(@Param("questionId") questionId: string, @Body() dto: UpdateQuestionDto) {
    return this.questionService.update(questionId, dto);
  }

  @Delete("questions/:questionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission("question:write:class")
  async removeQuestion(@Param("questionId") questionId: string): Promise<void> {
    await this.questionService.remove(questionId);
  }

  @Post("questions/import")
  @RequirePermission("question:write:class")
  importQuestions(@Body() dto: ImportQuestionsDto) {
    return this.questionService.importCsv(dto);
  }

  // ---------------- Kuis ----------------

  @Post()
  @RequirePermission("quiz:write:class")
  createQuiz(@Body() dto: CreateQuizDto, @CurrentUser() user: AuthUser | undefined) {
    return this.quizService.create(dto, this.userId(user));
  }

  @Get()
  @RequirePermission("quiz:attempt:self", "quiz:write:class")
  listQuizzes(@Query() query: ListQuizzesQueryDto) {
    return this.quizService.findAll(query);
  }

  @Get(":quizId")
  @RequirePermission("quiz:attempt:self", "quiz:write:class")
  getQuiz(@Param("quizId") quizId: string) {
    return this.quizService.findOne(quizId);
  }

  @Patch(":quizId")
  @RequirePermission("quiz:write:class")
  updateQuiz(@Param("quizId") quizId: string, @Body() dto: UpdateQuizDto) {
    return this.quizService.update(quizId, dto);
  }

  @Post(":quizId/publish")
  @RequirePermission("quiz:write:class")
  publishQuiz(@Param("quizId") quizId: string) {
    return this.quizService.setStatus(quizId, AssessmentStatus.PUBLISHED);
  }

  @Post(":quizId/close")
  @RequirePermission("quiz:write:class")
  closeQuiz(@Param("quizId") quizId: string) {
    return this.quizService.setStatus(quizId, AssessmentStatus.CLOSED);
  }

  @Post(":quizId/questions/:questionId")
  @RequirePermission("quiz:write:class")
  attachQuestion(@Param("quizId") quizId: string, @Param("questionId") questionId: string) {
    return this.quizService.attachQuestion(quizId, questionId);
  }

  @Delete(":quizId/questions/:questionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission("quiz:write:class")
  async detachQuestion(
    @Param("quizId") quizId: string,
    @Param("questionId") questionId: string
  ): Promise<void> {
    await this.quizService.detachQuestion(quizId, questionId);
  }

  // ---------------- Attempt kuis ----------------

  @Post(":quizId/attempts")
  @RequirePermission("quiz:attempt:self", "quiz:attempt:school")
  startAttempt(
    @Param("quizId") quizId: string,
    @Body() dto: StartQuizAttemptDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.quizAttemptService.start(quizId, dto, this.actor(user));
  }

  @Get("attempts/:attemptId")
  @RequirePermission("quiz:attempt:self", "quiz:write:class")
  getAttempt(@Param("attemptId") attemptId: string, @CurrentUser() user: AuthUser | undefined) {
    return this.quizAttemptService.getAttempt(attemptId, this.actor(user));
  }

  @Post("attempts/:attemptId/answers")
  @RequirePermission("quiz:attempt:self", "quiz:attempt:school")
  saveAnswer(
    @Param("attemptId") attemptId: string,
    @Body() dto: SaveQuizAnswerDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.quizAttemptService.saveAnswer(attemptId, dto, this.actor(user));
  }

  @Post("attempts/:attemptId/submit")
  @RequirePermission("quiz:attempt:self", "quiz:attempt:school")
  submitAttempt(
    @Param("attemptId") attemptId: string,
    @Body() dto: SubmitQuizAttemptDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.quizAttemptService.submit(attemptId, dto, this.actor(user));
  }

  /** Pemicu auto-submit (dipanggil scheduler/job internal). */
  @Post("attempts/auto-submit")
  @RequirePermission("quiz:write:class")
  autoSubmitExpired() {
    return this.quizAttemptService.autoSubmitExpired();
  }
}
