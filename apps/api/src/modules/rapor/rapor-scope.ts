import { ForbiddenException } from "@nestjs/common";
import { prisma } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import { canManageClass, isSchoolScope } from "../lms/lms-scope";

/**
 * Scope baca rapor (G-49 e-Rapor v1) — pola lms-scope (F2-T11) + SEC-001
 * (ParentStudentLink APPROVED untuk WALI_MURID, lihat invoice.service.ts).
 *
 * - SEKOLAH (KEPSEK/WAKEPSEK/BK/OPERATOR/SUPERADMIN, plus KEUANGAN/AUDITOR/
 *   KAPRODI via SCHOOL_SCOPED_ROLES): boleh baca semua siswa.
 * - KELAS (GURU): hanya siswa di kelas ampu/homeroom (ctx.classIds /
 *   ctx.homeroomClassId — diisi ScopeResolver dari relasi ClassSubject).
 * - SENDIRI (SISWA): studentId === userId.
 * - WALI_MURID: hanya anak via ParentStudentLink status APPROVED.
 *
 * Guard @RequirePermission sudah memfilter berdasarkan permission; helper ini
 * menegakkan batasan baris (row-level) di service agar teruji unit.
 */

/**
 * Kode tahun ajaran aktif — SATU-SATUNYA sumber fallback tahun ajaran modul
 * rapor (dipakai rapor.service via import; JANGAN hardcode di file lain).
 */
export async function resolveAcademicYearCode(): Promise<string> {
  const school = await prisma.schoolProfile.findFirst({
    select: { current_academic_year: { select: { code: true } } }
  });
  return school?.current_academic_year?.code ?? "2026/2027";
}

/** True bila user boleh membaca rapor milik siswa tertentu. */
export async function canReadRapor(ctx: RequestContext, studentId: string): Promise<boolean> {
  if (isSchoolScope(ctx)) return true;
  if (ctx.roles.includes("GURU")) {
    if (studentId === ctx.userId) return true;
    // Hanya enrollment AKTIF pada tahun ajaran berjalan — siswa pindah kelas
    // lintas tahun tidak boleh bocor scope kelas lama (media-review L-07).
    const activeYear = await resolveAcademicYearCode();
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        status: "ACTIVE",
        academic_year: { code: activeYear }
      },
      select: { class_id: true }
    });
    if (!enrollment) return false;
    return (
      ctx.classIds.includes(enrollment.class_id) || ctx.homeroomClassId === enrollment.class_id
    );
  }
  if (ctx.roles.includes("SISWA")) {
    return studentId === ctx.userId;
  }
  if (ctx.roles.includes("WALI_MURID")) {
    const link = await prisma.parentStudentLink.findFirst({
      where: { parent: { user_id: ctx.userId }, student_id: studentId, status: "APPROVED" },
      select: { id: true }
    });
    return link !== null;
  }
  return false;
}

export async function assertCanReadRapor(ctx: RequestContext, studentId: string): Promise<void> {
  const ok = await canReadRapor(ctx, studentId);
  if (!ok) {
    throw new ForbiddenException("Akses ditolak: rapor siswa di luar scope");
  }
}

/** Akses tulis P5: scope sekolah bebas; GURU hanya kelas ampu (classId wajib). */
export function assertCanWriteP5(ctx: RequestContext, classId: string | null | undefined): void {
  if (isSchoolScope(ctx)) return;
  if (!ctx.roles.includes("GURU")) {
    throw new ForbiddenException("Akses ditolak: role tidak memiliki izin tulis P5");
  }
  if (!classId || !canManageClass(ctx, classId)) {
    throw new ForbiddenException("Akses ditolak: kelas di luar scope");
  }
}
