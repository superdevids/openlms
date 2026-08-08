import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import {
  assertCanAccessStudent,
  assertCanManageClass,
  assertTeacherOfClassSubject,
  scopeOf
} from "../lms-scope";
import { writeAudit } from "../lms-audit";
import { NotificationService } from "../../notifications/notifications.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { GRADE_RECORDED_EVENT } from "../../notifications/notification-events";
import { computeRecap, RecapGradeItem } from "./grade-recap";
import {
  ExportGradesDto,
  FindGradesQueryDto,
  RecapClassQueryDto,
  RecapClassSubjectQueryDto,
  RecapStudentQueryDto,
  RecordGradeDto
} from "./dto/grades.dto";

@Injectable()
export class GradesService {
  constructor(
    private readonly notifications: NotificationService,
    private readonly realtime: RealtimeGateway
  ) {}

  /** Catat Grade manual (type TUGAS/KUIS/UJIAN/PRAKTIK/SIKAP/SUMATIF). */
  async record(dto: RecordGradeDto, ctx: RequestContext) {
    const cs = await prisma.classSubject.findUnique({
      where: { id: dto.classSubjectId },
      include: { class: { include: { academic_year: true } } }
    });
    if (!cs) throw new NotFoundException("Kelas-mapel tidak ditemukan");
    assertTeacherOfClassSubject(ctx, cs);

    const student = await prisma.user.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException("Siswa tidak ditemukan");

    const sourceId = dto.sourceId ?? `manual-${Date.now()}`;
    const gradeKey = {
      student_id: dto.studentId,
      class_subject_id: dto.classSubjectId,
      semester: dto.semester,
      type: dto.type,
      source_id: sourceId
    };

    try {
      const grade = await prisma.grade.upsert({
        where: { student_id_class_subject_id_semester_type_source_id: gradeKey },
        create: {
          ...gradeKey,
          academic_year: dto.academicYear ?? cs.class.academic_year.code,
          score: dto.score,
          weight: dto.weight ?? 1,
          note: dto.note
        },
        update: {
          score: dto.score,
          weight: dto.weight ?? undefined,
          note: dto.note ?? undefined
        }
      });
      await writeAudit({
        ctx,
        action: "CREATE",
        entity: "grade",
        entityId: grade.id,
        after: grade
      });
      await this.notifyRecorded(grade);
      return grade;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new BadRequestException(
          "Nilai untuk kombinasi siswa-kelas-mapel-tipe-sumber sudah ada"
        );
      }
      throw e;
    }
  }

  async findAll(query: FindGradesQueryDto, ctx: RequestContext) {
    const where: Prisma.GradeWhereInput = {};

    if (scopeOf(ctx) === "SENDIRI") {
      if (query.studentId && query.studentId !== ctx.userId) {
        assertCanAccessStudent(ctx, query.studentId);
      }
      where.student_id = ctx.userId;
    } else if (scopeOf(ctx) === "KELAS") {
      // GURU: hanya nilai mapel yang dia ampu
      where.class_subject = { teacher_id: ctx.userId };
    }

    if (query.studentId && scopeOf(ctx) !== "SENDIRI") where.student_id = query.studentId;
    if (query.classSubjectId) where.class_subject_id = query.classSubjectId;
    if (query.semester) where.semester = query.semester;
    if (query.type) where.type = query.type;

    return prisma.grade.findMany({
      where,
      include: {
        student: { select: { id: true, full_name: true, username: true } },
        class_subject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, code: true, name: true } }
          }
        }
      },
      orderBy: [{ created_at: "desc" }]
    });
  }

  /** Rekap per siswa (default semester GANJIL/GENAP via filter). */
  async recapByStudent(studentId: string, query: RecapStudentQueryDto, ctx: RequestContext) {
    assertCanAccessStudent(ctx, studentId);

    const where: Prisma.GradeWhereInput = { student_id: studentId };
    if (query.classSubjectId) where.class_subject_id = query.classSubjectId;
    if (query.semester) where.semester = query.semester;

    const grades = await prisma.grade.findMany({
      where,
      include: {
        class_subject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, code: true, name: true } }
          }
        }
      },
      orderBy: [{ class_subject_id: "asc" }, { type: "asc" }]
    });

    const items: RecapGradeItem[] = grades.map((g) => ({
      type: g.type,
      score: g.score,
      weight: g.weight
    }));
    return {
      studentId,
      classSubjectId: query.classSubjectId ?? null,
      semester: query.semester ?? null,
      grades,
      recap: computeRecap(items)
    };
  }

  /** Rekap per kelas: rata-rata per siswa per mapel. */
  async recapByClass(classId: string, query: RecapClassQueryDto, ctx: RequestContext) {
    assertCanManageClass(ctx, classId);

    const where: Prisma.GradeWhereInput = { class_subject: { class_id: classId } };
    if (query.semester) where.semester = query.semester;

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: { select: { id: true, full_name: true } },
        class_subject: {
          include: { subject: { select: { id: true, code: true, name: true } } }
        }
      },
      orderBy: [{ student_id: "asc" }, { class_subject_id: "asc" }]
    });

    const rows = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        subjects: Map<
          string,
          { subjectCode: string; subjectName: string; items: RecapGradeItem[] }
        >;
      }
    >();
    for (const g of grades) {
      const row = rows.get(g.student_id) ?? {
        studentId: g.student_id,
        studentName: g.student.full_name,
        subjects: new Map()
      };
      const subjKey = g.class_subject_id;
      const subj = row.subjects.get(subjKey) ?? {
        subjectCode: g.class_subject.subject.code,
        subjectName: g.class_subject.subject.name,
        items: []
      };
      subj.items.push({ type: g.type, score: g.score, weight: g.weight });
      row.subjects.set(subjKey, subj);
      rows.set(g.student_id, row);
    }

    return [...rows.values()].map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      subjects: [...row.subjects.values()].map((s) => ({
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        recap: computeRecap(s.items)
      }))
    }));
  }

  /** Rekap per kelas-mapel: rata-rata per siswa. */
  async recapByClassSubject(
    classSubjectId: string,
    query: RecapClassSubjectQueryDto,
    ctx: RequestContext
  ) {
    const cs = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, code: true, name: true } }
      }
    });
    if (!cs) throw new NotFoundException("Kelas-mapel tidak ditemukan");
    assertTeacherOfClassSubject(ctx, cs);

    const where: Prisma.GradeWhereInput = { class_subject_id: classSubjectId };
    if (query.semester) where.semester = query.semester;

    const grades = await prisma.grade.findMany({
      where,
      include: { student: { select: { id: true, full_name: true } } },
      orderBy: [{ student_id: "asc" }]
    });

    const rows = new Map<
      string,
      { studentId: string; studentName: string; items: RecapGradeItem[] }
    >();
    for (const g of grades) {
      const row = rows.get(g.student_id) ?? {
        studentId: g.student_id,
        studentName: g.student.full_name,
        items: []
      };
      row.items.push({ type: g.type, score: g.score, weight: g.weight });
      rows.set(g.student_id, row);
    }

    return {
      classSubject: {
        id: classSubjectId,
        className: cs.class.name,
        subjectCode: cs.subject.code,
        subjectName: cs.subject.name
      },
      semester: query.semester ?? null,
      students: [...rows.values()].map((r) => ({
        studentId: r.studentId,
        studentName: r.studentName,
        recap: computeRecap(r.items)
      }))
    };
  }

  /** Bangun filter bersama untuk list/ekspor (scope tetap di service pemanggil). */
  buildWhere(filter: ExportGradesDto): Prisma.GradeWhereInput {
    const where: Prisma.GradeWhereInput = {};
    if (filter.classId) where.class_subject = { class_id: filter.classId };
    if (filter.studentId) where.student_id = filter.studentId;
    if (filter.classSubjectId) where.class_subject_id = filter.classSubjectId;
    if (filter.semester) where.semester = filter.semester;
    return where;
  }

  /**
   * Notifikasi + event realtime ke siswa saat nilai tercatat (best-effort):
   * NotificationService → inbox (notification:new + assignment:graded) dan
   * event eksplisit grade:recorded ke room user:{studentId}.
   */
  private async notifyRecorded(grade: {
    id: string;
    student_id: string;
    score: number;
    type: string;
  }): Promise<void> {
    try {
      await this.notifications.createForUser({
        userId: grade.student_id,
        type: "TASK_GRADED",
        title: "Nilai baru tercatat",
        body: `${grade.type} — skor ${grade.score}`,
        data: { gradeId: grade.id, score: grade.score, type: grade.type }
      });
      this.realtime.emitToUser(grade.student_id, GRADE_RECORDED_EVENT, {
        gradeId: grade.id,
        score: grade.score,
        type: grade.type
      });
    } catch {
      // best-effort
    }
  }
}
