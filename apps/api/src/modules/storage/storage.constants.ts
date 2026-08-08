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
 * Batas keras GLOBAL upload (default 50MB, override env STORAGE_GLOBAL_MAX_MB) —
 * defense-in-depth di atas limit per bucket (R-18). Dibaca SAAT DIPANGGIL
 * (pola sama dengan bucketMaxSize) agar mudah diuji via env.
 */
export function globalMaxFileSize(): number {
  const parsed = Number(process.env.STORAGE_GLOBAL_MAX_MB);
  const sizeMb = Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
  return sizeMb * 1024 * 1024;
}

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
 * Ceiling multer (memoryStorage) — batas terbesar antar bucket, dipotong oleh
 * batas keras global. Limit presisi per bucket (R-18) di-enforce di
 * LocalStorageProvider.save setelah buffer.
 */
export const MAX_FILE_SIZE: number = Math.min(
  Math.max(...Object.values(BUCKET_MAX_SIZES)),
  globalMaxFileSize()
);

/** Mimetype gambar (branding/avatars/landing). */
const IMAGE_MIMETYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp"];

/** Mimetype dokumen Office/teks/arsip (R-26) — dipakai bucket dokumen. */
const OFFICE_MIMETYPES: readonly string[] = [
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/csv", // .csv
  "text/plain", // .txt
  "application/zip" // .zip
];

/** Mimetype dokumen (materials/submissions/exports/ppdb) — gambar + PDF + Office. */
const DOCUMENT_MIMETYPES: readonly string[] = [
  ...IMAGE_MIMETYPES,
  "application/pdf",
  ...OFFICE_MIMETYPES
];

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

/**
 * Allowlist ekstensi STRICT (R-26) — daftar ekstensi yang DIIZINKAN per bucket,
 * bukan blocklist. SVG/HTML/JS/PHP/executable/script (exe, sh, bat, cmd, ps1,
 * vbs, apk, jar, msi, dll, so, dylib, py, rb, pl, sql, json, xml, dll.) TIDAK
 * PERNAH ada di daftar ini. Bucket gambar hanya gambar; bucket dokumen boleh
 * gambar + PDF + dokumen Office + teks + arsip.
 */
const EXTENSIONS_IMAGES: readonly string[] = [".png", ".jpg", ".jpeg", ".webp"];

const EXTENSIONS_DOCUMENTS: readonly string[] = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".zip"
];

/** Allowlist ekstensi per bucket. */
export const BUCKET_EXTENSIONS: Record<string, ReadonlySet<string>> = {
  branding: new Set(EXTENSIONS_IMAGES),
  avatars: new Set(EXTENSIONS_IMAGES),
  landing: new Set(EXTENSIONS_IMAGES),
  materials: new Set(EXTENSIONS_DOCUMENTS),
  submissions: new Set(EXTENSIONS_DOCUMENTS),
  exports: new Set(EXTENSIONS_DOCUMENTS),
  "ppdb-documents": new Set(EXTENSIONS_DOCUMENTS),
  "ppdb-consents": new Set(EXTENSIONS_DOCUMENTS)
};

/** Allowlist ekstensi gabungan (bucket tanpa entri eksplisit + serve). */
export const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set(EXTENSIONS_DOCUMENTS);

/** Ekstensi gambar — dipakai keputusan Content-Disposition saat serve (R-26). */
export const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(EXTENSIONS_IMAGES);

/** Ekstensi yang boleh menyertai tiap mimetype (ekstensi ↔ mimetype konsisten). */
export const MIMETYPE_EXTENSIONS: Record<string, ReadonlySet<string>> = {
  "image/png": new Set([".png"]),
  "image/jpeg": new Set([".jpg", ".jpeg"]),
  "image/webp": new Set([".webp"]),
  "application/pdf": new Set([".pdf"]),
  "application/msword": new Set([".doc"]),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": new Set([".docx"]),
  "application/vnd.ms-excel": new Set([".xls"]),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": new Set([".xlsx"]),
  "text/csv": new Set([".csv"]),
  "text/plain": new Set([".txt"]),
  "application/zip": new Set([".zip"])
};

/** Peta ekstensi → mimetype (Content-Type saat serve; sumber tunggal). */
export const EXTENSION_MIMETYPE: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".zip": "application/zip"
};

/** Ekstensi file per mimetype (untuk nama file aman). */
export const MIMETYPE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/zip": "zip"
};

/**
 * Tabel signature magic bytes (R-15) — verifikasi konten sesuai mimetype.
 * Implementasi lokal, tanpa dependency baru (architect design MAGIC_SIGNATURES).
 */
export interface MagicSignature {
  label: string;
  matches: (buf: Buffer) => boolean;
}

/**
 * Heuristik "terlihat teks" (CSV/TXT, R-26): 8KB pertama tanpa null byte dan
 * maksimal 1% byte kontrol non-standar (0x00-0x08, 0x0E-0x1F). File binary
 * ber-padding bisa lolos — lapis konten ini hanya pelengkap; verifikasi utama
 * tetap ekstensi allowlist + mimetype + magic bytes.
 */
function isTextLike(buf: Buffer): boolean {
  const head = buf.subarray(0, Math.min(buf.length, 8192));
  if (head.length === 0) return true; // file kosong dianggap teks valid
  if (head.includes(0)) return false; // null byte → binary
  let weird = 0;
  for (const b of head) {
    const normal = (b >= 0x20 && b <= 0x7e) || b === 0x09 || b === 0x0a || b === 0x0d || b >= 0x80;
    if (!normal) weird++;
  }
  return weird / head.length <= 0.01;
}

/** ZIP PK header (DOCX/XLSX/ZIP) — 50 4B (PK\x03\x04 / PK\x05\x06 / PK\x07\x08). */
const ZIP_PK: MagicSignature = {
  label: "ZIP (PK 50 4B)",
  matches: (buf) => buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b
};

/** OLE2 (DOC/XLS lama) — D0 CF 11 E0 A1 B1 1A E1. */
const OLE2: MagicSignature = {
  label: "OLE2 (DOC/XLS)",
  matches: (buf) =>
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
};

/** Teks biasa (CSV/TXT) — tolak null bytes / konten binary. */
const TEXT: MagicSignature = {
  label: "Teks biasa",
  matches: (buf) => isTextLike(buf)
};

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
  },
  "application/msword": OLE2,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ZIP_PK,
  "application/vnd.ms-excel": OLE2,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ZIP_PK,
  "application/zip": ZIP_PK,
  "text/csv": TEXT,
  "text/plain": TEXT
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
