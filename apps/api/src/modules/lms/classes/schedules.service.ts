import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@openlms/database";
import type { RequestContext } from "@openlms/types";
import { assertHasRole, classIdFilter, MASTER_WRITE_ROLES } from "../lms-scope";
import { writeAudit } from "../lms-audit";
import { CreateScheduleDto, FindSchedulesQueryDto, UpdateScheduleDto } from "./dto/schedules.dto";
import { findConflicts, ScheduleSlot } from "./schedule-validator";

@Injectable()
export class SchedulesService {
  async create(dto: CreateScheduleDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    this.assertPeriodOrder(dto.startPeriod, dto.endPeriod);
    await this.assertRefs(dto);

    const dayEntries = await this.loadDayEntries(dto.dayOfWeek);
    const conflicts = findConflicts(dayEntries, this.toSlot(dto));
    if (conflicts.length > 0) {
      throw new ConflictException({ message: "Jadwal bentrok", conflicts });
    }

    const academicYear = dto.academicYear ?? (await this.academicYearOf(dto.classId));
    const entry = await prisma.scheduleEntry.create({
      data: {
        class_id: dto.classId,
        subject_id: dto.subjectId,
        teacher_id: dto.teacherId,
        day_of_week: dto.dayOfWeek,
        start_period: dto.startPeriod,
        end_period: dto.endPeriod,
        room: dto.room ?? null,
        academic_year: academicYear
      }
    });
    await writeAudit({
      ctx,
      action: "CREATE",
      entity: "schedule_entry",
      entityId: entry.id,
      after: entry
    });
    return entry;
  }

  async findAll(query: FindSchedulesQueryDto, ctx: RequestContext) {
    const where: Prisma.ScheduleEntryWhereInput = {};
    const ids = classIdFilter(ctx);

    if (query.classId) {
      if (ids && !ids.includes(query.classId)) return [];
      where.class_id = query.classId;
    } else if (ids && ids.length > 0) {
      where.class_id = { in: ids };
    }

    if (query.teacherId) where.teacher_id = query.teacherId;
    if (query.dayOfWeek !== undefined) where.day_of_week = query.dayOfWeek;

    return prisma.scheduleEntry.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, full_name: true } }
      },
      orderBy: [{ day_of_week: "asc" }, { start_period: "asc" }]
    });
  }

  async findOne(id: string) {
    const entry = await prisma.scheduleEntry.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, full_name: true } }
      }
    });
    if (!entry) throw new NotFoundException("Slot jadwal tidak ditemukan");
    return entry;
  }

  async update(id: string, dto: UpdateScheduleDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const existing = await prisma.scheduleEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Slot jadwal tidak ditemukan");

    const merged: CreateScheduleDto = {
      classId: dto.classId ?? existing.class_id,
      subjectId: dto.subjectId ?? existing.subject_id,
      teacherId: dto.teacherId ?? existing.teacher_id,
      dayOfWeek: dto.dayOfWeek ?? existing.day_of_week,
      startPeriod: dto.startPeriod ?? existing.start_period,
      endPeriod: dto.endPeriod ?? existing.end_period,
      room: dto.room ?? existing.room ?? undefined,
      academicYear: dto.academicYear ?? existing.academic_year
    };
    this.assertPeriodOrder(merged.startPeriod, merged.endPeriod);
    await this.assertRefs(merged);

    const dayEntries = await this.loadDayEntries(merged.dayOfWeek);
    const conflicts = findConflicts(dayEntries, this.toSlot(merged, id));
    if (conflicts.length > 0) {
      throw new ConflictException({ message: "Jadwal bentrok", conflicts });
    }

    const updated = await prisma.scheduleEntry.update({
      where: { id },
      data: {
        ...(dto.classId !== undefined && { class_id: dto.classId }),
        ...(dto.subjectId !== undefined && { subject_id: dto.subjectId }),
        ...(dto.teacherId !== undefined && { teacher_id: dto.teacherId }),
        ...(dto.dayOfWeek !== undefined && { day_of_week: dto.dayOfWeek }),
        ...(dto.startPeriod !== undefined && { start_period: dto.startPeriod }),
        ...(dto.endPeriod !== undefined && { end_period: dto.endPeriod }),
        ...(dto.room !== undefined && { room: dto.room === "" ? null : dto.room }),
        ...(dto.academicYear !== undefined && { academic_year: dto.academicYear })
      }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "schedule_entry",
      entityId: id,
      before: existing,
      after: updated
    });
    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const existing = await prisma.scheduleEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Slot jadwal tidak ditemukan");

    await prisma.scheduleEntry.delete({ where: { id } });
    await writeAudit({
      ctx,
      action: "DELETE",
      entity: "schedule_entry",
      entityId: id,
      before: existing
    });
    return { deleted: true, id };
  }

  private assertPeriodOrder(startPeriod: number, endPeriod: number): void {
    if (startPeriod >= endPeriod) {
      throw new BadRequestException("startPeriod harus lebih kecil dari endPeriod");
    }
  }

  private async assertRefs(dto: CreateScheduleDto): Promise<void> {
    const [klass, subject, teacher] = await Promise.all([
      prisma.class.findUnique({ where: { id: dto.classId } }),
      prisma.subject.findUnique({ where: { id: dto.subjectId } }),
      prisma.user.findUnique({ where: { id: dto.teacherId } })
    ]);
    if (!klass) throw new NotFoundException("Kelas tidak ditemukan");
    if (!subject) throw new NotFoundException("Mapel tidak ditemukan");
    if (!teacher) throw new NotFoundException("Guru (user) tidak ditemukan");
  }

  private async loadDayEntries(dayOfWeek: number): Promise<ScheduleSlot[]> {
    const entries = await prisma.scheduleEntry.findMany({
      where: { day_of_week: dayOfWeek },
      select: {
        id: true,
        day_of_week: true,
        start_period: true,
        end_period: true,
        teacher_id: true,
        room: true,
        class_id: true
      }
    });
    return entries.map((e) => ({
      id: e.id,
      dayOfWeek: e.day_of_week,
      startPeriod: e.start_period,
      endPeriod: e.end_period,
      teacherId: e.teacher_id,
      room: e.room,
      classId: e.class_id
    }));
  }

  private toSlot(dto: CreateScheduleDto, id?: string): ScheduleSlot {
    return {
      id,
      dayOfWeek: dto.dayOfWeek,
      startPeriod: dto.startPeriod,
      endPeriod: dto.endPeriod,
      teacherId: dto.teacherId,
      room: dto.room ?? null,
      classId: dto.classId
    };
  }

  private async academicYearOf(classId: string): Promise<string> {
    const klass = await prisma.class.findUnique({
      where: { id: classId },
      include: { academic_year: { select: { code: true } } }
    });
    return klass?.academic_year.code ?? "";
  }
}
