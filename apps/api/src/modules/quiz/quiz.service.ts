import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@openlms/database";
import { AssessmentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { CreateQuizDto } from "./dto/create-quiz.dto";
import { UpdateQuizDto } from "./dto/update-quiz.dto";
import { ListQuizzesQueryDto } from "./dto/list-quizzes-query.dto";

/**
 * QuizService — CRUD kuis + transisi status DRAFT/PUBLISHED/ONGOING/CLOSED (prd04 §5.A.5).
 * RBAC enforced di QuizController (quiz:write:class untuk kelola; attempt
 * quiz:attempt:self/school); service menerima createdBy dari aktor terautentikasi.
 */
@Injectable()
export class QuizService {
  async create(dto: CreateQuizDto, createdBy: string) {
    return prisma.quiz.create({
      data: {
        class_subject_id: dto.class_subject_id,
        title: dto.title,
        description: dto.description ?? null,
        duration_min: dto.duration_min,
        open_at: dto.open_at ? new Date(dto.open_at) : null,
        close_at: dto.close_at ? new Date(dto.close_at) : null,
        shuffle_questions: dto.shuffle_questions ?? false,
        status: AssessmentStatus.DRAFT,
        created_by: createdBy
      }
    });
  }

  async findAll(query: ListQuizzesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.QuizWhereInput = {};
    if (query.class_subject_id) where.class_subject_id = query.class_subject_id;
    if (query.status) where.status = query.status;
    if (query.q) where.title = { contains: query.q, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        include: { _count: { select: { questions: true, attempts: true } } },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.quiz.count({ where })
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: true }
    });
    if (!quiz) throw new NotFoundException("Quiz tidak ditemukan");
    return quiz;
  }

  async update(id: string, dto: UpdateQuizDto) {
    await this.findOne(id);
    return prisma.quiz.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.duration_min !== undefined && { duration_min: dto.duration_min }),
        ...(dto.open_at !== undefined && { open_at: dto.open_at ? new Date(dto.open_at) : null }),
        ...(dto.close_at !== undefined && {
          close_at: dto.close_at ? new Date(dto.close_at) : null
        }),
        ...(dto.shuffle_questions !== undefined && { shuffle_questions: dto.shuffle_questions })
      }
    });
  }

  /** Transisi status kuis (state machine status, bukan attempt). */
  async setStatus(id: string, status: AssessmentStatus) {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException("Quiz tidak ditemukan");
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
    if (!(allowed[status] ?? []).includes(quiz.status)) {
      throw new ConflictException(`Tidak bisa ubah status ${quiz.status} -> ${status}`);
    }
    return prisma.quiz.update({ where: { id }, data: { status } });
  }

  /** Lampirkan soal bank ke kuis. */
  async attachQuestion(quizId: string, questionId: string) {
    const quiz = await this.findOne(quizId);
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException("Soal tidak ditemukan");
    if (question.quiz_id && question.quiz_id !== quizId) {
      throw new ConflictException("Soal sudah terpakai di kuis lain");
    }
    return prisma.question.update({
      where: { id: questionId },
      data: { quiz_id: quiz.id }
    });
  }

  /** Lepas soal dari kuis (kembali ke bank). */
  async detachQuestion(quizId: string, questionId: string): Promise<void> {
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException("Soal tidak ditemukan");
    if (question.quiz_id !== quizId) {
      throw new ConflictException("Soal bukan bagian dari kuis ini");
    }
    await prisma.question.update({ where: { id: questionId }, data: { quiz_id: null } });
  }
}
