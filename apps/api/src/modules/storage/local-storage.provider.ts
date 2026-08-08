import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, stat, unlink } from "fs/promises";
import { extname, join, normalize, resolve, sep } from "path";
import {
  ALLOWED_MIMETYPES,
  bucketMaxSize,
  BUCKET_MIMETYPES,
  MAGIC_SIGNATURES,
  MIMETYPE_EXT,
  STORAGE_LOCAL_DIR
} from "./storage.constants";

/** Kontrak minimal file upload (multer memoryStorage). */
export interface UploadedFile {
  mimetype: string;
  buffer: Buffer;
  originalname?: string;
}

/** Ekstensi yang boleh diserve/disimpan (gambar + PDF). */
const ALLOWED_EXTENSIONS: readonly string[] = [".png", ".jpg", ".jpeg", ".webp", ".pdf"];

/**
 * LocalStorageProvider — penyimpanan file di filesystem BE (tanpa S3).
 * - Nama file selalu UUID (tidak pernah trust originalname).
 * - Limit ukuran per bucket (R-18) + mimetype allowlist per bucket (R-19).
 * - Verifikasi magic bytes (R-15): konten harus cocok dengan mimetype yang
 *   dideklarasikan (PNG/JPEG/WebP/PDF); polyglot/mismatch ditolak 400.
 * - resolve() memakai path.resolve + containment check (tolak ../ dan backslash).
 */
@Injectable()
export class LocalStorageProvider {
  private readonly root: string;

  constructor() {
    this.root = resolve(STORAGE_LOCAL_DIR);
  }

  /** Root absolut penyimpanan (dipakai job cleanup/orphan, R-21). */
  getRoot(): string {
    return this.root;
  }

  /** Simpan file upload ke bucket dengan nama UUID. Mengembalikan path relatif. */
  async save(bucket: string, file: UploadedFile): Promise<string> {
    this.assertSize(bucket, file);
    this.assertMimetype(bucket, file.mimetype);
    this.assertMagicBytes(file.mimetype, file.buffer);
    const ext = MIMETYPE_EXT[file.mimetype];
    const filename = `${randomUUID()}.${ext}`;
    const bucketDir = join(this.root, this.sanitizeSegment(bucket));
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

  /**
   * Hapus file relatif terhadap root (mis. "materials/abc/uuid.pdf") dengan
   * containment check. Mengembalikan false bila file tidak ada (best-effort).
   */
  async deleteRelative(objectPath: string): Promise<boolean> {
    const absolute = this.resolveObjectPath(objectPath);
    try {
      const s = await stat(absolute);
      if (!s.isFile()) {
        return false;
      }
      await unlink(absolute);
      return true;
    } catch {
      return false;
    }
  }

  /** Resolve objectPath ("bucket/sub/path") ke absolute + containment check. */
  private resolveObjectPath(objectPath: string): string {
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

  private assertSize(bucket: string, file: UploadedFile): void {
    const maxSize = bucketMaxSize(bucket);
    if (file.buffer.length > maxSize) {
      const mb = maxSize / (1024 * 1024);
      throw new BadRequestException(`Ukuran file melebihi batas ${mb}MB untuk bucket "${bucket}".`);
    }
  }

  private assertMimetype(bucket: string, mimetype: string): void {
    const allowed = BUCKET_MIMETYPES[bucket] ?? ALLOWED_MIMETYPES;
    if (!allowed.has(mimetype)) {
      throw new BadRequestException(
        `Tipe file tidak diizinkan untuk bucket "${bucket}" (${mimetype}). ` +
          `Hanya ${[...allowed].join("/")}; SVG dilarang.`
      );
    }
  }

  /** Verifikasi magic bytes buffer cocok dengan mimetype yang dideklarasikan (R-15). */
  private assertMagicBytes(mimetype: string, buffer: Buffer): void {
    const signature = MAGIC_SIGNATURES[mimetype];
    if (signature && !signature.matches(buffer)) {
      throw new BadRequestException(
        `Konten file tidak cocok dengan tipe ${mimetype} ` +
          `(magic bytes ${signature.label} tidak ditemukan).`
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
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException("Ekstensi file tidak diizinkan.");
    }
    return normalized;
  }
}
