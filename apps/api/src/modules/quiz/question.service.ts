import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@opensis/database";
import { Difficulty, Prisma, QuestionType } from "@prisma/client";
import { MAX_IMPORT_ROWS } from "./quiz.constants";
import { parseCsv, validateQuestionPayload } from "./quiz.util";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { ListQuestionsQueryDto } from "./dto/list-questions-query.dto";
import { ImportQuestionsDto } from "./dto/import-questions.dto";

/**
 * QuestionService — bank soal CRUD + import massal CSV/Excel dasar (prd04 §5.A.5, M-EXAM-T1).
 * RBAC enforced di QuizController (question:write:class untuk tulis/import;
 * question:read:class untuk baca).
 */
@Injectable()
export class QuestionService {
  async create(dto: CreateQuestionDto) {
    const errors = validateQuestionPayload(dto.type, dto);
    if (errors.length > 0) {
      throw new BadRequestException(`Validasi soal gagal: ${errors.join("; ")}`);
    }
    return prisma.question.create({
      data: {
        subject_id: dto.subject_id ?? null,
        quiz_id: dto.quiz_id ?? null,
        type: dto.type,
        text: dto.text,
        options: dto.options != null ? (dto.options as Prisma.InputJsonValue) : Prisma.JsonNull,
        correct_answer: dto.correct_answer ?? null,
        explanation: dto.explanation ?? null,
        difficulty: dto.difficulty ?? Difficulty.MUDAH,
        tags: dto.tags ?? []
      }
    });
  }

  async findAll(query: ListQuestionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.QuestionWhereInput = {};
    if (query.subject_id) where.subject_id = query.subject_id;
    if (query.type) where.type = query.type;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.tag) where.tags = { has: query.tag };
    if (query.q) where.text = { contains: query.q, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.question.count({ where })
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException("Soal tidak ditemukan");
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const existing = await this.findOne(id);
    const nextType = dto.type ?? existing.type;
    const errors = validateQuestionPayload(nextType, {
      text: dto.text ?? existing.text,
      options: dto.options !== undefined ? dto.options : existing.options,
      correct_answer:
        dto.correct_answer !== undefined ? dto.correct_answer : existing.correct_answer
    });
    if (errors.length > 0) {
      throw new BadRequestException(`Validasi soal gagal: ${errors.join("; ")}`);
    }
    return prisma.question.update({
      where: { id },
      data: {
        ...(dto.subject_id !== undefined && { subject_id: dto.subject_id ?? null }),
        ...(dto.quiz_id !== undefined && { quiz_id: dto.quiz_id ?? null }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.options !== undefined && {
          options: dto.options != null ? (dto.options as Prisma.InputJsonValue) : Prisma.JsonNull
        }),
        ...(dto.correct_answer !== undefined && { correct_answer: dto.correct_answer ?? null }),
        ...(dto.explanation !== undefined && { explanation: dto.explanation ?? null }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.tags !== undefined && { tags: dto.tags })
      }
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await prisma.question.delete({ where: { id } });
  }

  /**
   * Import massal soal dari CSV (M-EXAM-T1, dasar tanpa vendor).
   * Baris valid dibuat dalam satu transaksi; baris invalid dicatat tanpa menghentikan batch.
   */
  async importCsv(dto: ImportQuestionsDto) {
    const rows = parseCsv(dto.csv);
    if (rows.length < 2) {
      throw new BadRequestException("CSV harus memiliki header dan minimal 1 baris data");
    }
    if (rows.length - 1 > MAX_IMPORT_ROWS) {
      throw new BadRequestException(`Maksimal ${MAX_IMPORT_ROWS} soal per import`);
    }

    const header = rows[0] as string[];
    const required = ["type", "text"];
    const missing = required.filter((col) => !header.includes(col));
    if (missing.length > 0) {
      throw new BadRequestException(`Kolom wajib tidak ada: ${missing.join(", ")}`);
    }
    const colIndex = (name: string): number => header.indexOf(name);

    const errors: { row: number; message: string }[] = [];
    const payloads: {
      subject_id: string | null;
      quiz_id: string | null;
      type: QuestionType;
      text: string;
      options: Prisma.InputJsonValue | null;
      correct_answer: string | null;
      explanation: string | null;
      difficulty: Difficulty;
      tags: string[];
    }[] = [];

    rows.slice(1).forEach((row, i) => {
      const rowNo = i + 2;
      const at = (name: string): string | undefined => {
        const idx = colIndex(name);
        if (idx < 0) return undefined;
        return (row[idx] as string | undefined)?.trim() || undefined;
      };
      const type = at("type");
      const text = at("text");
      if (!type || !text) {
        errors.push({ row: rowNo, message: "kolom type/text wajib diisi" });
        return;
      }
      const parsedType = type.toUpperCase() as QuestionType;
      const validTypes: QuestionType[] = [
        QuestionType.PILIHAN_GANDA,
        QuestionType.ESAI,
        QuestionType.ISIAN_SINGKAT,
        QuestionType.MENJODOHKAN
      ];
      if (!validTypes.includes(parsedType)) {
        errors.push({ row: rowNo, message: `type tidak dikenal: ${type}` });
        return;
      }
      let options: Prisma.InputJsonValue | null = null;
      const rawOptions = at("options");
      if (rawOptions) {
        try {
          options = JSON.parse(rawOptions) as Prisma.InputJsonValue;
        } catch {
          errors.push({ row: rowNo, message: "options bukan JSON valid" });
          return;
        }
      }
      const difficulty = (at("difficulty")?.toUpperCase() as Difficulty) || Difficulty.MUDAH;
      if (![Difficulty.MUDAH, Difficulty.SEDANG, Difficulty.SULIT].includes(difficulty)) {
        errors.push({ row: rowNo, message: `difficulty tidak dikenal: ${difficulty}` });
        return;
      }
      const payloadErrors = validateQuestionPayload(parsedType, {
        text,
        options,
        correct_answer: at("correct_answer")
      });
      if (payloadErrors.length > 0) {
        errors.push({ row: rowNo, message: payloadErrors.join("; ") });
        return;
      }
      payloads.push({
        subject_id: dto.subject_id ?? at("subject_id") ?? null,
        quiz_id: dto.quiz_id ?? null,
        type: parsedType,
        text,
        options,
        correct_answer: at("correct_answer") ?? null,
        explanation: at("explanation") ?? null,
        difficulty,
        tags: (at("tags") ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      });
    });

    let imported = 0;
    if (payloads.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const p of payloads) {
          await tx.question.create({
            data: { ...p, options: p.options ?? Prisma.JsonNull }
          });
          imported += 1;
        }
      });
    }
    return { imported, failed: errors, total_rows: rows.length - 1 };
  }
}
