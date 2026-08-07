import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@openlms/database";
import type { RequestContext } from "@openlms/types";
import { assertHasRole, MASTER_WRITE_ROLES } from "../lms-scope";
import { writeAudit } from "../lms-audit";
import { CreateSubjectDto, FindSubjectsQueryDto, UpdateSubjectDto } from "./dto/subjects.dto";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

@Injectable()
export class SubjectsService {
  async create(dto: CreateSubjectDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    try {
      const subject = await prisma.subject.create({
        data: {
          code: dto.code,
          name: dto.name,
          category: dto.category,
          is_competency_based: dto.isCompetencyBased ?? false
        }
      });
      await writeAudit({
        ctx,
        action: "CREATE",
        entity: "subject",
        entityId: subject.id,
        after: subject
      });
      return subject;
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException("Kode mapel sudah dipakai");
      }
      throw e;
    }
  }

  async findAll(query: FindSubjectsQueryDto) {
    const where: Prisma.SubjectWhereInput = {};
    if (query.category) where.category = query.category;
    return prisma.subject.findMany({
      where,
      orderBy: [{ category: "asc" }, { code: "asc" }]
    });
  }

  async findOne(id: string) {
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException("Mapel tidak ditemukan");
    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Mapel tidak ditemukan");

    try {
      const updated = await prisma.subject.update({
        where: { id },
        data: {
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.isCompetencyBased !== undefined && {
            is_competency_based: dto.isCompetencyBased
          })
        }
      });
      await writeAudit({
        ctx,
        action: "UPDATE",
        entity: "subject",
        entityId: id,
        before: existing,
        after: updated
      });
      return updated;
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException("Kode mapel sudah dipakai");
      throw e;
    }
  }

  /** Hapus mapel. Bila masih dipakai ClassSubject, FK memblokir → 409. */
  async remove(id: string, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Mapel tidak ditemukan");

    try {
      await prisma.subject.delete({ where: { id } });
      await writeAudit({
        ctx,
        action: "DELETE",
        entity: "subject",
        entityId: id,
        before: existing
      });
      return { deleted: true, id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        throw new ConflictException("Mapel masih dipakai data lain (kelas-mapel/jadwal)");
      }
      throw e;
    }
  }
}
