import { ForbiddenException } from "@nestjs/common";
import type { RbacScope, RequestContext, Role } from "@opensis/types";

/**
 * Helper scope RBAC sederhana untuk modul LMS (F2-T11).
 *
 * Prinsip (docs/03 §7, docs/02 §14):
 * - SEKOLAH: role admin/staf membaca-menulis seluruh data sekolah.
 * - KELAS: GURU hanya mengakses kelas yang dia ampu (classIds dari
 *   RequestContext — diisi AuthGuard dari relasi ClassSubject + homeroom).
 * - SENDIRI: SISWA/WALI_MURID hanya mengakses data miliknya.
 *
 * Catatan: scope dijamin pertama oleh guard @RequirePermission + scope
 * resolver (common); helper ini tetap dipakai service untuk filter query agar
 * logika scope teruji unit.
 */

/** Role dengan scope SEKOLAH di area LMS (integration memetakan via Permission). */
export const SCHOOL_SCOPED_ROLES: readonly Role[] = [
  "SUPERADMIN",
  "OPERATOR",
  "WAKEPSEK",
  "KEPSEK",
  "KEUANGAN",
  "BK"
] as const;

/** Role yang berhak menulis data master (kelas/mapel/enrollment/jadwal). */
export const MASTER_WRITE_ROLES: readonly Role[] = [
  "SUPERADMIN",
  "OPERATOR",
  "WAKEPSEK",
  "KEPSEK"
] as const;

/** Role yang berhak melihat daftar siswa sebuah kelas. */
export const STUDENT_LIST_ROLES: readonly Role[] = [
  "GURU",
  "SUPERADMIN",
  "OPERATOR",
  "WAKEPSEK",
  "KEPSEK",
  "BK",
  "WALI_MURID"
] as const;

export function scopeOf(ctx: RequestContext): RbacScope {
  if (ctx.roles.some((r) => (SCHOOL_SCOPED_ROLES as readonly string[]).includes(r))) {
    return "SEKOLAH";
  }
  if (ctx.roles.includes("GURU")) return "KELAS";
  return "SENDIRI";
}

export function isSchoolScope(ctx: RequestContext): boolean {
  return scopeOf(ctx) === "SEKOLAH";
}

export function isTeacherScope(ctx: RequestContext): boolean {
  return ctx.roles.includes("GURU");
}

/** True bila user boleh mengelola (tulis) kelas tertentu. */
export function canManageClass(ctx: RequestContext, classId: string): boolean {
  if (isSchoolScope(ctx)) return true;
  return ctx.classIds.includes(classId) || ctx.homeroomClassId === classId;
}

export function assertCanManageClass(ctx: RequestContext, classId: string): void {
  if (!canManageClass(ctx, classId)) {
    throw new ForbiddenException("Akses ditolak: kelas di luar scope");
  }
}

/** True bila user boleh membaca record milik siswa tertentu (SENDIRI). */
export function canAccessStudent(ctx: RequestContext, studentId: string): boolean {
  if (isSchoolScope(ctx)) return true;
  return studentId === ctx.userId;
}

export function assertCanAccessStudent(ctx: RequestContext, studentId: string): void {
  if (!canAccessStudent(ctx, studentId)) {
    throw new ForbiddenException("Akses ditolak: data siswa di luar scope");
  }
}

/** Filter id kelas yang boleh dilihat user; null berarti seluruh sekolah. */
export function classIdFilter(ctx: RequestContext): string[] | null {
  if (isSchoolScope(ctx)) return null;
  return ctx.classIds;
}

/** GURU hanya boleh menulis ClassSubject yang dia ampu (kecuali scope sekolah). */
export function assertTeacherOfClassSubject(
  ctx: RequestContext,
  classSubject: { id: string; teacher_id: string }
): void {
  if (isSchoolScope(ctx)) return;
  if (classSubject.teacher_id !== ctx.userId) {
    throw new ForbiddenException("Akses ditolak: bukan guru pengampu mapel ini");
  }
}

/** Pastikan user memiliki minimal satu role yang diizinkan. */
export function assertHasRole(ctx: RequestContext, allowed: readonly Role[]): void {
  const ok = ctx.roles.some((r) => (allowed as readonly string[]).includes(r));
  if (!ok) {
    throw new ForbiddenException("Akses ditolak: role tidak diizinkan");
  }
}
