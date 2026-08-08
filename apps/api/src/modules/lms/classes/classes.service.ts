import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import { assertHasRole, classIdFilter, MASTER_WRITE_ROLES } from "../lms-scope";
import { writeAudit } from "../lms-audit";
import { CreateClassDto, FindClassesQueryDto, UpdateClassDto } from "./dto/classes.dto";

@Injectable()
export class ClassesService {
  async create(dto: CreateClassDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);

    const year = await prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
    if (!year) throw new NotFoundException("Tahun ajaran tidak ditemukan");

    if (dto.homeroomTeacherId) {
      const teacher = await prisma.user.findUnique({ where: { id: dto.homeroomTeacherId } });
      if (!teacher) throw new NotFoundException("Wali kelas (user) tidak ditemukan");
    }

    if (dto.prodiId) {
      const prodi = await prisma.prodi.findUnique({ where: { id: dto.prodiId } });
      if (!prodi) throw new NotFoundException("Prodi tidak ditemukan");
    }

    const klass = await prisma.class.create({
      data: {
        name: dto.name,
        grade_level: dto.gradeLevel,
        academic_year_id: dto.academicYearId,
        homeroom_teacher_id: dto.homeroomTeacherId,
        prodi_id: dto.prodiId
      }
    });
    await writeAudit({ ctx, action: "CREATE", entity: "class", entityId: klass.id, after: klass });
    return klass;
  }

  async findAll(query: FindClassesQueryDto, ctx: RequestContext) {
    const where: Prisma.ClassWhereInput = {};
    if (query.gradeLevel !== undefined) where.grade_level = query.gradeLevel;
    if (query.academicYearId) where.academic_year_id = query.academicYearId;
    if (query.isActive !== undefined) where.is_active = query.isActive;

    const ids = classIdFilter(ctx);
    if (ids && ids.length > 0) where.id = { in: ids };

    return prisma.class.findMany({
      where,
      include: {
        academic_year: true,
        homeroom_teacher: { select: { id: true, full_name: true } }
      },
      orderBy: [{ grade_level: "asc" }, { name: "asc" }]
    });
  }

  async findOne(id: string) {
    const klass = await prisma.class.findUnique({
      where: { id },
      include: {
        academic_year: true,
        homeroom_teacher: { select: { id: true, full_name: true } }
      }
    });
    if (!klass) throw new NotFoundException("Kelas tidak ditemukan");
    return klass;
  }

  async update(id: string, dto: UpdateClassDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Kelas tidak ditemukan");

    if (dto.academicYearId && dto.academicYearId !== existing.academic_year_id) {
      const year = await prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
      if (!year) throw new NotFoundException("Tahun ajaran tidak ditemukan");
    }
    if (dto.homeroomTeacherId && dto.homeroomTeacherId !== "") {
      const teacher = await prisma.user.findUnique({ where: { id: dto.homeroomTeacherId } });
      if (!teacher) throw new NotFoundException("Wali kelas (user) tidak ditemukan");
    }

    const homeroomTeacherId =
      dto.homeroomTeacherId === undefined
        ? undefined
        : dto.homeroomTeacherId === ""
          ? null
          : dto.homeroomTeacherId;

    const prodiId = dto.prodiId === undefined ? undefined : dto.prodiId === "" ? null : dto.prodiId;
    if (prodiId) {
      const prodi = await prisma.prodi.findUnique({ where: { id: prodiId } });
      if (!prodi) throw new NotFoundException("Prodi tidak ditemukan");
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.gradeLevel !== undefined && { grade_level: dto.gradeLevel }),
        ...(dto.academicYearId !== undefined && { academic_year_id: dto.academicYearId }),
        ...(homeroomTeacherId !== undefined && { homeroom_teacher_id: homeroomTeacherId }),
        ...(prodiId !== undefined && { prodi_id: prodiId }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive })
      }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "class",
      entityId: id,
      before: existing,
      after: updated
    });
    return updated;
  }

  /** Hapus (soft): kelas dinonaktifkan agar histori enrollment tetap terjaga. */
  async remove(id: string, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Kelas tidak ditemukan");

    const updated = await prisma.class.update({
      where: { id },
      data: { is_active: false }
    });
    await writeAudit({
      ctx,
      action: "DELETE",
      entity: "class",
      entityId: id,
      before: existing,
      after: updated
    });
    return updated;
  }
}
