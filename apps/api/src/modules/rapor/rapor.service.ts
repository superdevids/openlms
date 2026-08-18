import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import { JOB_NAMES, QUEUE_TOKEN, type IJobQueue } from "../queue/queue.types";
import { writeAudit } from "../lms/lms-audit";
import { assertCanManageClass, isSchoolScope } from "../lms/lms-scope";
import { assertCanReadRapor, assertCanWriteP5, resolveAcademicYearCode } from "./rapor-scope";
import {
  computeRaporNilai,
  DEFAULT_RAPOR_WEIGHTS,
  normalizeRaporWeights,
  RaporGradeItem
} from "./rapor-compute";
import {
  RecordRaporP5Dto,
  RaporClassQueryDto,
  RaporStudentQueryDto,
  UpdateRaporSettingsDto
} from "./dto/rapor.dto";

/**
 * Rapor (G-49 e-Rapor v1) — komputasi on-the-fly dari Grade + track P5 manual.
 * Tanpa status/approval/ekspor PDF (scope v1). Settings bobot tipe nilai
 * disimpan di SchoolProfile.settings.raporWeights.
 */
@Injectable()
export class RaporService {
  /**
   * queue opsional (DI via QueueModule) — dipakai requestRaporExport untuk
   * mengantrekan job report.generate. Opsional agar unit test lama tetap
   * bisa `new RaporService()` tanpa queue.
   */
  constructor(@Inject(QUEUE_TOKEN) private readonly queue?: IJobQueue) {}
  /** Tahun ajaran aktif — fallback via helper bersama rapor-scope (FIX 6). */
  private async resolveAcademicYear(academicYear?: string): Promise<string> {
    if (academicYear) return academicYear;
    return resolveAcademicYearCode();
  }

  private async loadWeights(): Promise<Record<string, number>> {
    const school = await prisma.schoolProfile.findFirst({ select: { settings: true } });
    const raw = school?.settings as Record<string, unknown> | null | undefined;
    return normalizeRaporWeights(raw?.raporWeights);
  }

  /** Rapor lengkap satu siswa: header + per-mapel (rincian tipe + nilaiAkhir) + P5. */
  async getRapor(studentId: string, query: RaporStudentQueryDto, ctx: RequestContext) {
    await assertCanReadRapor(ctx, studentId);
    return this.getRaporData(studentId, query);
  }

  /**
   * Data rapor satu siswa TANPA auth — dipakai getRapor (setelah scope check)
   * dan job ekspor PDF (RaporExportService). Query menerima semester + tahun
   * ajaran opsional; auth row-level SELALU ditangani pemanggil.
   */
  async getRaporData(studentId: string, query: { semester: string; academicYear?: string }) {
    const academicYear = await this.resolveAcademicYear(query.academicYear);
    const weights = await this.loadWeights();

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, full_name: true, username: true }
    });
    if (!student) throw new NotFoundException("Siswa tidak ditemukan");

    // Header kelas cocokkan dengan tahun ajaran yang diminta + status ACTIVE
    // (bukan sekadar enrollment terakhir) — media-review L-08.
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        status: "ACTIVE",
        academic_year: { code: academicYear }
      },
      orderBy: { created_at: "desc" },
      include: {
        class: { select: { id: true, name: true, grade_level: true } },
        academic_year: { select: { code: true, name: true } }
      }
    });

    const grades = await prisma.grade.findMany({
      where: { student_id: studentId, semester: query.semester, academic_year: academicYear },
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

    const perSubject = new Map<
      string,
      {
        subjectId: string;
        subjectCode: string;
        subjectName: string;
        className: string;
        items: RaporGradeItem[];
      }
    >();
    for (const g of grades) {
      const key = g.class_subject_id;
      const entry = perSubject.get(key) ?? {
        subjectId: g.class_subject.subject.id,
        subjectCode: g.class_subject.subject.code,
        subjectName: g.class_subject.subject.name,
        className: g.class_subject.class.name,
        items: []
      };
      entry.items.push({ type: g.type, score: g.score, weight: g.weight });
      perSubject.set(key, entry);
    }

    const mapels = [...perSubject.values()].map((entry) => ({
      subjectId: entry.subjectId,
      subjectCode: entry.subjectCode,
      subjectName: entry.subjectName,
      className: entry.className,
      ...computeRaporNilai(entry.items, weights)
    }));

    const p5 = await prisma.raporP5.findMany({
      where: { student_id: studentId, semester: query.semester, academic_year: academicYear },
      orderBy: [{ project_name: "asc" }]
    });

    return {
      student: { id: student.id, name: student.full_name, username: student.username },
      kelas: enrollment
        ? {
            id: enrollment.class.id,
            name: enrollment.class.name,
            gradeLevel: enrollment.class.grade_level
          }
        : null,
      semester: query.semester,
      academicYear,
      mapels,
      p5
    };
  }

  /**
   * Minta ekspor PDF rapor (e-Rapor v2): scope check row-level, catat
   * DataExportLog(RAPOR, PENDING), lalu enqueue job report.generate.
   * Job yang memproses (ReportProcessor → RaporExportService) memakai
   * params ini; auth TIDAK diulang di job (sudah diverifikasi di sini).
   */
  async requestRaporExport(studentId: string, query: RaporStudentQueryDto, ctx: RequestContext) {
    await assertCanReadRapor(ctx, studentId);
    const academicYear = await this.resolveAcademicYear(query.academicYear);

    const log = await prisma.dataExportLog.create({
      data: {
        export_type: "RAPOR",
        requested_by: ctx.userId,
        status: "PENDING"
      }
    });

    if (this.queue) {
      await this.queue.enqueue(JOB_NAMES.REPORT_GENERATE, {
        exportLogId: log.id,
        params: { studentId, semester: query.semester, academicYear }
      });
    }

    return { exportLogId: log.id, status: "PENDING" };
  }

  /** Rapor ringkas per kelas: per siswa per mapel nilaiAkhir + predikat. */
  async getClassRapor(classId: string, query: RaporClassQueryDto, ctx: RequestContext) {
    assertCanManageClass(ctx, classId);
    const academicYear = await this.resolveAcademicYear(query.academicYear);
    const weights = await this.loadWeights();

    const klass = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, academic_year: { select: { code: true } } }
    });
    if (!klass) throw new NotFoundException("Kelas tidak ditemukan");

    const enrollments = await prisma.enrollment.findMany({
      where: { class_id: classId, status: "ACTIVE" },
      include: { student: { select: { id: true, full_name: true, username: true } } },
      orderBy: [{ student: { full_name: "asc" } }]
    });

    const grades = await prisma.grade.findMany({
      where: {
        student_id: { in: enrollments.map((e) => e.student_id) },
        semester: query.semester,
        academic_year: academicYear,
        class_subject: { class_id: classId }
      },
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
          { subjectCode: string; subjectName: string; items: RaporGradeItem[] }
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

    return {
      classId,
      className: klass.name,
      semester: query.semester,
      academicYear,
      students: [...rows.values()].map((row) => ({
        studentId: row.studentId,
        studentName: row.studentName,
        subjects: [...row.subjects.values()].map((s) => {
          const computed = computeRaporNilai(s.items, weights);
          return {
            subjectCode: s.subjectCode,
            subjectName: s.subjectName,
            nilaiAkhir: computed.nilaiAkhir,
            predikat: computed.predikat
          };
        })
      }))
    };
  }

  /** Daftar siswa per kelas (Enrollment ACTIVE) — untuk dropdown guru. */
  async listStudents(classId: string | undefined, ctx: RequestContext) {
    if (classId) {
      assertCanManageClass(ctx, classId);
    }
    const where: Prisma.EnrollmentWhereInput = { status: "ACTIVE" };
    if (classId) {
      where.class_id = classId;
    } else if (!isSchoolScope(ctx)) {
      // FIX 1: role non-sekolah (GURU dengan report:read:class) TANPA classId
      // tidak boleh melihat SEMUA siswa lintas kelas. Fallback ke kelas ampu
      // (ctx.classIds + homeroom) — pola lms-scope classIdFilter/canManageClass.
      const allowed =
        ctx.homeroomClassId && !ctx.classIds.includes(ctx.homeroomClassId)
          ? [...ctx.classIds, ctx.homeroomClassId]
          : ctx.classIds;
      if (allowed.length === 0) return [];
      where.class_id = { in: allowed };
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { id: true, full_name: true, username: true } },
        class: { select: { id: true, name: true } }
      },
      orderBy: [{ student: { full_name: "asc" } }]
    });

    return enrollments.map((e) => ({
      studentId: e.student.id,
      name: e.student.full_name,
      username: e.student.username,
      classId: e.class.id,
      className: e.class.name
    }));
  }

  /** Upsert proyek P5 manual — unique [student, semester, tahun, project]. */
  async upsertP5(dto: RecordRaporP5Dto, ctx: RequestContext) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { student_id: dto.studentId, status: "ACTIVE" },
      select: { class_id: true }
    });
    assertCanWriteP5(ctx, enrollment?.class_id);

    const key = {
      student_id: dto.studentId,
      semester: dto.semester,
      academic_year: dto.academicYear,
      project_name: dto.projectName
    };
    const data = {
      theme: dto.theme ?? null,
      score: dto.score ?? null,
      deskripsi: dto.deskripsi,
      created_by: ctx.userId
    };

    const row = await prisma.raporP5.upsert({
      where: { student_id_semester_academic_year_project_name: key },
      create: { ...key, ...data },
      update: { ...data }
    });

    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "rapor_p5",
      entityId: row.id,
      after: row
    });
    return row;
  }

  async deleteP5(id: string, ctx: RequestContext) {
    const row = await prisma.raporP5.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Proyek P5 tidak ditemukan");

    const enrollment = await prisma.enrollment.findFirst({
      where: { student_id: row.student_id, status: "ACTIVE" },
      select: { class_id: true }
    });
    assertCanWriteP5(ctx, enrollment?.class_id);

    await prisma.raporP5.delete({ where: { id } });
    await writeAudit({
      ctx,
      action: "DELETE",
      entity: "rapor_p5",
      entityId: id,
      before: row
    });
    return { id, deleted: true };
  }

  /** Pengaturan bobot rapor (raporWeights di SchoolProfile.settings). */
  async getSettings() {
    const school = await prisma.schoolProfile.findFirst({
      select: { settings: true }
    });
    const raw = school?.settings as Record<string, unknown> | null | undefined;
    return { raporWeights: normalizeRaporWeights(raw?.raporWeights) };
  }

  async updateSettings(dto: UpdateRaporSettingsDto, ctx: RequestContext) {
    const normalized = normalizeRaporWeights(dto.raporWeights);
    const school = await prisma.schoolProfile.findFirst({ select: { id: true, settings: true } });
    if (!school) throw new NotFoundException("Profil sekolah tidak ditemukan");

    const current = (school.settings ?? {}) as Record<string, unknown>;
    const beforeWeights = normalizeRaporWeights(current.raporWeights);
    const updated = await prisma.schoolProfile.update({
      where: { id: school.id },
      data: {
        settings: {
          ...current,
          raporWeights: normalized
        } as Prisma.InputJsonValue
      },
      select: { settings: true }
    });
    const raw = updated.settings as Record<string, unknown> | null | undefined;
    const result = { raporWeights: normalizeRaporWeights(raw?.raporWeights) };
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "school_profile",
      entityId: school.id,
      before: { raporWeights: beforeWeights },
      after: { raporWeights: result.raporWeights }
    });
    return result;
  }

  /** Bobot default — dipakai controller/halaman bila butuh tampilan fallback. */
  get defaultWeights(): Record<string, number> {
    return { ...DEFAULT_RAPOR_WEIGHTS };
  }
}
