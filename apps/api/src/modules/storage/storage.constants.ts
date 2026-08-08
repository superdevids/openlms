/**
 * Konstanta StorageModule — local BE filesystem (tanpa S3).
 * Bucket: branding/avatars/landing public; materials/submissions/ppdb class-scoped;
 * exports requester+admin. Upload publik hanya bucket PPDB (ppdb-documents,
 * ppdb-consents) — wizard PPDB tanpa login.
 */

/** Direktori root penyimpanan lokal (env STORAGE_LOCAL_DIR, default ./storage). */
export const STORAGE_LOCAL_DIR: string = process.env.STORAGE_LOCAL_DIR ?? "./storage";

/** Batas ukuran default per bucket (MB). Override via env STORAGE_MAX_<BUCKET>_MB. */
const BUCKET_SIZE_MB_DEFAULTS: Record<string, number> = {
  branding: 2,
  avatars: 2,
  materials: 10,
  submissions: 20,
  exports: 50,
  "ppdb-documents": 5,
  "ppdb-consents": 5,
  landing: 5
};

/** Nama env per bucket: "ppdb-documents" → STORAGE_MAX_PPDB_DOCUMENTS_MB. */
function bucketEnvName(bucket: string): string {
  return `STORAGE_MAX_${bucket.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_MB`;
}

/** Batas ukuran file per bucket (bytes) — di-enforce di LocalStorageProvider.save. */
export const BUCKET_MAX_SIZES: Record<string, number> = Object.fromEntries(
  Object.entries(BUCKET_SIZE_MB_DEFAULTS).map(([bucket, mb]) => {
    const parsed = Number(process.env[bucketEnvName(bucket)]);
    const sizeMb = Number.isFinite(parsed) && parsed > 0 ? parsed : mb;
    return [bucket, sizeMb * 1024 * 1024];
  })
);

/**
 * Batas ukuran per bucket dibaca SAAT DIPANGGIL (bukan saat module load) —
 * memudahkan test (env di-set sebelum konstruksi provider) dan tetap
 * menghormati override env STORAGE_MAX_<BUCKET>_MB. Dipakai LocalStorageProvider.
 */
export function bucketMaxSize(bucket: string): number {
  const fallbackMb = BUCKET_SIZE_MB_DEFAULTS[bucket];
  if (fallbackMb === undefined) {
    return Math.max(...Object.values(BUCKET_MAX_SIZES));
  }
  const parsed = Number(process.env[bucketEnvName(bucket)]);
  const sizeMb = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMb;
  return sizeMb * 1024 * 1024;
}

/**
 * Ceiling multer (memoryStorage) — batas terbesar antar bucket. Limit presisi
 * per bucket (R-18) di-enforce di LocalStorageProvider.save setelah buffer.
 */
export const MAX_FILE_SIZE: number = Math.max(...Object.values(BUCKET_MAX_SIZES));

/** Mimetype gambar (branding/avatars/landing). */
const IMAGE_MIMETYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp"];

/** Mimetype dokumen (materials/submissions/exports/ppdb) — gambar + PDF (R-19). */
const DOCUMENT_MIMETYPES: readonly string[] = [...IMAGE_MIMETYPES, "application/pdf"];

/** Allowlist mimetype per bucket — SVG DITOLAK (XSS via script di SVG). */
export const BUCKET_MIMETYPES: Record<string, ReadonlySet<string>> = {
  branding: new Set(IMAGE_MIMETYPES),
  avatars: new Set(IMAGE_MIMETYPES),
  materials: new Set(DOCUMENT_MIMETYPES),
  submissions: new Set(DOCUMENT_MIMETYPES),
  exports: new Set(DOCUMENT_MIMETYPES),
  "ppdb-documents": new Set(DOCUMENT_MIMETYPES),
  "ppdb-consents": new Set(DOCUMENT_MIMETYPES),
  landing: new Set(IMAGE_MIMETYPES)
};

/** Allowlist gabungan (untuk bucket tanpa entri eksplisit). */
export const ALLOWED_MIMETYPES: ReadonlySet<string> = new Set([...DOCUMENT_MIMETYPES]);

/** Ekstensi file per mimetype (untuk nama file UUID). */
export const MIMETYPE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf"
};

/**
 * Tabel signature magic bytes (R-15) — verifikasi konten sesuai mimetype.
 * Implementasi lokal, tanpa dependency baru (architect design MAGIC_SIGNATURES).
 */
export interface MagicSignature {
  label: string;
  matches: (buf: Buffer) => boolean;
}

export const MAGIC_SIGNATURES: Record<string, MagicSignature> = {
  "image/png": {
    label: "PNG",
    matches: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
  },
  "image/jpeg": {
    label: "JPEG",
    matches: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  },
  "image/webp": {
    label: "WebP",
    matches: (buf) =>
      buf.length >= 12 &&
      buf.toString("latin1", 0, 4) === "RIFF" &&
      buf.toString("latin1", 8, 12) === "WEBP"
  },
  "application/pdf": {
    label: "PDF",
    matches: (buf) => buf.length >= 5 && buf.toString("latin1", 0, 5) === "%PDF-"
  }
};

/** Kebijakan akses per bucket (RBAC scope). */
export type BucketPolicy = "public" | "class" | "exports" | "ppdb";

export const BUCKET_POLICIES: Record<string, BucketPolicy> = {
  branding: "public",
  avatars: "public",
  landing: "public",
  materials: "class",
  submissions: "class",
  "ppdb-documents": "ppdb",
  "ppdb-consents": "ppdb",
  exports: "exports"
};

/** Bucket yang boleh di-upload via endpoint (RBAC di StorageService per bucket). */
export const UPLOADABLE_BUCKETS: ReadonlySet<string> = new Set([
  "branding",
  "avatars",
  "landing",
  "materials",
  "submissions",
  "ppdb-documents",
  "ppdb-consents"
]);

/** Bucket yang boleh di-upload TANPA autentikasi (wizard PPDB publik, R-17). */
export const PUBLIC_UPLOAD_BUCKETS: ReadonlySet<string> = new Set([
  "ppdb-documents",
  "ppdb-consents"
]);
