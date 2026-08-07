import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@openlms/database";
import type { RequestContext } from "@openlms/types";
import {
  assertCanManageClass,
  assertHasRole,
  classIdFilter,
  MASTER_WRITE_ROLES,
  STUDENT_LIST_ROLES
} from "../lms-scope";
import { writeAudit } from "../lms-audit";
import { BulkEnrollDto, BulkUnenrollDto, UpdateEnrollmentStatusDto } from "./dto/enrollments.dto";

@Injectable()
export class EnrollmentsService {
  /**
   * Enroll bulk: validasi duplikat (unique student+class+academic_year),
   * siswa tidak dikenal dilaporkan di `notFound`, tidak digagalkan sebagian.
   */
  async enroll(classId: string, dto: BulkEnrollDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const klass = await prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException("Kelas tidak ditemukan");

    const found = await prisma.user.findMany({
      where: { id: { in: dto.studentIds } },
      select: { id: true }
    });
    const foundIds = new Set(found.map((u) => u.id));
    const notFound = dto.studentIds.filter((id) => !foundIds.has(id));

    const existing = await prisma.enrollment.findMany({
      where: {
        class_id: classId,
        academic_year_id: klass.academic_year_id,
        student_id: { in: dto.studentIds }
      },
      select: { student_id: true }
    });
    const already = new Set(existing.map((e) => e.student_id));
    const toCreate = dto.studentIds.filter((id) => foundIds.has(id) && !already.has(id));

    if (toCreate.length > 0) {
      await prisma.enrollment.createMany({
        data: toCreate.map((studentId) => ({
          student_id: studentId,
          class_id: classId,
          academic_year_id: klass.academic_year_id,
          status: dto.status ?? "ACTIVE"
        })),
        skipDuplicates: true
      });
    }

    await writeAudit({
      ctx,
      action: "CREATE",
      entity: "enrollment",
      entityId: classId,
      after: { studentIds: toCreate, skippedDuplicates: already.size, notFound }
    });
    return { created: toCreate.length, skippedDuplicates: already.size, notFound };
  }

  /** Keluarkan siswa: status diubah DROPPED (histori tetap ada). */
  async unenroll(classId: string, dto: BulkUnenrollDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const klass = await prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException("Kelas tidak ditemukan");

    const res = await prisma.enrollment.updateMany({
      where: {
        class_id: classId,
        academic_year_id: klass.academic_year_id,
        student_id: { in: dto.studentIds },
        status: "ACTIVE"
      },
      data: { status: "DROPPED" }
    });

    await writeAudit({
      ctx,
      action: "DELETE",
      entity: "enrollment",
      entityId: classId,
      after: { studentIds: dto.studentIds, updated: res.count }
    });
    return { updated: res.count };
  }

  async updateStatus(classId: string, dto: UpdateEnrollmentStatusDto, ctx: RequestContext) {
    assertHasRole(ctx, MASTER_WRITE_ROLES);
    const klass = await prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException("Kelas tidak ditemukan");

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        student_id_class_id_academic_year_id: {
          student_id: dto.studentId,
          class_id: classId,
          academic_year_id: klass.academic_year_id
        }
      }
    });
    if (!enrollment) throw new NotFoundException("Enrollment tidak ditemukan");

    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: dto.status }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "enrollment",
      entityId: enrollment.id,
      before: enrollment,
      after: updated
    });
    return updated;
  }

  /** Daftar siswa per kelas (scope: GURU/homeroom/admin/wali). */
  async students(classId: string, ctx: RequestContext) {
    assertHasRole(ctx, STUDENT_LIST_ROLES);
    const klass = await prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException("Kelas tidak ditemukan");

    const ids = classIdFilter(ctx);
    if (ids && !ids.includes(classId)) {
      throw new ForbiddenException("Akses ditolak: kelas di luar scope");
    }
    assertCanManageClass(ctx, classId);

    return prisma.enrollment.findMany({
      where: { class_id: classId },
      include: {
        student: { select: { id: true, full_name: true, username: true, email: true } }
      },
      orderBy: { created_at: "asc" }
    });
  }
}
