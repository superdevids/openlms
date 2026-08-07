import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { prisma } from "@openlms/database";
import { AssessmentStatus, AttemptStatus, GradeType, QuestionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  computeSemesterLabel,
  gradeAnswer,
  readAnswerMap,
  remainingSeconds,
  seededShuffle
} from "./quiz.util";
import {
  StartQuizAttemptDto,
  SaveQuizAnswerDto,
  SubmitQuizAttemptDto
} from "./dto/quiz-attempt.dto";

type AttemptWithQuiz = Prisma.QuizAttemptGetPayload<{
  include: { quiz: { include: { questions: true; class_subject: true } } };
}>;

/** Aktor request yang diteruskan controller (dari requestContext AuthGuard). */
export interface AttemptActor {
  userId: string;
  roles: string[];
}

/**
 * QuizAttemptService — start, timer server-side, auto-submit saat waktu habis,
 * auto-grade PG/isian, jawaban tersimpan, skor → Grade (KUIS).
 * prd04 §5.A.5; docs/05 M-EXAM-T1 (state machine attempt).
 * RBAC: SISWA (quiz:attempt:self) selalu dikunci ke actor.userId — student_id
 * dari client DIIGNOR untuk scope SENDIRI; staff (quiz:attempt:school /
 * quiz:write:class) boleh mulai atas nama siswa memakai dto.student_id.
 * Semua operasi mutasi/baca memeriksa kepemilikan attempt (anti-IDOR).
 */
@Injectable()
export class QuizAttemptService {
  async start(quizId: string, dto: StartQuizAttemptDto, actor: AttemptActor) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });
    if (!quiz) throw new NotFoundException("Quiz tidak ditemukan");
    const workableStatuses: AssessmentStatus[] = [
      AssessmentStatus.PUBLISHED,
      AssessmentStatus.ONGOING
    ];
    if (!workableStatuses.includes(quiz.status)) {
      throw new ConflictException(`Quiz berstatus ${quiz.status}, tidak dapat dikerjakan`);
    }
    const now = new Date();
    if (quiz.open_at && now < quiz.open_at) throw new ConflictException("Quiz belum dibuka");
    if (quiz.close_at && now > quiz.close_at) throw new ConflictException("Quiz sudah ditutup");

    // Anti-IDOR: SISWA selalu mengerjakan sebagai dirinya sendiri (student_id
    // dari client diabaikan). Staff diperbolehkan memakai dto.student_id
    // (guard: quiz:attempt:school / quiz:write:class).
    const studentId = this.isStaffScope(actor) ? dto.student_id : actor.userId;

    const attempt = await prisma.$transaction(async (tx) => {
      // Status otomatis jadi ONGOING saat attempt pertama dibuat.
      await tx.quiz.updateMany({
        where: { id: quizId, status: AssessmentStatus.PUBLISHED },
        data: { status: AssessmentStatus.ONGOING }
      });
      return tx.quizAttempt.create({
        data: {
          quiz_id: quizId,
          student_id: studentId,
          started_at: now,
          status: AttemptStatus.IN_PROGRESS
        }
      });
    });

    return this.buildAttemptResponse(attempt, quiz, now);
  }

  /** Simpan jawaban satu soal (bisa dipanggil tiap 15 detik dari client). */
  async saveAnswer(attemptId: string, dto: SaveQuizAnswerDto, actor: AttemptActor) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.findUnique({
        where: { id: attemptId },
        include: { quiz: { include: { questions: true, class_subject: true } } }
      });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      this.assertOwnsAttempt(attempt, actor);
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new ConflictException("Attempt sudah selesai");
      }
      if (this.isExpired(attempt)) {
        await this.finalizeWithinTx(tx, attempt, AttemptStatus.AUTO_SUBMITTED);
        throw new ConflictException("Waktu kuis habis; attempt di-auto-submit");
      }
      const current = readAnswerMap(attempt.answers);
      const next: Record<string, { answer?: string; savedAt?: string }> = {
        ...current,
        [dto.question_id]: { answer: dto.answer ?? "", savedAt: new Date().toISOString() }
      };
      return tx.quizAttempt.update({
        where: { id: attemptId },
        data: { answers: next as Prisma.InputJsonValue }
      });
    });
  }

  async submit(attemptId: string, _dto: SubmitQuizAttemptDto, actor: AttemptActor) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.findUnique({
        where: { id: attemptId },
        include: { quiz: { include: { questions: true, class_subject: true } } }
      });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      this.assertOwnsAttempt(attempt, actor);
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new ConflictException("Attempt sudah selesai");
      }
      const target = this.isExpired(attempt)
        ? AttemptStatus.AUTO_SUBMITTED
        : AttemptStatus.SUBMITTED;
      return this.finalizeWithinTx(tx, attempt, target);
    });
  }

  /** Auto-submit server-side semua attempt IN_PROGRESS yang waktu habis (scheduler/Cron). */
  async autoSubmitExpired(): Promise<{ submitted: number }> {
    const attempts = await prisma.quizAttempt.findMany({
      where: { status: AttemptStatus.IN_PROGRESS },
      include: { quiz: { include: { questions: true, class_subject: true } } }
    });
    let submitted = 0;
    for (const attempt of attempts) {
      if (this.isExpired(attempt)) {
        await prisma.$transaction(async (tx) => {
          await this.finalizeWithinTx(tx, attempt, AttemptStatus.AUTO_SUBMITTED);
        });
        submitted += 1;
      }
    }
    return { submitted };
  }

  async getAttempt(attemptId: string, actor: AttemptActor) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: true } } }
    });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
    this.assertOwnsAttempt(attempt, actor);
    return this.buildAttemptResponse(attempt, attempt.quiz, new Date());
  }

  /** Scope SENDIRI (SISWA): attempt harus milik actor; staff boleh semua. */
  private isStaffScope(actor: AttemptActor): boolean {
    return !actor.roles.includes("SISWA");
  }

  private assertOwnsAttempt(attempt: { student_id: string }, actor: AttemptActor): void {
    if (this.isStaffScope(actor)) return;
    if (attempt.student_id !== actor.userId) {
      throw new ForbiddenException("Akses ditolak: attempt milik siswa lain");
    }
  }

  private isExpired(attempt: AttemptWithQuiz): boolean {
    const deadline = attempt.started_at.getTime() + attempt.quiz.duration_min * 60000;
    return Date.now() > deadline;
  }

  /** Finalisasi: set status + skor, lalu tulis Grade KUIS (dalam transaksi yang sama). */
  private async finalizeWithinTx(
    tx: Prisma.TransactionClient,
    attempt: AttemptWithQuiz,
    target: AttemptStatus
  ) {
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException("Attempt sudah selesai");
    }
    const answers = readAnswerMap(attempt.answers);
    const total = attempt.quiz.questions.length;
    let correct = 0;
    for (const q of attempt.quiz.questions) {
      const result = gradeAnswer(q.type, q.correct_answer, answers[q.id]?.answer);
      if (result.graded && result.correct) correct += 1;
    }
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const updated = await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: { status: target, submitted_at: new Date(), score }
    });

    const now = new Date();
    const label = computeSemesterLabel(now);
    await tx.grade.upsert({
      where: {
        student_id_class_subject_id_semester_type_source_id: {
          student_id: attempt.student_id,
          class_subject_id: attempt.quiz.class_subject_id,
          semester: attempt.quiz.class_subject?.semester ?? label.semester,
          type: GradeType.KUIS,
          source_id: attempt.id
        }
      },
      create: {
        student_id: attempt.student_id,
        class_subject_id: attempt.quiz.class_subject_id,
        semester: attempt.quiz.class_subject?.semester ?? label.semester,
        academic_year: label.academicYear,
        type: GradeType.KUIS,
        source_id: attempt.id,
        score,
        note: `Kuis: ${attempt.quiz.title}`
      },
      update: { score, note: `Kuis: ${attempt.quiz.title}` }
    });

    return updated;
  }

  private buildAttemptResponse(
    attempt: { id: string; status: AttemptStatus; started_at: Date; score: number | null },
    quiz: {
      duration_min: number;
      shuffle_questions: boolean;
      questions: {
        id: string;
        type: QuestionType;
        text: string;
        options: Prisma.JsonValue;
        correct_answer: string | null;
        explanation: string | null;
        difficulty: string;
        tags: string[];
      }[];
    },
    now: Date
  ) {
    const inProgress = attempt.status === AttemptStatus.IN_PROGRESS;
    const questions = quiz.shuffle_questions
      ? seededShuffle(attempt.id, quiz.questions)
      : quiz.questions;
    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        started_at: attempt.started_at,
        remaining_seconds: inProgress
          ? remainingSeconds(attempt.started_at, quiz.duration_min, now)
          : 0,
        score: attempt.score
      },
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        explanation: q.explanation,
        // correct_answer hanya ditampilkan setelah attempt selesai
        ...(inProgress ? {} : { correct_answer: q.correct_answer })
      }))
    };
  }
}
