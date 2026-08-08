import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Role } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { LocalStorageProvider, UploadedFile } from "./local-storage.provider";
import { BUCKET_POLICIES, PUBLIC_UPLOAD_BUCKETS, UPLOADABLE_BUCKETS } from "./storage.constants";
import type { AuthUser } from "../../common/auth.guard";
import { writeAudit } from "../lms/lms-audit";

/** Role yang boleh upload ke bucket administratif (app/landing/branding). */
const ADMIN_ROLES: readonly Role[] = ["SUPERADMIN", "OPERATOR", "WAKEPSEK", "KEPSEK"];

/** Role yang boleh upload materi (material:write:class). */
const TEACHER_ROLES: readonly Role[] = ["GURU", "BK", ...ADMIN_ROLES];

/** Batas role upload per bucket (defense-in-depth di atas @RequirePermission). */
const UPLOAD_ROLES: Record<string, readonly Role[]> = {
  branding: ADMIN_ROLES,
  avatars: ADMIN_ROLES,
  landing: ADMIN_ROLES,
  materials: TEACHER_ROLES,
  submissions: TEACHER_ROLES // siswa dilayani lewat cabang classIds di bawah
};

/**
 * StorageService — orkestrasi upload + serve file dengan RBAC per bucket.
 * - branding/avatars/landing: public (tanpa auth).
 * - materials/submissions/ppdb-*: class-scoped (perlu akses kelas).
 * - exports: requester + admin (SUPERADMIN/OPERATOR/WAKEPSEK/KEPSEK).
 * - Upload publik tanpa login hanya bucket PPDB (ppdb-documents/ppdb-consents).
 */
@Injectable()
export class StorageService {
  constructor(
    private readonly provider: LocalStorageProvider,
    private readonly db: PrismaClient
  ) {}

  /** Upload file ke bucket yang diizinkan; bucket PPDB boleh tanpa autentikasi. */
  async upload(
    bucket: string,
    file: UploadedFile,
    user: AuthUser | undefined
  ): Promise<{ path: string }> {
    if (!UPLOADABLE_BUCKETS.has(bucket))
      throw new ForbiddenException("Bucket tidak diizinkan untuk upload.");
    this.assertUploadAllowed(bucket, user);
    const path = await this.provider.save(bucket, file);
    // R-12: upload file dicatat ke AuditLog (entity storage_file).
    await writeAudit({
      ctx: {
        userId: user?.id ?? "system",
        roles: user?.roles ?? []
      },
      action: "CREATE",
      entity: "storage_file",
      entityId: path,
      after: { bucket, mimetype: file.mimetype, size: file.buffer.byteLength }
    });
    return { path };
  }

  /** Cek akses baca per bucket; lempar ForbiddenException bila tidak berhak. */
  async assertReadAccess(bucket: string, user: AuthUser | undefined): Promise<void> {
    const policy = BUCKET_POLICIES[bucket] ?? "class";
    if (policy === "public") return;
    if (!user) throw new ForbiddenException("Akses file memerlukan autentikasi.");
    if (policy === "ppdb") {
      // Dokumen PPDB (KK/consent) = PII — hanya staf sekolah (bukan GURU/SISWA).
      const staffRoles = ["SUPERADMIN", "OPERATOR", "WAKEPSEK", "KEPSEK"];
      if (!user.roles.some((r) => staffRoles.includes(r)))
        throw new ForbiddenException("Akses dokumen PPDB hanya untuk staf sekolah.");
      return;
    }
    if (policy === "exports") {
      const adminRoles = ["SUPERADMIN", "OPERATOR", "WAKEPSEK", "KEPSEK"];
      if (!user.roles.some((r) => adminRoles.includes(r)))
        throw new ForbiddenException("Akses file ekspor ditolak.");
      return;
    }
    // class-scoped: role pengajar/admin boleh; siswa hanya jika punya classIds.
    const allowedRoles = ["GURU", "BK", "OPERATOR", "WAKEPSEK", "KEPSEK", "SUPERADMIN"];
    if (user.roles.some((r) => allowedRoles.includes(r))) return;
    if (user.classIds.length > 0) return;
    throw new ForbiddenException("Akses file kelas ditolak.");
  }

  /** Resolve path absolut untuk serve. */
  async resolveFile(bucket: string, filePath: string): Promise<string> {
    return this.provider.assertExists(bucket, filePath);
  }

  /** Hapus file relatif (best-effort) — dipakai job cleanup orphan (R-21). */
  async deleteRelative(objectPath: string): Promise<boolean> {
    return this.provider.deleteRelative(objectPath);
  }

  /**
   * Otorisasi upload per bucket:
   * - PUBLIC_UPLOAD_BUCKETS (ppdb-documents/ppdb-consents): tanpa login.
   * - Selain itu wajib login; role dicocokkan dengan UPLOAD_ROLES.
   * - submissions: siswa terdaftar (classIds non-kosong) diizinkan.
   */
  private assertUploadAllowed(bucket: string, user: AuthUser | undefined): void {
    if (PUBLIC_UPLOAD_BUCKETS.has(bucket)) return;
    if (!user) throw new UnauthorizedException("Akses upload memerlukan autentikasi.");
    const allowedRoles = UPLOAD_ROLES[bucket] ?? ADMIN_ROLES;
    if (user.roles.some((r) => allowedRoles.includes(r))) return;
    if (bucket === "submissions" && user.classIds.length > 0) return;
    throw new ForbiddenException("Akses upload ke bucket ini ditolak.");
  }
}
