import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AssignmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@openlms/database";
import type { RequestContext } from "@openlms/types";
import { assertTeacherOfClassSubject, classIdFilter, scopeOf } from "../lms-scope";
import { writeAudit } from "../lms-audit";
import {
  CreateAssignmentDto,
  FindAssignmentsQueryDto,
  UpdateAssignmentDto
} from "./dto/assignments.dto";

const ALLOWED_TRANSITIONS: Record<string, AssignmentStatus[]> = {
  DRAFT: ["PUBLISHED", "CLOSED"],
  PUBLISHED: ["DRAFT", "CLOSED"],
  CLOSED: ["PUBLISHED"]
};

@Injectable()
export class AssignmentsService {
  async create(dto: CreateAssignmentDto, ctx: RequestContext) {
    const cs = await prisma.classSubject.findUnique({ where: { id: dto.classSubjectId } });
    if (!cs) throw new NotFoundException("Kelas-mapel tidak ditemukan");
    assertTeacherOfClassSubject(ctx, cs);

    const dueAt = new Date(dto.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException("dueAt tidak valid");
    }
    if (dto.status === "PUBLISHED" && dueAt.getTime() <= Date.now()) {
      throw new BadRequestException("dueAt harus di masa depan saat status PUBLISHED");
    }

    const assignment = await prisma.assignment.create({
      data: {
        class_subject_id: dto.classSubjectId,
        title: dto.title,
        instructions: dto.instructions,
        due_at: dueAt,
        allow_late: dto.allowLate ?? false,
        max_score: dto.maxScore ?? 100,
        attachment_url: dto.attachmentUrl,
        status: dto.status ?? "DRAFT"
      }
    });
    await writeAudit({
      ctx,
      action: "CREATE",
      entity: "assignment",
      entityId: assignment.id,
      after: assignment
    });
    return assignment;
  }

  async findAll(query: FindAssignmentsQueryDto, ctx: RequestContext) {
    const where: Prisma.AssignmentWhereInput = {};
    const ids = classIdFilter(ctx);

    if (query.classSubjectId) {
      where.class_subject_id = query.classSubjectId;
    } else if (ids && ids.length > 0) {
      where.class_subject = { class_id: { in: ids } };
    }

    if (query.status) where.status = query.status;

    if (scopeOf(ctx) === "SENDIRI") {
      // SISWA: hanya tugas publish/closed dari kelasnya
      where.status = { in: ["PUBLISHED", "CLOSED"] };
      if (ids && ids.length > 0) where.class_subject = { class_id: { in: ids } };
    } else if (scopeOf(ctx) === "KELAS") {
      // GURU: hanya tugas mapel yang dia ampu
      where.class_subject = { teacher_id: ctx.userId };
    }

    return prisma.assignment.findMany({
      where,
      include: {
        class_subject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, code: true, name: true } }
          }
        },
        _count: { select: { submissions: true } }
      },
      orderBy: { due_at: "desc" }
    });
  }

  async findOne(id: string, _ctx: RequestContext) {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        class_subject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, code: true, name: true } }
          }
        },
        _count: { select: { submissions: true } }
      }
    });
    if (!assignment) throw new NotFoundException("Tugas tidak ditemukan");
    return assignment;
  }

  async update(id: string, dto: UpdateAssignmentDto, ctx: RequestContext) {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { class_subject: true }
    });
    if (!existing) throw new NotFoundException("Tugas tidak ditemukan");
    assertTeacherOfClassSubject(ctx, existing.class_subject);

    if (dto.status && dto.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Transisi status ${existing.status} -> ${dto.status} tidak diizinkan`
        );
      }
    }

    let dueAt: Date | undefined;
    if (dto.dueAt !== undefined) {
      dueAt = new Date(dto.dueAt);
      if (Number.isNaN(dueAt.getTime())) throw new BadRequestException("dueAt tidak valid");
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dueAt !== undefined && { due_at: dueAt }),
        ...(dto.allowLate !== undefined && { allow_late: dto.allowLate }),
        ...(dto.maxScore !== undefined && { max_score: dto.maxScore }),
        ...(dto.attachmentUrl !== undefined && { attachment_url: dto.attachmentUrl }),
        ...(dto.status !== undefined && { status: dto.status })
      }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "assignment",
      entityId: id,
      before: existing,
      after: updated
    });
    return updated;
  }

  async publish(id: string, ctx: RequestContext) {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { class_subject: true }
    });
    if (!existing) throw new NotFoundException("Tugas tidak ditemukan");
    assertTeacherOfClassSubject(ctx, existing.class_subject);

    const updated = await prisma.assignment.update({
      where: { id },
      data: { status: "PUBLISHED" }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "assignment",
      entityId: id,
      before: existing,
      after: updated
    });
    return updated;
  }

  async close(id: string, ctx: RequestContext) {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { class_subject: true }
    });
    if (!existing) throw new NotFoundException("Tugas tidak ditemukan");
    assertTeacherOfClassSubject(ctx, existing.class_subject);

    const updated = await prisma.assignment.update({
      where: { id },
      data: { status: "CLOSED" }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "assignment",
      entityId: id,
      before: existing,
      after: updated
    });
    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: { class_subject: true }
    });
    if (!existing) throw new NotFoundException("Tugas tidak ditemukan");
    assertTeacherOfClassSubject(ctx, existing.class_subject);

    await prisma.assignment.delete({ where: { id } });
    await writeAudit({
      ctx,
      action: "DELETE",
      entity: "assignment",
      entityId: id,
      before: existing
    });
    return { deleted: true, id };
  }
}
