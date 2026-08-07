import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { prisma } from "@openlms/database";
import { AssessmentStatus, AttemptStatus, GradeType, QuestionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { ALLOWED_ACTIVITY_EVENTS } from "./exam.constants";
import { hashToken, studentQuestionView, validateTokenFormat } from "./exam.util";
import {
  computeAutoScore,
  computeSemesterLabel,
  latestAnswersByQuestion,
  readJsonObject,
  remainingSeconds,
  seededIndex,
  seededShuffle
} from "../quiz/quiz.util";
import {
  StartExamAttemptDto,
  SaveExamAnswersDto,
  GradeExamAttemptDto,
  LogExamActivityDto
} from "./dto/exam-attempt.dto";

/** Aktor request yang diteruskan controller (dari requestContext AuthGuard). */
export interface AttemptActor {
  userId: string;
  roles: string[];
}

/**
 * ExamAttemptService — start attempt (token sekali pakai, satu akun satu sesi,
 * randomisasi deterministik), autosave idempotent (15 detik), auto-submit
 * server-side, auto-grade PG/isian + manual-grade esai, log aktivitas, Grade sumatif.
 * prd04 §5.A.6; docs/05 M-EXAM-T4..T9.
 * RBAC: SISWA (exam:attempt:self) selalu dikunci ke actor.userId — student_id
 * dari client DIIGNOR untuk scope SENDIRI; staff (exam:attempt:school /
 * exam:write:school) boleh mulai atas nama siswa memakai dto.student_id.
 * Semua operasi mutasi/baca memeriksa kepemilikan attempt (anti-IDOR).
 */
@Injectable()
export class ExamAttemptService {
  // ---------------- Start (M-EXAM-T4) ----------------

  async start(
    sessionId: string,
    dto: StartExamAttemptDto,
    actor: AttemptActor,
    ip?: string | null
  ) {
    if (!validateTokenFormat(dto.access_token)) {
      throw new BadRequestException("Format token sesi tidak valid");
    }
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true }
    });
    if (!session) throw new NotFoundException("Sesi ujian tidak ditemukan");

    const now = new Date();
    if (now < session.starts_at || now > session.ends_at) {
      throw new ConflictException("Sesi ujian belum dibuka atau sudah ditutup");
    }
    const workableStatuses: AssessmentStatus[] = [
      AssessmentStatus.PUBLISHED,
      AssessmentStatus.ONGOING
    ];
    if (!workableStatuses.includes(session.exam.status)) {
      throw new ConflictException(`Ujian berstatus ${session.exam.status}, tidak dapat dikerjakan`);
    }

    const tokenHash = hashToken(dto.access_token);
    if (!session.access_token || session.access_token !== tokenHash) {
      throw new UnauthorizedException("Token sesi tidak valid");
    }
    if (session.token_expires_at && now > session.token_expires_at) {
      throw new UnauthorizedException("Token sesi sudah kedaluwarsa");
    }

    // Anti-IDOR: SISWA selalu mengerjakan sebagai dirinya sendiri (student_id
    // dari client diabaikan). Staff diperbolehkan memakai dto.student_id
    // (guard: exam:attempt:school / exam:write:school) — wajib diisi.
    const staffScope = this.isStaffScope(actor);
    if (staffScope && !dto.student_id) {
      throw new BadRequestException("student_id wajib diisi untuk staf");
    }
    const studentId = staffScope ? (dto.student_id as string) : actor.userId;

    return prisma.$transaction(async (tx) => {
      // Satu akun satu sesi: unique(exam_session_id, student_id) di schema + cek eksplisit.
      const existing = await tx.examAttempt.findFirst({
        where: { exam_session_id: sessionId, student_id: studentId }
      });
      if (existing) {
        throw new ConflictException("Satu akun hanya boleh satu attempt per sesi ujian");
      }
      // Token sekali pakai: token yang sama tidak bisa membuka attempt lain.
      const reused = await tx.examAttempt.findFirst({
        where: { exam_session_id: sessionId, token_used: tokenHash }
      });
      if (reused) {
        throw new ConflictException("Token sesi sudah dipakai untuk attempt lain");
      }

      await tx.exam.updateMany({
        where: { id: session.exam.id, status: AssessmentStatus.PUBLISHED },
        data: { status: AssessmentStatus.ONGOING }
      });

      const packages = await tx.examPackage.findMany({ where: { exam_id: session.exam.id } });
      if (packages.length === 0) {
        throw new ConflictException("Ujian belum memiliki paket soal");
      }
      // Acak paket per siswa — deterministik per (sesi, siswa) agar stabil.
      const packageIndex = seededIndex(`${sessionId}:${studentId}`, packages.length);
      const pkg = packages[packageIndex] as (typeof packages)[number];

      const deviceInfo = (
        dto.device_info ? { initial: dto.device_info, activities: [] } : { activities: [] }
      ) as Prisma.InputJsonValue;

      const attempt = await tx.examAttempt.create({
        data: {
          exam_session_id: sessionId,
          student_id: studentId,
          exam_package_id: pkg.id,
          token_used: tokenHash,
          started_at: now,
          status: AttemptStatus.IN_PROGRESS,
          device_info: deviceInfo,
          ip_address: ip ?? null
        }
      });

      const questions = await tx.question.findMany({ where: { exam_package_id: pkg.id } });
      const ordered = seededShuffle(attempt.id, questions);
      return {
        attempt: {
          id: attempt.id,
          status: attempt.status,
          started_at: attempt.started_at,
          remaining_seconds: remainingSeconds(attempt.started_at, session.exam.duration_min, now)
        },
        package: { id: pkg.id, name: pkg.name, total_score: pkg.total_score },
        questions: ordered.map((q) => studentQuestionView(q, attempt.id, pkg.shuffle_options))
      };
    });
  }

  // ---------------- Autosave idempotent batch (M-EXAM-T5 / G-01) ----------------

  /**
   * Simpan BANYAK jawaban dalam SATU transaksi (G-01) — dikirim client tiap 15
   * detik untuk mengurangi round-trip 2000 siswa. Idempotency key header
   * di-unik-kan per soal (`<key>:<question_id>`) agar sesuai unique
   * (attempt_id, idempotency_key) dan batch retry tidak menduplikasi log.
   * Jawaban tetap append-only di ExamAnswerLog (audit); finalisasi grade
   * memakai jawaban terbaru per soal.
   */
  async saveAnswers(
    attemptId: string,
    dto: SaveExamAnswersDto,
    actor: AttemptActor,
    idempotencyKey?: string,
    _ip?: string | null
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException("Header Idempotency-Key wajib untuk autosave");
    }
    if (!dto.answers || dto.answers.length === 0) {
      throw new BadRequestException("answers tidak boleh kosong");
    }
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        include: { exam_session: { include: { exam: true } } }
      });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      this.assertOwnsAttempt(attempt, actor);
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new ConflictException("Attempt sudah selesai");
      }
      if (this.isExpired(attempt.started_at, attempt.exam_session.exam.duration_min)) {
        await this.finalizeWithinTx(tx, attempt, AttemptStatus.AUTO_SUBMITTED);
        throw new ConflictException("Waktu ujian habis; attempt di-auto-submit");
      }

      // Validasi semua soal sekaligus (hindari N+1): semua harus milik paket attempt.
      const questionIds = [...new Set(dto.answers.map((a) => a.question_id))];
      const questions = await tx.question.findMany({
        where: { id: { in: questionIds }, exam_package_id: attempt.exam_package_id },
        select: { id: true }
      });
      const owned = new Set(questions.map((q) => q.id));
      const unknown = questionIds.filter((id) => !owned.has(id));
      if (unknown.length > 0) {
        throw new BadRequestException("Soal tidak termasuk paket attempt ini");
      }

      // Dedupe per (key) agar dua item question_id sama dalam satu batch tidak
      // melanggar unique (attempt_id, idempotency_key).
      const seen = new Set<string>();
      const entries: { item: SaveExamAnswersDto["answers"][number]; key: string }[] = [];
      for (const item of dto.answers) {
        const key = `${idempotencyKey}:${item.question_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ item, key });
      }

      const existingLogs = await tx.examAnswerLog.findMany({
        where: {
          attempt_id: attemptId,
          idempotency_key: { in: entries.map((e) => e.key) }
        },
        select: { idempotency_key: true }
      });
      const existingKeys = new Set(existingLogs.map((l) => l.idempotency_key));

      let saved = 0;
      for (const { item, key } of entries) {
        if (existingKeys.has(key)) continue;
        await tx.examAnswerLog.create({
          data: {
            attempt_id: attemptId,
            question_id: item.question_id,
            answer: item.answer ?? null,
            is_auto_saved: true,
            saved_at: new Date(),
            idempotency_key: key
          }
        });
        saved += 1;
      }
      return { saved, duplicated: entries.length - saved };
    });
  }

  // ---------------- Submit & auto-submit (M-EXAM-T6/T7) ----------------

  async submit(attemptId: string, actor: AttemptActor) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      this.assertOwnsAttempt(attempt, actor);
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new ConflictException("Attempt sudah selesai");
      }
      const session = await tx.examSession.findUnique({
        where: { id: attempt.exam_session_id },
        include: { exam: true }
      });
      if (!session) throw new NotFoundException("Sesi ujian tidak ditemukan");
      const target = this.isExpired(attempt.started_at, session.exam.duration_min)
        ? AttemptStatus.AUTO_SUBMITTED
        : AttemptStatus.SUBMITTED;
      return this.finalizeWithinTx(tx, attempt, target);
    });
  }

  /** Auto-submit server-side (M-EXAM-T6). TODO: emit event `exam:force-submit` via Socket.IO. */
  async autoSubmitExpired(): Promise<{ submitted: number }> {
    const attempts = await prisma.examAttempt.findMany({
      where: { status: AttemptStatus.IN_PROGRESS, submitted_at: null },
      include: { exam_session: { include: { exam: true } } }
    });
    let submitted = 0;
    for (const attempt of attempts) {
      if (this.isExpired(attempt.started_at, attempt.exam_session.exam.duration_min)) {
        await prisma.$transaction(async (tx) => {
          await this.finalizeWithinTx(tx, attempt, AttemptStatus.AUTO_SUBMITTED);
        });
        submitted += 1;
      }
    }
    return { submitted };
  }

  /** Proctor/admin: tandai attempt EXPIRED (mis. kecurangan/abandon). */
  async markExpired(attemptId: string) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new ConflictException("Attempt sudah selesai");
      }
      return tx.examAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED, submitted_at: new Date() }
      });
    });
  }

  // ---------------- Manual grade esai (M-EXAM-T7) ----------------

  async manualGrade(attemptId: string, dto: GradeExamAttemptDto) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          exam_session: { include: { exam: true } },
          exam_package: { include: { questions: true } }
        }
      });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      const gradeableStatuses: AttemptStatus[] = [
        AttemptStatus.SUBMITTED,
        AttemptStatus.AUTO_SUBMITTED
      ];
      if (!gradeableStatuses.includes(attempt.status)) {
        throw new ConflictException("Nilai manual hanya dapat diisi setelah attempt submit");
      }
      const updated = await tx.examAttempt.update({
        where: { id: attemptId },
        data: { score_manual: dto.score_manual }
      });

      const logs = await tx.examAnswerLog.findMany({ where: { attempt_id: attemptId } });
      const latest = latestAnswersByQuestion(logs);
      const auto = computeAutoScore(attempt.exam_package.questions, latest);
      await this.writeGrade(tx, attempt, attempt.exam_session, attempt.exam_package, auto);
      return updated;
    });
  }

  // ---------------- Log aktivitas (M-EXAM-T9) ----------------

  async logActivity(
    attemptId: string,
    dto: LogExamActivityDto,
    actor: AttemptActor,
    ip?: string | null
  ) {
    if (!ALLOWED_ACTIVITY_EVENTS.includes(dto.event as (typeof ALLOWED_ACTIVITY_EVENTS)[number])) {
      throw new BadRequestException(
        `Event tidak dikenal; diizinkan: ${ALLOWED_ACTIVITY_EVENTS.join(", ")}`
      );
    }
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
    this.assertOwnsAttempt(attempt, actor);

    const current = readJsonObject(attempt.device_info);
    const activities = Array.isArray(current.activities) ? (current.activities as unknown[]) : [];
    const entry = {
      event: dto.event,
      payload: dto.payload ?? {},
      device: dto.device_info ?? null,
      ip: ip ?? null,
      at: new Date().toISOString()
    };
    return prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        device_info: {
          ...current,
          activities: [...activities, entry]
        } as Prisma.InputJsonValue
      }
    });
  }

  // ---------------- GET attempt + logs ----------------

  async getAttempt(attemptId: string, actor: AttemptActor) {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam_session: { include: { exam: true } },
        exam_package: { include: { questions: true } }
      }
    });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
    this.assertOwnsAttempt(attempt, actor);

    const logs = await prisma.examAnswerLog.findMany({
      where: { attempt_id: attemptId },
      orderBy: { saved_at: "asc" }
    });
    const latest = latestAnswersByQuestion(logs);
    const inProgress = attempt.status === AttemptStatus.IN_PROGRESS;

    const questions = seededShuffle(attempt.id, attempt.exam_package.questions);
    return {
      attempt: {
        id: attempt.id,
        exam_id: attempt.exam_session.exam_id,
        exam_title: attempt.exam_session.exam.title,
        session_name: attempt.exam_session.name,
        package_name: attempt.exam_package.name,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        remaining_seconds: inProgress
          ? remainingSeconds(attempt.started_at, attempt.exam_session.exam.duration_min)
          : 0,
        score_auto: attempt.score_auto,
        score_manual: attempt.score_manual,
        ip_address: attempt.ip_address
      },
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: inProgress ? studentQuestionView(q, attempt.id, true).options : q.options,
        explanation: q.explanation,
        // correct_answer hanya ditampilkan setelah submit (siswa/guru lihat hasil).
        ...(inProgress ? {} : { correct_answer: q.correct_answer }),
        my_answer: latest.get(q.id) ?? null
      })),
      answer_logs: logs
    };
  }

  async getLogs(attemptId: string, actor: AttemptActor) {
    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
    this.assertOwnsAttempt(attempt, actor);
    const logs = await prisma.examAnswerLog.findMany({
      where: { attempt_id: attemptId },
      orderBy: { saved_at: "asc" }
    });
    const deviceInfo = readJsonObject(attempt.device_info);
    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        ip_address: attempt.ip_address
      },
      answer_logs: logs,
      activity_logs: Array.isArray(deviceInfo.activities) ? deviceInfo.activities : []
    };
  }

  // ---------------- Internal ----------------

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

  private isExpired(startedAt: Date, durationMin: number): boolean {
    return Date.now() > startedAt.getTime() + durationMin * 60000;
  }

  /**
   * Finalisasi attempt: validasi state machine (IN_PROGRESS → SUBMITTED/
   * AUTO_SUBMITTED), hitung score_auto, simpan, lalu tulis Grade sumatif.
   */
  private async finalizeWithinTx(
    tx: Prisma.TransactionClient,
    attempt: Prisma.ExamAttemptGetPayload<Record<string, never>>,
    target: AttemptStatus
  ) {
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ConflictException("Attempt sudah selesai");
    }
    const session = await tx.examSession.findUnique({
      where: { id: attempt.exam_session_id },
      include: { exam: true }
    });
    if (!session) throw new NotFoundException("Sesi ujian tidak ditemukan");
    const pkg = await tx.examPackage.findUnique({
      where: { id: attempt.exam_package_id },
      include: { questions: true }
    });
    if (!pkg) throw new NotFoundException("Paket soal tidak ditemukan");

    const logs = await tx.examAnswerLog.findMany({ where: { attempt_id: attempt.id } });
    const latest = latestAnswersByQuestion(logs);
    const auto = computeAutoScore(pkg.questions, latest);

    const updated = await tx.examAttempt.update({
      where: { id: attempt.id },
      data: { status: target, submitted_at: new Date(), score_auto: auto.score }
    });

    await this.writeGrade(tx, attempt, session, pkg, auto);
    return updated;
  }

  /**
   * Tulis Grade sumatif (prd04 §5.A.6 → e-Rapor). Grade.class_subject_id di-resolve
   * dari kelas aktif siswa + subject ujian; bila tidak ditemukan, grade dilewati dan
   * warning dicatat ke device_info (gap schema: Exam belum terhubung ClassSubject).
   */
  private async writeGrade(
    tx: Prisma.TransactionClient,
    attempt: Prisma.ExamAttemptGetPayload<Record<string, never>>,
    session: Prisma.ExamSessionGetPayload<{ include: { exam: true } }>,
    pkg: Prisma.ExamPackageGetPayload<{ include: { questions: true } }>,
    auto: ReturnType<typeof computeAutoScore>
  ): Promise<void> {
    const classSubjectId = await this.resolveClassSubjectId(
      tx,
      attempt.student_id,
      session.exam.subject_id
    );
    if (!classSubjectId) {
      const current = readJsonObject(attempt.device_info);
      await tx.examAttempt.update({
        where: { id: attempt.id },
        data: {
          device_info: {
            ...current,
            warning: "grade_skipped_no_class_subject"
          } as Prisma.InputJsonValue
        }
      });
      return;
    }

    const label = computeSemesterLabel(new Date());
    const manualCount = pkg.questions.filter((q) => q.type === QuestionType.ESAI).length;
    const autoCount = auto.totalCount;
    const totalQ = autoCount + manualCount;
    let finalScore: number;
    if (totalQ === 0) {
      finalScore = 0;
    } else {
      const autoPart = auto.score ?? 0;
      const manualPart = attempt.score_manual ?? (manualCount > 0 ? 0 : null);
      finalScore = Math.round(
        (autoCount / totalQ) * autoPart + (manualCount / totalQ) * (manualPart ?? 0)
      );
    }

    await tx.grade.upsert({
      where: {
        student_id_class_subject_id_semester_type_source_id: {
          student_id: attempt.student_id,
          class_subject_id: classSubjectId,
          semester: label.semester,
          type: GradeType.SUMATIF,
          source_id: attempt.id
        }
      },
      create: {
        student_id: attempt.student_id,
        class_subject_id: classSubjectId,
        semester: label.semester,
        academic_year: label.academicYear,
        type: GradeType.SUMATIF,
        source_id: attempt.id,
        score: finalScore,
        note: `Ujian: ${session.exam.title} (${pkg.name})`
      },
      update: {
        score: finalScore,
        note: `Ujian: ${session.exam.title} (${pkg.name})`
      }
    });
  }

  /** Cari ClassSubject (kelas aktif siswa + subject ujian) untuk kolom Grade. */
  private async resolveClassSubjectId(
    tx: Prisma.TransactionClient,
    studentId: string,
    subjectId: string
  ): Promise<string | null> {
    const enrollment = await tx.enrollment.findFirst({
      where: { student_id: studentId, status: "ACTIVE" },
      orderBy: { created_at: "desc" },
      select: { class_id: true }
    });
    if (!enrollment) return null;
    const classSubject = await tx.classSubject.findFirst({
      where: { class_id: enrollment.class_id, subject_id: subjectId },
      select: { id: true }
    });
    return classSubject?.id ?? null;
  }
}
