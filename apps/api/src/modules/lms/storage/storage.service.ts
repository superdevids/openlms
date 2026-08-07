import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, unlink } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

/**
 * StorageService — penyimpanan file LOKAL di filesystem BE (bukan S3/MinIO).
 *
 * Security hardening (menggantikan skeleton signed-URL dummy yang memakai
 * signature tanpa secret dan menunjuk localhost:9000):
 * - Nama file selalu UUID (tidak pernah trust originalname).
 * - Mimetype allowlist: png/jpg/jpeg/webp; SVG DITOLAK (XSS via script).
 * - Batas ukuran 2MB.
 * - path.resolve + containment check (tolak traversal `..` dan backslash).
 * - File diserve lewat route terproteksi (AuthGuard + RBAC), bukan URL publik.
 */

const ALLOWED_MIMETYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp"]);

const MIMETYPE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export interface StoredFile {
  objectPath: string;
  bucket: string;
  filename: string;
  size: number;
}

export interface SignedUploadUrl {
  uploadUrl: string;
  objectPath: string;
  method: "PUT";
  expiresIn: number;
}

export interface SignedDownloadUrl {
  downloadUrl: string;
  objectPath: string;
  method: "GET";
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly root: string;
  private readonly defaultBucket = "openlms";
  private readonly defaultExpiry = 15 * 60; // detik

  constructor() {
    this.root = resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage");
  }

  /** Simpan file upload ke bucket dengan nama UUID. Mengembalikan path relatif. */
  async saveFile(
    input: { buffer: Buffer; mimetype: string; originalName?: string },
    bucket: string
  ): Promise<StoredFile> {
    if (input.buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException("Ukuran file melebihi batas 2MB.");
    }
    if (!ALLOWED_MIMETYPES.has(input.mimetype)) {
      throw new BadRequestException(
        `Tipe file tidak diizinkan (${input.mimetype}). Hanya PNG/JPG/WebP; SVG dilarang.`
      );
    }
    const ext = MIMETYPE_EXT[input.mimetype];
    const filename = `${randomUUID()}.${ext}`;
    const bucketDir = join(this.root, this.sanitizeSegment(bucket));
    await mkdir(bucketDir, { recursive: true });
    const target = join(bucketDir, filename);
    await new Promise<void>((resolveWrite, rejectWrite) => {
      const out = createWriteStream(target);
      out.on("error", rejectWrite);
      out.on("finish", () => resolveWrite());
      out.end(input.buffer);
    });
    const objectPath = `${bucket}/${filename}`;
    return { objectPath, bucket, filename, size: input.buffer.length };
  }

  /** Baca file (untuk disajikan lewat route terproteksi). */
  async readFile(objectPath: string): Promise<{ buffer: Buffer; mimetype: string }> {
    const absolute = this.resolvePath(objectPath);
    try {
      const s = await stat(absolute);
      if (!s.isFile()) {
        throw new NotFoundException("File tidak ditemukan.");
      }
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException("File tidak ditemukan.");
    }
    const buffer = await readFile(absolute);
    return { buffer, mimetype: this.mimetypeFromExt(extname(absolute)) };
  }

  /** Hapus file (best-effort). */
  async deleteFile(objectPath: string): Promise<void> {
    const absolute = this.resolvePath(objectPath);
    try {
      await unlink(absolute);
    } catch {
      // best-effort: file mungkin sudah tidak ada
    }
  }

  /** Path objek materi di bucket `materials` — nama file UUID (tidak trust originalname). */
  materialPath(classSubjectId: string, filename: string): string {
    const safe = this.sanitizeSegment(classSubjectId);
    return `materials/${safe}/${randomUUID()}-${this.safeStem(filename)}`;
  }

  /** Path objek submission di bucket `submissions` — nama file UUID. */
  submissionPath(assignmentId: string, studentId: string, filename: string): string {
    const safeAssignment = this.sanitizeSegment(assignmentId);
    const safeStudent = this.sanitizeSegment(studentId);
    return `submissions/${safeAssignment}/${safeStudent}/${randomUUID()}-${this.safeStem(filename)}`;
  }

  /**
   * Upload via multipart (route terproteksi). Dipertahankan untuk kompatibilitas
   * kontrak; klien meng-upload file ke route upload, bukan PUT ke URL eksternal.
   */
  createSignedUploadUrl(opts: {
    bucket?: string;
    objectPath: string;
    contentType?: string;
    expiresIn?: number;
  }): SignedUploadUrl {
    const bucket = opts.bucket ?? this.defaultBucket;
    const objectPath = this.fullPath(bucket, opts.objectPath);
    const expiresIn = opts.expiresIn ?? this.defaultExpiry;
    return {
      uploadUrl: `/api/v1/files/upload`,
      objectPath,
      method: "PUT",
      expiresIn
    };
  }

  /** URL download lewat route terproteksi (bukan URL publik tanpa auth). */
  createSignedDownloadUrl(opts: {
    bucket?: string;
    objectPath: string;
    expiresIn?: number;
  }): SignedDownloadUrl {
    const bucket = opts.bucket ?? this.defaultBucket;
    const objectPath = this.fullPath(bucket, opts.objectPath);
    const expiresIn = opts.expiresIn ?? this.defaultExpiry;
    return {
      downloadUrl: `/api/v1/files/download?path=${encodeURIComponent(objectPath)}`,
      objectPath,
      method: "GET",
      expiresIn
    };
  }

  private fullPath(bucket: string, objectPath: string): string {
    return objectPath.startsWith(`${bucket}/`) ? objectPath : `${bucket}/${objectPath}`;
  }

  /** Containment check: pastikan path berada di dalam root storage. */
  private resolvePath(objectPath: string): string {
    if (objectPath.includes("\\")) {
      throw new BadRequestException("Path tidak valid (backslash ditolak).");
    }
    const normalized = normalize(objectPath);
    if (normalized === ".." || normalized.startsWith(`..${sep}`)) {
      throw new BadRequestException("Path tidak valid (traversal ditolak).");
    }
    const absolute = resolve(this.root, normalized);
    if (absolute !== this.root && !absolute.startsWith(this.root + sep)) {
      throw new BadRequestException("Path tidak valid (traversal ditolak).");
    }
    return absolute;
  }

  private sanitizeSegment(segment: string): string {
    const cleaned = segment.replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleaned.length === 0) {
      throw new BadRequestException("Segmen path tidak valid.");
    }
    return cleaned;
  }

  /** Stem nama file aman (tanpa ekstensi berbahaya / traversal). */
  private safeStem(filename: string): string {
    const base = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
    return base.length > 0 ? base : "file";
  }

  private mimetypeFromExt(ext: string): string {
    switch (ext.toLowerCase()) {
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".webp":
        return "image/webp";
      default:
        return "application/octet-stream";
    }
  }
}
