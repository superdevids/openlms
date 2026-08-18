import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { prisma } from "@opensis/database";
import { AssessmentStatus, AttemptStatus, GradeType, QuestionType, Role } from "@prisma/client";
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
import { EXAM_FORCE_SUBMIT_EVENT, EXAM_TICK_EVENT } from "../notifications/notification-events";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import {
  StartExamAttemptDto,
  SaveExamAnswersDto,
  GradeExamAttemptDto,
  LogExamActivityDto
} from "./dto/exam-attempt.dto";
import { writeAudit } from "../lms/lms-audit";

/** Ukuran batch auto-submit (R-31) — batasi memory per loop, lanjut ke halaman berikut. */
const AUTO_SUBMIT_BATCH = 100;

/** Ambang sisa waktu (detik) untuk event `exam:tick` (R-29) — server-authoritative. */
const EXAM_TICK_THRESHOLDS = [60, 30, 10, 0] as const;

/** Role staf yang berhak mengakses attempt siswa lain (penilai/pengawas).
 *  Whitelist eksplisit — hardening anti-IDOR: role non-staf (CALON_SISWA,
 *  WALI_MURID, dll.) tidak boleh bypass ownership meski lolos permission guard. */
const STAFF_ATTEMPT_ROLES = new Set<Role>([
  "SUPERADMIN",
  "OPERATOR",
  "WAKEPSEK",
  "KEPSEK",
  "AUDITOR",
  "GURU",
  "BK",
  "KAPRODI",
  "KEUANGAN"
]);

/** Aktor request yang diteruskan controller (dari requestContext AuthGuard). */
export interface AttemptActor {
  userId: string;
  roles: string[];
  /** Kelas yang diampu/diikuti (ClassSubject.teacher_id + Enrollment) — dari requestContext. */
  classIds?: string[];
  /** Kelas di mana user menjadi wali kelas (Class.homeroom_teacher_id) — dari requestContext. */
  homeroomClassId?: string | null;
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
  /** Ambang tick terakhir per attempt — hindari emit berulang untuk ambang sama (R-29). */
  private readonly lastTickSent = new Map<string, number>();

  constructor(private readonly realtime: RealtimeGateway) {}

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

    // Anti-IDOR lintas kelas: role scope KELAS (GURU/BK) hanya boleh memulai
    // attempt untuk siswa di kelas yang diampu/wali (hardening over-permission).
    if (staffScope && studentId !== actor.userId) {
      const allowed = await this.canAccessStudent(actor, studentId);
      if (!allowed) {
        throw new ForbiddenException("Akses ditolak: siswa di luar kelas yang diampu");
      }
    }

    const result = await prisma.$transaction(async (tx) => {
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

      // PERF-05: unique (exam_session_id, token_used) di schema adalah jaring
      // pengaman race — dua start() paralel dengan token sama bisa lolos kedua
      // guard findFirst di atas; salah satunya gagal di sini dengan P2002.
      let attempt;
      try {
        attempt = await tx.examAttempt.create({
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
      } catch (err) {
        if (this.isUniqueViolation(err)) {
          throw new ConflictException("Token sesi sudah dipakai");
        }
        throw err;
      }

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

    // R-12: mulai attempt (bukan autosave) dicatat ke AuditLog.
    await writeAudit({
      ctx: actor,
      action: "CREATE",
      entity: "exam_attempt",
      entityId: result.attempt.id,
      after: {
        exam_session_id: sessionId,
        student_id: studentId,
        status: AttemptStatus.IN_PROGRESS
      }
    });
    return result;
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
      await this.assertOwnsAttempt(attempt, actor);
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

      // PERF-06: satu createMany untuk seluruh entri baru (bukan loop create
      // serial N insert). skipDuplicates: true memakai unique
      // (attempt_id, idempotency_key) di schema — duplikat yang lolos filter
      // (race concurrent autosave) di-skip oleh Postgres; saved dihitung dari
      // result.count, bukan panjang array.
      const toCreate = entries
        .filter(({ key }) => !existingKeys.has(key))
        .map(({ item, key }) => ({
          attempt_id: attemptId,
          question_id: item.question_id,
          answer: item.answer ?? null,
          is_auto_saved: true,
          saved_at: new Date(),
          idempotency_key: key
        }));
      const saved =
        toCreate.length > 0
          ? (await tx.examAnswerLog.createMany({ data: toCreate, skipDuplicates: true })).count
          : 0;
      return { saved, duplicated: entries.length - saved };
    });
  }

  // ---------------- Submit & auto-submit (M-EXAM-T6/T7) ----------------

  async submit(attemptId: string, actor: AttemptActor) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      await this.assertOwnsAttempt(attempt, actor);
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
      const updated = await this.finalizeWithinTx(tx, attempt, target);
      // R-12: submit attempt (bukan autosave) dicatat ke AuditLog.
      await writeAudit({
        ctx: actor,
        action: "UPDATE",
        entity: "exam_attempt",
        entityId: attempt.id,
        before: { status: attempt.status },
        after: { status: target, score_auto: updated.score_auto }
      });
      return updated;
    });
  }

  /**
   * Auto-submit server-side (M-EXAM-T6).
   * - Batch `take 100` loop (R-31): hindari memuat seluruh attempt IN_PROGRESS
   *   sekaligus; filter `started_at < now` meniadakan attempt yang belum dibuka.
   * - Finalisasi tiap attempt yang expired dalam SATU `$transaction` per batch
   *   (sebelumnya 1 transaksi per attempt = overhead N×). Bila salah satu
   *   attempt gagal (mis. race submit), seluruh batch di-rollback dan attempt
   *   yang belum selesai diproses ulang pada cron berikutnya.
   * - Tiap attempt yang expired di-finalize lalu push `exam:force-submit`
   *   ke room `exam:{sessionId}` (R-29) agar klien segera submit UI-nya.
   */
  async autoSubmitExpired(): Promise<{ submitted: number }> {
    const now = new Date();
    let submitted = 0;
    let cursor = 0;
    for (;;) {
      const attempts = await prisma.examAttempt.findMany({
        where: {
          status: AttemptStatus.IN_PROGRESS,
          submitted_at: null,
          started_at: { lt: now }
        },
        orderBy: { id: "asc" },
        take: AUTO_SUBMIT_BATCH,
        skip: cursor,
        include: { exam_session: { include: { exam: true } } }
      });
      if (attempts.length === 0) break;
      cursor += attempts.length;
      const expired = attempts.filter((a) =>
        this.isExpired(a.started_at, a.exam_session.exam.duration_min)
      );
      if (expired.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const attempt of expired) {
            const updated = await this.finalizeWithinTx(tx, attempt, AttemptStatus.AUTO_SUBMITTED);
            // R-12: force-submit (auto) dicatat ke AuditLog — aktor sistem.
            await writeAudit({
              ctx: { userId: "system", roles: [] },
              action: "UPDATE",
              entity: "exam_attempt",
              entityId: attempt.id,
              before: { status: attempt.status },
              after: { status: AttemptStatus.AUTO_SUBMITTED, score_auto: updated.score_auto }
            });
          }
        });
        for (const attempt of expired) {
          this.realtime.emitToExam(attempt.exam_session_id, EXAM_FORCE_SUBMIT_EVENT, {
            attemptId: attempt.id
          });
        }
        submitted += expired.length;
      }
      if (attempts.length < AUTO_SUBMIT_BATCH) break;
    }
    return { submitted };
  }

  /**
   * Push `exam:tick` server-authoritative (R-29) — sisa waktu dikirim saat
   * menembus ambang 60/30/10/0 detik. Dipanggil dari cron auto-submit (setiap
   * menit); ambang yang sama tidak dikirim ulang per attempt (lastTickSent).
   * Best-effort: klien tetap punya countdown lokal; tick mengoreksi drift.
   */
  async tickActiveExams(): Promise<{ ticked: number }> {
    const now = new Date();
    const attempts = await prisma.examAttempt.findMany({
      where: {
        status: AttemptStatus.IN_PROGRESS,
        submitted_at: null,
        started_at: { lt: now }
      },
      orderBy: { id: "asc" },
      take: AUTO_SUBMIT_BATCH,
      include: { exam_session: { include: { exam: true } } }
    });
    let ticked = 0;
    for (const attempt of attempts) {
      const remaining = remainingSeconds(
        attempt.started_at,
        attempt.exam_session.exam.duration_min,
        now
      );
      // Ambang yang baru ditembus (0..60). >60 detik → belum perlu tick.
      const threshold = EXAM_TICK_THRESHOLDS.find((t) => remaining <= t);
      if (threshold === undefined) {
        this.lastTickSent.delete(attempt.id);
        continue;
      }
      if (this.lastTickSent.get(attempt.id) === threshold) continue;
      this.lastTickSent.set(attempt.id, threshold);
      this.realtime.emitToExam(attempt.exam_session_id, EXAM_TICK_EVENT, {
        attemptId: attempt.id,
        remainingSeconds: remaining
      });
      ticked += 1;
    }
    return { ticked };
  }

  /** Proctor/admin: tandai attempt EXPIRED (mis. kecurangan/abandon). */
  async markExpired(attemptId: string, actor: AttemptActor) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      await this.assertOwnsAttempt(attempt, actor);
      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new ConflictException("Attempt sudah selesai");
      }
      const updated = await tx.examAttempt.update({
        where: { id: attemptId },
        data: { status: AttemptStatus.EXPIRED, submitted_at: new Date() }
      });
      // R-12: force-submit oleh proctor dicatat ke AuditLog.
      await writeAudit({
        ctx: actor,
        action: "UPDATE",
        entity: "exam_attempt",
        entityId: attempt.id,
        before: { status: attempt.status },
        after: { status: AttemptStatus.EXPIRED }
      });
      return updated;
    });
  }

  // ---------------- Manual grade esai (M-EXAM-T7) ----------------

  async manualGrade(attemptId: string, dto: GradeExamAttemptDto, actor: AttemptActor) {
    return prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        include: {
          exam_session: { include: { exam: true } },
          exam_package: { include: { questions: true } }
        }
      });
      if (!attempt) throw new NotFoundException("Attempt tidak ditemukan");
      await this.assertOwnsAttempt(attempt, actor);
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
    await this.assertOwnsAttempt(attempt, actor);

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
    await this.assertOwnsAttempt(attempt, actor);

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
        exam_session_id: attempt.exam_session_id,
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
    await this.assertOwnsAttempt(attempt, actor);
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

  /** Scope SENDIRI (SISWA): attempt harus milik actor; staff boleh semua.
   *  Hanya role dalam STAFF_ATTEMPT_ROLES (whitelist) yang dianggap staff —
   *  role non-staf lain tidak boleh membaca attempt siswa lain (anti-IDOR). */
  private isStaffScope(actor: AttemptActor): boolean {
    return actor.roles.some((r) => STAFF_ATTEMPT_ROLES.has(r as Role));
  }

  /** Role whitelist yang scope-nya SEKOLAH — dapat mengakses attempt siswa mana pun. */
  private hasSchoolScope(actor: AttemptActor): boolean {
    return actor.roles.some((r) =>
      ["SUPERADMIN", "OPERATOR", "WAKEPSEK", "KEPSEK", "AUDITOR", "KAPRODI", "KEUANGAN"].includes(r)
    );
  }

  /**
   * Otorisasi data-level attempt (hardening over-permission GURU lintas kelas):
   * - scope SEKOLAH (SUPERADMIN/OPERATOR/WAKEPSEK/KEPSEK/AUDITOR/KAPRODI/KEUANGAN) → true.
   * - GURU/BK (scope KELAS) → true hanya jika siswa punya Enrollment ACTIVE di
   *   kelas yang diajar (classIds dari ClassSubject.teacher_id) ATAU di kelas
   *   di mana aktor menjadi wali kelas (homeroomClassId dari Class.homeroom_teacher_id).
   * - role lain → false. Satu query Enrollment; nol query untuk scope SEKOLAH.
   */
  private async canAccessStudent(actor: AttemptActor, studentId: string): Promise<boolean> {
    if (this.hasSchoolScope(actor)) return true;
    if (actor.roles.some((r) => r === "GURU" || r === "BK")) {
      const classIds = actor.classIds ?? [];
      const homeroomClassId = actor.homeroomClassId ?? null;
      if (classIds.length === 0 && !homeroomClassId) return false;
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          student_id: studentId,
          status: "ACTIVE",
          OR: [
            { class_id: { in: classIds } },
            ...(homeroomClassId ? [{ class_id: homeroomClassId }] : [])
          ]
        },
        select: { id: true }
      });
      return enrollment !== null;
    }
    return false;
  }

  private async assertOwnsAttempt(
    attempt: { student_id: string },
    actor: AttemptActor
  ): Promise<void> {
    if (this.isStaffScope(actor)) {
      // Staff boleh mengakses attempt miliknya sendiri; untuk attempt siswa lain
      // wajib lolos otorisasi data-level (scope SEKOLAH atau kelas yang diampu).
      if (attempt.student_id !== actor.userId) {
        const allowed = await this.canAccessStudent(actor, attempt.student_id);
        if (!allowed) {
          throw new ForbiddenException("Akses ditolak: siswa di luar kelas yang diampu");
        }
      }
      return;
    }
    if (attempt.student_id !== actor.userId) {
      throw new ForbiddenException("Akses ditolak: attempt milik siswa lain");
    }
  }

  private isExpired(startedAt: Date, durationMin: number): boolean {
    return Date.now() > startedAt.getTime() + durationMin * 60000;
  }

  /** Deteksi error unique constraint Prisma (P2002) — dipakai start() (PERF-05). */
  private isUniqueViolation(err: unknown): boolean {
    return (err as { code?: string } | undefined)?.code === "P2002";
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
