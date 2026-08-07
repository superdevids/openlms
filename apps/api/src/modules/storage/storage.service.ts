import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaClient } from "@openlms/database";
import { LocalStorageProvider, UploadedFile } from "./local-storage.provider";
import { BUCKET_POLICIES, UPLOADABLE_BUCKETS } from "./storage.constants";
import type { AuthUser } from "../../common/auth.guard";

/**
 * StorageService — orkestrasi upload + serve file dengan RBAC per bucket.
 * - branding/avatars: public (tanpa auth).
 * - materials/submissions: class-scoped (perlu akses kelas).
 * - exports: requester + admin (SUPERADMIN/OPERATOR/WAKEPSEK/KEPSEK).
 */
@Injectable()
export class StorageService {
  constructor(
    private readonly provider: LocalStorageProvider,
    private readonly db: PrismaClient
  ) {}

  /** Upload file ke bucket yang diizinkan (branding/avatars). */
  async upload(bucket: string, file: UploadedFile, _user: AuthUser): Promise<{ path: string }> {
    if (!UPLOADABLE_BUCKETS.has(bucket)) {
      throw new ForbiddenException("Bucket tidak diizinkan untuk upload.");
    }
    const path = await this.provider.save(bucket, file);
    return { path };
  }

  /** Cek akses baca per bucket; lempar ForbiddenException bila tidak berhak. */
  async assertReadAccess(bucket: string, user: AuthUser | undefined): Promise<void> {
    const policy = BUCKET_POLICIES[bucket] ?? "class";
    if (policy === "public") {
      return;
    }
    if (!user) {
      throw new ForbiddenException("Akses file memerlukan autentikasi.");
    }
    if (policy === "exports") {
      const adminRoles = ["SUPERADMIN", "OPERATOR", "WAKEPSEK", "KEPSEK"];
      if (!user.roles.some((r) => adminRoles.includes(r))) {
        throw new ForbiddenException("Akses file ekspor ditolak.");
      }
      return;
    }
    // class-scoped: role pengajar/admin boleh; siswa hanya jika punya classIds.
    const allowedRoles = ["GURU", "GURU_BK", "OPERATOR", "WAKEPSEK", "KEPSEK", "SUPERADMIN"];
    if (user.roles.some((r) => allowedRoles.includes(r))) {
      return;
    }
    if (user.classIds.length > 0) {
      return;
    }
    throw new ForbiddenException("Akses file kelas ditolak.");
  }

  /** Resolve path absolut untuk serve. */
  async resolveFile(bucket: string, filePath: string): Promise<string> {
    return this.provider.assertExists(bucket, filePath);
  }
}
