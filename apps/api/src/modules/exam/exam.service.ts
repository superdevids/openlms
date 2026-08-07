import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { prisma } from "@openlms/database";
import { AssessmentStatus, AttemptStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { DEFAULT_TOKEN_TTL_MINUTES, generateAccessToken, hashToken } from "./exam.util";
import { gradeAnswer, latestAnswersByQuestion } from "../quiz/quiz.util";
import {
  CreateExamDto,
  UpdateExamDto,
  CreateExamPackageDto,
  UpdateExamPackageDto,
  CreateExamSessionDto,
  GenerateSessionTokenDto
} from "./dto/exam.dto";

/**
 * ExamService — ujian, paket A/B/C, sesi, token pengawas, analisis butir soal.
 * prd04 §5.A.6; docs/05 M-EXAM-T1/T2/T3/T10.
 * RBAC enforced di ExamController (exam:write:school / exam:attempt:self|school /
 * exam:token:* / exam:grade-esai:class / exam:analysis:read:school); service
 * menerima createdBy dari aktor terautentikasi.
 */
@Injectable()
export class ExamService {
  // ---------------- Exam ----------------

  async create(dto: CreateExamDto, createdBy: string) {
    return prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        subject_id: dto.subject_id,
        duration_min: dto.duration_min,
        status: AssessmentStatus.DRAFT,
        created_by: createdBy
      }
    });
  }

  async findAll(query: { subject_id?: string; status?: AssessmentStatus; q?: string }) {
    const where: Prisma.ExamWhereInput = {};
    if (query.subject_id) where.subject_id = query.subject_id;
    if (query.status) where.status = query.status;
    if (query.q) where.title = { contains: query.q, mode: "insensitive" };
    const items = await prisma.exam.findMany({
      where,
      include: { _count: { select: { packages: true, sessions: true } } },
      orderBy: { created_at: "desc" }
    });
    return { items, total: items.length };
  }

  async findOne(id: string) {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        packages: { include: { _count: { select: { questions: true } } } },
        sessions: true
      }
    });
    if (!exam) throw new NotFoundException("Ujian tidak ditemukan");
    return exam;
  }

  async update(id: string, dto: UpdateExamDto) {
    await this.findOne(id);
    return prisma.exam.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.duration_min !== undefined && { duration_min: dto.duration_min })
      }
    });
  }

  async setStatus(id: string, status: AssessmentStatus) {
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException("Ujian tidak ditemukan");
    const allowed: Record<AssessmentStatus, AssessmentStatus[]> = {
      [AssessmentStatus.PUBLISHED]: [AssessmentStatus.DRAFT],
      [AssessmentStatus.CLOSED]: [
        AssessmentStatus.PUBLISHED,
        AssessmentStatus.ONGOING,
        AssessmentStatus.DRAFT
      ],
      [AssessmentStatus.ONGOING]: [AssessmentStatus.PUBLISHED],
      [AssessmentStatus.DRAFT]: [AssessmentStatus.CLOSED],
      [AssessmentStatus.ARCHIVED]: [AssessmentStatus.CLOSED]
    };
    if (!(allowed[status] ?? []).includes(exam.status)) {
      throw new ConflictException(`Tidak bisa ubah status ${exam.status} -> ${status}`);
    }
    return prisma.exam.update({ where: { id }, data: { status } });
  }

  // ---------------- ExamPackage ----------------

  async createPackage(examId: string, dto: CreateExamPackageDto) {
    await this.findOne(examId);
    return prisma.examPackage.create({
      data: {
        exam_id: examId,
        name: dto.name,
        total_score: dto.total_score ?? 100,
        shuffle_options: dto.shuffle_options ?? true
      }
    });
  }

  async listPackages(examId: string) {
    await this.findOne(examId);
    return prisma.examPackage.findMany({
      where: { exam_id: examId },
      include: { _count: { select: { questions: true } } },
      orderBy: { created_at: "asc" }
    });
  }

  async updatePackage(packageId: string, dto: UpdateExamPackageDto) {
    await prisma.examPackage.findUnique({ where: { id: packageId } }).then((p) => {
      if (!p) throw new NotFoundException("Paket soal tidak ditemukan");
    });
    return prisma.examPackage.update({
      where: { id: packageId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.total_score !== undefined && { total_score: dto.total_score }),
        ...(dto.shuffle_options !== undefined && { shuffle_options: dto.shuffle_options })
      }
    });
  }

  async addQuestion(packageId: string, questionId: string) {
    const pkg = await prisma.examPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException("Paket soal tidak ditemukan");
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException("Soal tidak ditemukan");
    if (question.exam_package_id && question.exam_package_id !== packageId) {
      throw new ConflictException("Soal sudah terpakai di paket lain");
    }
    return prisma.question.update({
      where: { id: questionId },
      data: { exam_package_id: packageId }
    });
  }

  async listPackageQuestions(packageId: string) {
    const pkg = await prisma.examPackage.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException("Paket soal tidak ditemukan");
    return prisma.question.findMany({
      where: { exam_package_id: packageId },
      orderBy: { created_at: "asc" }
    });
  }

  async removeQuestion(packageId: string, questionId: string): Promise<void> {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException("Soal tidak ditemukan");
    if (question.exam_package_id !== packageId) {
      throw new ConflictException("Soal bukan bagian dari paket ini");
    }
    await prisma.question.update({ where: { id: questionId }, data: { exam_package_id: null } });
  }

  // ---------------- ExamSession ----------------

  async createSession(examId: string, dto: CreateExamSessionDto) {
    await this.findOne(examId);
    const startsAt = new Date(dto.starts_at);
    const endsAt = new Date(dto.ends_at);
    if (endsAt <= startsAt) {
      throw new BadRequestException("ends_at harus lebih besar dari starts_at");
    }
    return prisma.examSession.create({
      data: {
        exam_id: examId,
        name: dto.name,
        starts_at: startsAt,
        ends_at: endsAt,
        target_class_id: dto.target_class_id ?? null,
        room: dto.room ?? null,
        is_serentak: dto.is_serentak ?? true
      }
    });
  }

  async listSessions(examId: string) {
    await this.findOne(examId);
    return prisma.examSession.findMany({
      where: { exam_id: examId },
      orderBy: { starts_at: "asc" }
    });
  }

  /**
   * Generate token sesi (M-EXAM-T3): 6 karakter tanpa 0/O/1/I, disimpan hash SHA-256.
   * Plaintext hanya dikembalikan SEKALI saat generate untuk dibagikan pengawas.
   */
  async generateToken(sessionId: string, dto: GenerateSessionTokenDto) {
    const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException("Sesi ujian tidak ditemukan");
    const plain = generateAccessToken();
    const hash = hashToken(plain);
    const ttlMin = dto.ttl_minutes ?? DEFAULT_TOKEN_TTL_MINUTES;
    const tokenExpiresAt = new Date(Date.now() + ttlMin * 60000);
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        access_token: hash,
        token_expires_at: tokenExpiresAt,
        token_generated_by: dto.generated_by
      }
    });
    return {
      access_token: plain,
      expires_at: tokenExpiresAt,
      length: plain.length,
      note: "Plaintext hanya ditampilkan sekali; simpan aman untuk dibagikan ke pengawas."
    };
  }

  async tokenStatus(sessionId: string) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { access_token: true, token_expires_at: true }
    });
    if (!session) throw new NotFoundException("Sesi ujian tidak ditemukan");
    const now = new Date();
    const active =
      session.access_token != null &&
      (session.token_expires_at == null || session.token_expires_at > now);
    return { token_active: active, token_expires_at: session.token_expires_at };
  }

  // ---------------- Item analysis (M-EXAM-T10) ----------------

  async itemAnalysis(examId: string, packageId?: string) {
    const where: Prisma.ExamPackageWhereInput = packageId
      ? { id: packageId, exam_id: examId }
      : { exam_id: examId };
    const packages = await prisma.examPackage.findMany({
      where,
      include: {
        questions: true,
        attempts: {
          where: { status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] } },
          select: { id: true }
        }
      }
    });

    const result: {
      package_id: string;
      package_name: string;
      items: {
        question_id: string;
        text: string;
        type: string;
        total_attempts: number;
        correct_count: number;
        percent_correct: number;
      }[];
    }[] = [];

    for (const pkg of packages) {
      const attemptIds = pkg.attempts.map((a) => a.id);
      const questionIds = pkg.questions.map((q) => q.id);
      const logs =
        attemptIds.length > 0 && questionIds.length > 0
          ? await prisma.examAnswerLog.findMany({
              where: { attempt_id: { in: attemptIds }, question_id: { in: questionIds } }
            })
          : [];

      const perQuestion = new Map<string, { total: number; correct: number; percent: number }>();
      const byAttempt = new Map<string, Map<string, string>>();
      for (const attemptId of attemptIds) {
        byAttempt.set(attemptId, new Map<string, string>());
      }
      for (const attemptId of attemptIds) {
        const attemptLogs = logs.filter((l) => l.attempt_id === attemptId);
        const latest = latestAnswersByQuestion(attemptLogs);
        byAttempt.set(attemptId, latest);
      }
      for (const q of pkg.questions) {
        let correct = 0;
        for (const attemptId of attemptIds) {
          const answer = byAttempt.get(attemptId)?.get(q.id) ?? "";
          const res = gradeAnswer(q.type, q.correct_answer, answer);
          if (res.correct) correct += 1;
        }
        const total = attemptIds.length;
        perQuestion.set(q.id, {
          total,
          correct,
          percent: total > 0 ? Math.round((correct / total) * 100) : 0
        });
      }

      result.push({
        package_id: pkg.id,
        package_name: pkg.name,
        items: pkg.questions.map((q) => {
          const stat = perQuestion.get(q.id) ?? { total: 0, correct: 0, percent: 0 };
          return {
            question_id: q.id,
            text: q.text,
            type: q.type,
            total_attempts: stat.total,
            correct_count: stat.correct,
            percent_correct: stat.percent
          };
        })
      });
    }
    return { packages: result };
  }
}
