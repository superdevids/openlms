import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, stat } from "fs/promises";
import { extname, join, normalize, resolve, sep } from "path";
import { ALLOWED_MIMETYPES, MIMETYPE_EXT, STORAGE_LOCAL_DIR } from "./storage.constants";

/** Kontrak minimal file upload (multer memoryStorage). */
export interface UploadedFile {
  mimetype: string;
  buffer: Buffer;
  originalname?: string;
}

/**
 * LocalStorageProvider — penyimpanan file di filesystem BE (tanpa S3).
 * - Nama file selalu UUID (tidak pernah trust originalname).
 * - Mimetype allowlist (png/jpg/jpeg/webp); SVG ditolak (XSS).
 * - resolve() memakai path.resolve + containment check (tolak ../ dan backslash).
 */
@Injectable()
export class LocalStorageProvider {
  private readonly root: string;

  constructor() {
    this.root = resolve(STORAGE_LOCAL_DIR);
  }

  /** Simpan file upload ke bucket dengan nama UUID. Mengembalikan path relatif. */
  async save(bucket: string, file: UploadedFile): Promise<string> {
    this.assertMimetype(file.mimetype);
    const ext = MIMETYPE_EXT[file.mimetype];
    const filename = `${randomUUID()}.${ext}`;
    const bucketDir = join(this.root, bucket);
    await mkdir(bucketDir, { recursive: true });

    const target = join(bucketDir, filename);
    await new Promise<void>((resolveWrite, rejectWrite) => {
      const out = createWriteStream(target);
      out.on("error", rejectWrite);
      out.on("finish", () => resolveWrite());
      out.end(file.buffer);
    });

    return `${bucket}/${filename}`;
  }

  /** Resolve path relatif ke absolute dengan containment check (anti traversal). */
  resolve(bucket: string, filePath: string): string {
    const safeBucket = this.sanitizeSegment(bucket);
    const safePath = this.sanitizePath(filePath);
    const absolute = resolve(this.root, safeBucket, safePath);
    const bucketRoot = resolve(this.root, safeBucket);
    if (absolute !== bucketRoot && !absolute.startsWith(bucketRoot + sep)) {
      throw new BadRequestException("Path file tidak valid (traversal ditolak).");
    }
    return absolute;
  }

  /** Cek file ada dan kembalikan path absolut. */
  async assertExists(bucket: string, filePath: string): Promise<string> {
    const absolute = this.resolve(bucket, filePath);
    try {
      const s = await stat(absolute);
      if (!s.isFile()) {
        throw new NotFoundException("File tidak ditemukan.");
      }
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException("File tidak ditemukan.");
    }
    return absolute;
  }

  private assertMimetype(mimetype: string): void {
    if (!ALLOWED_MIMETYPES.has(mimetype)) {
      throw new BadRequestException(
        `Tipe file tidak diizinkan (${mimetype}). Hanya PNG/JPG/WebP; SVG dilarang.`
      );
    }
  }

  /** Segmen bucket: hanya alfanumerik + dash/underscore. */
  private sanitizeSegment(segment: string): string {
    const cleaned = segment.replace(/[^a-zA-Z0-9_-]/g, "");
    if (cleaned.length === 0) {
      throw new BadRequestException("Bucket tidak valid.");
    }
    return cleaned;
  }

  /** Path file: normalisasi, tolak traversal (..) dan backslash. */
  private sanitizePath(filePath: string): string {
    if (filePath.includes("\\")) {
      throw new BadRequestException("Path tidak valid (backslash ditolak).");
    }
    const normalized = normalize(filePath);
    if (normalized === ".." || normalized.startsWith(`..${sep}`)) {
      throw new BadRequestException("Path tidak valid (traversal ditolak).");
    }
    // Hanya izinkan ekstensi file yang dikenal (hindari serve file arbitrer).
    const ext = extname(normalized).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      throw new BadRequestException("Ekstensi file tidak diizinkan.");
    }
    return normalized;
  }
}
