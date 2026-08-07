/**
 * Konstanta StorageModule — local BE filesystem (tanpa S3).
 * Bucket: branding/avatars public; materials class-scoped; exports requester+admin.
 */

/** Direktori root penyimpanan lokal (env STORAGE_LOCAL_DIR, default ./storage). */
export const STORAGE_LOCAL_DIR: string = process.env.STORAGE_LOCAL_DIR ?? "./storage";

/** Batas ukuran file upload (2MB). */
export const MAX_FILE_SIZE = 2 * 1024 * 1024;

/** Allowlist mimetype — SVG DITOLAK (XSS via script in SVG). */
export const ALLOWED_MIMETYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp"
]);

/** Ekstensi file per mimetype (untuk nama file UUID). */
export const MIMETYPE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
};

/** Kebijakan akses per bucket (RBAC scope). */
export type BucketPolicy = "public" | "class" | "exports";

export const BUCKET_POLICIES: Record<string, BucketPolicy> = {
  branding: "public",
  avatars: "public",
  materials: "class",
  submissions: "class",
  exports: "exports"
};

/** Bucket yang boleh di-upload via endpoint ini (branding/avatars). */
export const UPLOADABLE_BUCKETS: ReadonlySet<string> = new Set(["branding", "avatars"]);
