import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import { assertTeacherOfClassSubject, classIdFilter, scopeOf } from "../lms-scope";
import { writeAudit } from "../lms-audit";
import { StorageService } from "../storage/storage.service";
import {
  CreateMaterialDto,
  FindMaterialsQueryDto,
  RequestSignedUploadDto,
  UpdateMaterialDto
} from "./dto/materials.dto";

@Injectable()
export class MaterialsService {
  constructor(private readonly storageService: StorageService) {}

  /** Minta signed URL upload ke bucket `materials` (F2-T4, skeleton lokal). */
  async requestSignedUpload(dto: RequestSignedUploadDto, ctx: RequestContext) {
    const cs = await prisma.classSubject.findUnique({ where: { id: dto.classSubjectId } });
    if (!cs) throw new NotFoundException("Kelas-mapel tidak ditemukan");
    assertTeacherOfClassSubject(ctx, cs);

    const objectPath = this.storageService.materialPath(dto.classSubjectId, dto.filename);
    return this.storageService.createSignedUploadUrl({
      bucket: "materials",
      objectPath,
      contentType: dto.contentType,
      expiresIn: 15 * 60
    });
  }

  async create(dto: CreateMaterialDto, ctx: RequestContext) {
    const cs = await prisma.classSubject.findUnique({ where: { id: dto.classSubjectId } });
    if (!cs) throw new NotFoundException("Kelas-mapel tidak ditemukan");
    assertTeacherOfClassSubject(ctx, cs);

    const material = await prisma.material.create({
      data: {
        class_subject_id: dto.classSubjectId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        content_url: dto.contentUrl,
        file_size: dto.fileSize ?? null,
        is_published: false,
        created_by: ctx.userId
      }
    });
    await writeAudit({
      ctx,
      action: "CREATE",
      entity: "material",
      entityId: material.id,
      after: material
    });
    return material;
  }

  async findAll(query: FindMaterialsQueryDto, ctx: RequestContext) {
    const where: Prisma.MaterialWhereInput = {};
    const ids = classIdFilter(ctx);

    if (query.classSubjectId) {
      where.class_subject_id = query.classSubjectId;
    } else if (ids && ids.length > 0) {
      where.class_subject = { class_id: { in: ids } };
    }

    if (query.isPublished !== undefined) where.is_published = query.isPublished;

    if (scopeOf(ctx) === "SENDIRI") {
      // SISWA: hanya materi publish dari kelasnya
      where.is_published = true;
      if (ids && ids.length > 0) where.class_subject = { class_id: { in: ids } };
    } else if (scopeOf(ctx) === "KELAS") {
      // GURU: hanya materi mapel yang dia ampu
      where.class_subject = { teacher_id: ctx.userId };
    }

    return prisma.material.findMany({
      where,
      include: {
        class_subject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, code: true, name: true } }
          }
        },
        created_by_user: { select: { id: true, full_name: true } }
      },
      orderBy: { created_at: "desc" }
    });
  }

  async findOne(id: string) {
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        class_subject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, code: true, name: true } }
          }
        },
        created_by_user: { select: { id: true, full_name: true } }
      }
    });
    if (!material) throw new NotFoundException("Materi tidak ditemukan");
    return material;
  }

  async update(id: string, dto: UpdateMaterialDto, ctx: RequestContext) {
    const existing = await prisma.material.findUnique({
      where: { id },
      include: { class_subject: true }
    });
    if (!existing) throw new NotFoundException("Materi tidak ditemukan");
    assertTeacherOfClassSubject(ctx, existing.class_subject);

    const updated = await prisma.material.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.contentUrl !== undefined && { content_url: dto.contentUrl }),
        ...(dto.fileSize !== undefined && { file_size: dto.fileSize })
      }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "material",
      entityId: id,
      before: existing,
      after: updated
    });
    return updated;
  }

  async publish(id: string, ctx: RequestContext) {
    return this.setPublished(id, true, ctx);
  }

  async unpublish(id: string, ctx: RequestContext) {
    return this.setPublished(id, false, ctx);
  }

  private async setPublished(id: string, published: boolean, ctx: RequestContext) {
    const existing = await prisma.material.findUnique({
      where: { id },
      include: { class_subject: true }
    });
    if (!existing) throw new NotFoundException("Materi tidak ditemukan");
    assertTeacherOfClassSubject(ctx, existing.class_subject);

    const updated = await prisma.material.update({
      where: { id },
      data: { is_published: published }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "material",
      entityId: id,
      before: existing,
      after: updated
    });
    return updated;
  }

  async remove(id: string, ctx: RequestContext) {
    const existing = await prisma.material.findUnique({
      where: { id },
      include: { class_subject: true }
    });
    if (!existing) throw new NotFoundException("Materi tidak ditemukan");
    assertTeacherOfClassSubject(ctx, existing.class_subject);

    await prisma.material.delete({ where: { id } });
    await writeAudit({ ctx, action: "DELETE", entity: "material", entityId: id, before: existing });
    return { deleted: true, id };
  }
}
