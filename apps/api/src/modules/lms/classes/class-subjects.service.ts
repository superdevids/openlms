import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@openlms/database";
import type { RequestContext } from "@openlms/types";
import { assertHasRole, classIdFilter, MASTER_WRITE_ROLES } from "../lms-scope";
import { writeAudit } from "../lms-audit";
import { ScopeResolver } from "../../../common/scope-resolver";
import {
  CreateClassSubjectDto,
  FindClassSubjectsQueryDto,
  UpdateClassSubjectDto
} from "./dto/class-subjects.dto";

@Injectable()
export class ClassSubjectsService {
  async create(dto: CreateClassSubjectDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    await this.assertRefs(dto.classId, dto.subjectId, dto.teacherId);

    try {
      const cs = await prisma.classSubject.create({
        data: {
          class_id: dto.classId,
          subject_id: dto.subjectId,
          teacher_id: dto.teacherId,
          semester: dto.semester
        }
      });
      await writeAudit({
        ctx,
        action: "CREATE",
        entity: "class_subject",
        entityId: cs.id,
        after: cs
      });
      // Guru pengampu baru → kelas yang diajar berubah → cache scope guru di-resolve ulang.
      ScopeResolver.invalidateScope(dto.teacherId);
      return cs;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Guru pengampu untuk kelas-mapel-semester ini sudah ada");
      }
      throw e;
    }
  }

  async findAll(query: FindClassSubjectsQueryDto, ctx: RequestContext) {
    const where: Prisma.ClassSubjectWhereInput = {};
    const ids = classIdFilter(ctx);

    if (query.classId) {
      if (ids && !ids.includes(query.classId)) return [];
      where.class_id = query.classId;
    } else if (ids && ids.length > 0) {
      where.class_id = { in: ids };
    }

    if (query.subjectId) where.subject_id = query.subjectId;
    if (query.semester) where.semester = query.semester;
    // GURU memfilter default ke mapel yang dia ampu (scope KELAS)
    if (query.teacherId) where.teacher_id = query.teacherId;
    else if (!ids && ctx.roles.includes("GURU")) where.teacher_id = ctx.userId;

    return prisma.classSubject.findMany({
      where,
      include: {
        class: true,
        subject: true,
        teacher: { select: { id: true, full_name: true } }
      },
      orderBy: [{ semester: "asc" }, { created_at: "desc" }]
    });
  }

  async findOne(id: string) {
    const cs = await prisma.classSubject.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        teacher: { select: { id: true, full_name: true } }
      }
    });
    if (!cs) throw new NotFoundException("Kelas-mapel tidak ditemukan");
    return cs;
  }

  async update(id: string, dto: UpdateClassSubjectDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const existing = await prisma.classSubject.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Kelas-mapel tidak ditemukan");

    const classId = dto.classId ?? existing.class_id;
    const subjectId = dto.subjectId ?? existing.subject_id;
    const teacherId = dto.teacherId ?? existing.teacher_id;
    await this.assertRefs(classId, subjectId, teacherId);

    try {
      const updated = await prisma.classSubject.update({
        where: { id },
        data: {
          ...(dto.classId !== undefined && { class_id: dto.classId }),
          ...(dto.subjectId !== undefined && { subject_id: dto.subjectId }),
          ...(dto.teacherId !== undefined && { teacher_id: dto.teacherId }),
          ...(dto.semester !== undefined && { semester: dto.semester })
        }
      });
      await writeAudit({
        ctx,
        action: "UPDATE",
        entity: "class_subject",
        entityId: id,
        before: existing,
        after: updated
      });
      // Guru pengampu bisa berubah → invalidasi scope guru lama & baru.
      if (updated.teacher_id !== existing.teacher_id) {
        ScopeResolver.invalidateScope(existing.teacher_id);
        ScopeResolver.invalidateScope(updated.teacher_id);
      }
      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Guru pengampu untuk kelas-mapel-semester ini sudah ada");
      }
      throw e;
    }
  }

  /** Hapus guru pengampu (cascade menghapus materi/tugas/nilai terkait sesuai skema). */
  async remove(id: string, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const existing = await prisma.classSubject.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Kelas-mapel tidak ditemukan");

    await prisma.classSubject.delete({ where: { id } });
    await writeAudit({
      ctx,
      action: "DELETE",
      entity: "class_subject",
      entityId: id,
      before: existing
    });
    // Guru kehilangan kelas → cache scope guru di-resolve ulang.
    ScopeResolver.invalidateScope(existing.teacher_id);
    return { deleted: true, id };
  }

  private async assertRefs(classId: string, subjectId: string, teacherId: string): Promise<void> {
    const [klass, subject, teacher] = await Promise.all([
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.user.findUnique({ where: { id: teacherId } })
    ]);
    if (!klass) throw new NotFoundException("Kelas tidak ditemukan");
    if (!subject) throw new NotFoundException("Mapel tidak ditemukan");
    if (!teacher) throw new NotFoundException("Guru (user) tidak ditemukan");
  }
}
