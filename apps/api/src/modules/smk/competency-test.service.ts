/**
 * CompetencyTestService — UKK (prd04 §5.R: SMK).
 * Rubrik CompetencyRubricItem; penilaian oleh penguji (internal/eksternal).
 * Lulus jika skor akhir >= COMPETENCY_PASSING_SCORE (70).
 * RBAC enforced di SmkController (competency:grade:school = GURU;
 * competency:grade:self = PENGUJI_EKSTERNAL); service memeriksa examiner_id.
 */
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { CompetencyTest, CompetencyRubricItem } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { COMPETENCY_PASSING_SCORE } from "../rollover/rollover.constants";

export interface CreateCompetencyTestInput {
  title: string;
  competencyStandard: string;
  studentId: string;
  examinerId?: string;
  scheduledAt?: string;
  rubricItems?: { criterion: string; maxScore: number }[];
}

export interface GradeRubricItemInput {
  rubricItemId: string;
  score: number;
}

@Injectable()
export class CompetencyTestService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async create(input: CreateCompetencyTestInput): Promise<CompetencyTest> {
    if (!input.title || !input.competencyStandard || !input.studentId) {
      throw new BadRequestException("title, competencyStandard, studentId wajib diisi");
    }
    const test = await this.db.competencyTest.create({
      data: {
        title: input.title,
        competency_standard: input.competencyStandard,
        student_id: input.studentId,
        examiner_id: input.examinerId,
        scheduled_at: input.scheduledAt ? new Date(input.scheduledAt) : null,
        status: "SCHEDULED"
      }
    });
    if (input.rubricItems && input.rubricItems.length > 0) {
      await this.db.competencyRubricItem.createMany({
        data: input.rubricItems.map((item) => ({
          competency_test_id: test.id,
          criterion: item.criterion,
          max_score: item.maxScore
        }))
      });
    }
    return this.db.competencyTest.findUniqueOrThrow({ where: { id: test.id } });
  }

  async addRubricItem(
    testId: string,
    criterion: string,
    maxScore: number
  ): Promise<CompetencyRubricItem> {
    await this.requireTest(testId);
    if (maxScore <= 0) throw new BadRequestException("maxScore harus > 0");
    return this.db.competencyRubricItem.create({
      data: { competency_test_id: testId, criterion, max_score: maxScore }
    });
  }

  /** Penilaian oleh penguji yang ditugaskan (examiner). */
  async grade(
    testId: string,
    examinerUserId: string,
    items: GradeRubricItemInput[]
  ): Promise<CompetencyTest> {
    const test = await this.db.competencyTest.findUnique({
      where: { id: testId },
      include: { rubric_items: true }
    });
    if (!test) throw new NotFoundException("UKK tidak ditemukan");
    if (!test.examiner_id) {
      throw new ForbiddenException("UKK belum ditugaskan penguji");
    }
    if (test.examiner_id !== examinerUserId) {
      throw new ForbiddenException("Anda bukan penguji UKK ini");
    }
    if (items.length === 0) throw new BadRequestException("Rubrik penilaian kosong");

    let totalPct = 0;
    for (const item of items) {
      const rubric = test.rubric_items.find((r) => r.id === item.rubricItemId);
      if (!rubric) throw new BadRequestException(`Rubrik ${item.rubricItemId} tidak ditemukan`);
      if (item.score < 0 || item.score > rubric.max_score) {
        throw new BadRequestException(`Skor ${item.rubricItemId} harus 0-${rubric.max_score}`);
      }
      await this.db.competencyRubricItem.update({
        where: { id: rubric.id },
        data: { score: item.score }
      });
      totalPct += rubric.max_score > 0 ? item.score / rubric.max_score : 0;
    }
    const finalScore = Math.round((totalPct / items.length) * 100);
    const status = finalScore >= COMPETENCY_PASSING_SCORE ? "PASSED" : "FAILED";

    return this.db.competencyTest.update({
      where: { id: test.id },
      data: { final_score: finalScore, status }
    });
  }

  private async requireTest(testId: string): Promise<CompetencyTest> {
    const test = await this.db.competencyTest.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException("UKK tidak ditemukan");
    return test;
  }
}
