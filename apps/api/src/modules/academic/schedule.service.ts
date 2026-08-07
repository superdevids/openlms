import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ScheduleEntry } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { AcademicYearGuard } from "./academic-year.guard";

export interface CreateScheduleInput {
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  start_period: number;
  end_period: number;
  room?: string | null;
}

export interface UpdateScheduleInput {
  subject_id?: string;
  teacher_id?: string;
  day_of_week?: number;
  start_period?: number;
  end_period?: number;
  room?: string | null;
}

export interface ScheduleFilter {
  classId?: string;
  teacherId?: string;
  academicYear?: string;
}

export function hasOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    private readonly yearGuard: AcademicYearGuard
  ) {}

  async create(input: CreateScheduleInput): Promise<ScheduleEntry> {
    const cls = await this.db.class.findUnique({
      where: { id: input.class_id },
      include: { academic_year: true }
    });
    if (!cls) throw new NotFoundException("Kelas tidak ditemukan");
    // Arsip: tulis ke tahun CLOSED -> 403 ARCHIVED_YEAR.
    await this.yearGuard.assertWritable(cls.academic_year_id);

    await this.requireTeacher(input.teacher_id);
    await this.requireSubject(input.subject_id);
    this.assertPeriod(input.day_of_week, input.start_period, input.end_period);

    const academicYear = cls.academic_year.code;
    await this.assertNoConflict({
      teacher_id: input.teacher_id,
      room: input.room,
      day_of_week: input.day_of_week,
      start_period: input.start_period,
      end_period: input.end_period,
      academic_year: academicYear
    });

    return this.db.scheduleEntry.create({
      data: {
        class_id: input.class_id,
        subject_id: input.subject_id,
        teacher_id: input.teacher_id,
        day_of_week: input.day_of_week,
        start_period: input.start_period,
        end_period: input.end_period,
        room: input.room ?? null,
        academic_year: academicYear
      }
    });
  }

  async update(id: string, input: UpdateScheduleInput): Promise<ScheduleEntry> {
    const existing = await this.db.scheduleEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Jadwal tidak ditemukan");
    const cls = await this.db.class.findUnique({
      where: { id: existing.class_id },
      include: { academic_year: true }
    });
    if (!cls) throw new NotFoundException("Kelas tidak ditemukan");
    await this.yearGuard.assertWritable(cls.academic_year_id);

    const next = {
      subject_id: input.subject_id ?? existing.subject_id,
      teacher_id: input.teacher_id ?? existing.teacher_id,
      day_of_week: input.day_of_week ?? existing.day_of_week,
      start_period: input.start_period ?? existing.start_period,
      end_period: input.end_period ?? existing.end_period,
      room: input.room !== undefined ? input.room : existing.room
    };
    await this.requireTeacher(next.teacher_id);
    await this.requireSubject(next.subject_id);
    this.assertPeriod(next.day_of_week, next.start_period, next.end_period);

    await this.assertNoConflict({
      ...next,
      room: next.room,
      academic_year: cls.academic_year.code,
      excludeId: id
    });

    return this.db.scheduleEntry.update({ where: { id }, data: next });
  }

  async remove(id: string): Promise<ScheduleEntry> {
    const existing = await this.db.scheduleEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Jadwal tidak ditemukan");
    const cls = await this.db.class.findUnique({ where: { id: existing.class_id } });
    if (cls) await this.yearGuard.assertWritable(cls.academic_year_id);
    return this.db.scheduleEntry.delete({ where: { id } });
  }

  /** Query utama jadwal — semua filter akademik (historis/arsip). */
  async list(filter: ScheduleFilter = {}): Promise<ScheduleEntry[]> {
    return this.db.scheduleEntry.findMany({
      where: {
        class_id: filter.classId,
        teacher_id: filter.teacherId,
        academic_year: filter.academicYear
      },
      orderBy: [{ day_of_week: "asc" }, { start_period: "asc" }]
    });
  }

  private assertPeriod(dayOfWeek: number, start: number, end: number): void {
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      throw new ConflictException("day_of_week harus 1-7 (Senin=1)");
    }
    if (start < 1 || end < start) {
      throw new ConflictException("start_period >= 1 dan end_period >= start_period");
    }
  }

  private async assertNoConflict(input: {
    teacher_id: string;
    room?: string | null;
    day_of_week: number;
    start_period: number;
    end_period: number;
    academic_year: string;
    excludeId?: string;
  }): Promise<void> {
    const exclude = input.excludeId ? { id: { not: input.excludeId } } : {};
    const teacherEntries = await this.db.scheduleEntry.findMany({
      where: {
        teacher_id: input.teacher_id,
        day_of_week: input.day_of_week,
        academic_year: input.academic_year,
        ...exclude
      }
    });
    if (
      teacherEntries.some((e) =>
        hasOverlap(input.start_period, input.end_period, e.start_period, e.end_period)
      )
    ) {
      throw new ConflictException("Bentrok jadwal: guru sudah mengajar di jam tersebut");
    }

    if (input.room) {
      const roomEntries = await this.db.scheduleEntry.findMany({
        where: {
          room: input.room,
          day_of_week: input.day_of_week,
          academic_year: input.academic_year,
          ...exclude
        }
      });
      if (
        roomEntries.some((e) =>
          hasOverlap(input.start_period, input.end_period, e.start_period, e.end_period)
        )
      ) {
        throw new ConflictException("Bentrok jadwal: ruang sudah dipakai di jam tersebut");
      }
    }
  }

  private async requireTeacher(teacherId: string): Promise<void> {
    const teacher = await this.db.user.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new NotFoundException("Guru tidak ditemukan");
  }

  private async requireSubject(subjectId: string): Promise<void> {
    const subject = await this.db.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException("Mata pelajaran tidak ditemukan");
  }
}
