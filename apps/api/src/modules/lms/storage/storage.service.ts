import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { LocalStorageProvider } from "../../storage/local-storage.provider";

/**
 * StorageService (LMS) — facade kompatibilitas yang MENERUSKAN ke
 * StorageModule kanonik (apps/api/src/modules/storage) — R-20 konsolidasi.
 *
 * Implementasi lama (S3-skeleton) dihapus; path helpers (materialPath,
 * submissionPath) dipertahankan untuk kontrak. URL upload/download (R-16)
 * menunjuk route storage asli:
 * - upload:  POST  /api/v1/storage/files/:bucket   (multipart field "file")
 * - download: GET  /api/v1/storage/files/:bucket/<path>
 * (bukan lagi /api/v1/files/upload dummy yang tidak punya controller.)
 */

export interface StoredFile {
  objectPath: string;
  bucket: string;
  filename: string;
  size: number;
}

export interface SignedUploadUrl {
  uploadUrl: string;
  objectPath: string;
  method: "POST";
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
  private readonly defaultExpiry = 15 * 60; // detik

  constructor(private readonly provider?: LocalStorageProvider) {}

  /** Provider kanonik — dipakai DI (StorageModule) atau fallback instance baru. */
  private resolveProvider(): LocalStorageProvider {
    return this.provider ?? new LocalStorageProvider();
  }

  /** Simpan file upload ke bucket (delegasi ke provider kanonik). */
  async saveFile(
    input: { buffer: Buffer; mimetype: string; originalName?: string },
    bucket: string
  ): Promise<StoredFile> {
    const path = await this.resolveProvider().save(bucket, {
      buffer: input.buffer,
      mimetype: input.mimetype,
      originalname: input.originalName
    });
    return {
      objectPath: path,
      bucket,
      filename: path.slice(path.lastIndexOf("/") + 1),
      size: input.buffer.length
    };
  }

  /** Baca file (untuk disajikan lewat route terproteksi). */
  async readFile(objectPath: string): Promise<{ buffer: Buffer; mimetype: string }> {
    const provider = this.resolveProvider();
    const bucket = objectPath.slice(0, objectPath.indexOf("/"));
    const relative = objectPath.slice(objectPath.indexOf("/") + 1);
    if (!bucket || !relative) {
      throw new BadRequestException("Object path tidak valid.");
    }
    const absolute = await provider.assertExists(bucket, relative);
    const buffer = await readFile(absolute);
    return { buffer, mimetype: this.mimetypeFromExt(extname(absolute)) };
  }

  /** Hapus file (best-effort, delegasi ke provider kanonik). */
  async deleteFile(objectPath: string): Promise<void> {
    await this.resolveProvider().deleteRelative(objectPath);
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
   * URL upload route storage asli (R-16): client POST multipart ke
   * /api/v1/storage/files/:bucket, lalu pakai path hasilnya sebagai contentUrl.
   */
  createSignedUploadUrl(opts: {
    bucket?: string;
    objectPath: string;
    contentType?: string;
    expiresIn?: number;
  }): SignedUploadUrl {
    const bucket = opts.bucket ?? "materials";
    return {
      uploadUrl: `/api/v1/storage/files/${bucket}`,
      objectPath: this.fullPath(bucket, opts.objectPath),
      method: "POST",
      expiresIn: opts.expiresIn ?? this.defaultExpiry
    };
  }

  /** URL download route storage asli (GET /storage/files/:bucket/<path>). */
  createSignedDownloadUrl(opts: {
    bucket?: string;
    objectPath: string;
    expiresIn?: number;
  }): SignedDownloadUrl {
    const bucket = opts.bucket ?? "materials";
    const objectPath = this.fullPath(bucket, opts.objectPath);
    const relative = objectPath.startsWith(`${bucket}/`)
      ? objectPath.slice(bucket.length + 1)
      : objectPath;
    const encoded = relative.split("/").map(encodeURIComponent).join("/");
    return {
      downloadUrl: `/api/v1/storage/files/${bucket}/${encoded}`,
      objectPath,
      method: "GET",
      expiresIn: opts.expiresIn ?? this.defaultExpiry
    };
  }

  private fullPath(bucket: string, objectPath: string): string {
    return objectPath.startsWith(`${bucket}/`) ? objectPath : `${bucket}/${objectPath}`;
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
      case ".pdf":
        return "application/pdf";
      default:
        return "application/octet-stream";
    }
  }
}
