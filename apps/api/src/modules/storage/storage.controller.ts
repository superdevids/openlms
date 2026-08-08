import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request, Response } from "express";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { basename, extname } from "path";
import { StorageService } from "./storage.service";
import {
  EXTENSION_MIMETYPE,
  IMAGE_EXTENSIONS,
  MAX_FILE_SIZE,
  PUBLIC_UPLOAD_BUCKETS
} from "./storage.constants";
import { CurrentUser } from "../../common/current-user.decorator";
import { Public } from "../../common/public.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * StorageController — serve file lokal + upload.
 * - GET /storage/files/branding|avatars|landing/* → @Public() (pre-login; web publik).
 * - GET /storage/files/:bucket/* → protected (materials/submissions class-scoped,
 *   exports admin, ppdb-* staff).
 * - POST /storage/files/:bucket → upload terautentikasi (branding/avatars/landing/
 *   materials/submissions); RBAC per bucket di StorageService (R-16).
 * - POST /storage/files/public/:bucket → upload publik PPDB (ppdb-documents/
 *   ppdb-consents), wizard PPDB tanpa login (R-17).
 * - Ceiling multer = batas terbesar antar bucket; limit presisi per bucket
 *   di LocalStorageProvider (R-18). Verifikasi magic bytes (R-15).
 * Path wildcard memakai syntax Express 5 (path-to-regexp v8): `*splat`.
 */
@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /** Serve bucket publik (branding/avatars) — pre-login. */
  @Get("files/branding/*splat")
  @Public()
  async serveBranding(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.serveFile("branding", (req.params.splat as string | undefined) ?? "", res);
  }

  @Get("files/avatars/*splat")
  @Public()
  async serveAvatars(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.serveFile("avatars", (req.params.splat as string | undefined) ?? "", res);
  }

  /** Serve bucket landing (image landing page + cover berita) — publik (R-19). */
  @Get("files/landing/*splat")
  @Public()
  async serveLanding(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.serveFile("landing", (req.params.splat as string | undefined) ?? "", res);
  }

  /** Serve bucket terproteksi (materials/submissions class-scoped, exports admin). */
  @Get("files/:bucket/*splat")
  @RequirePermission("material:read:class", "export:read:school", "ppdb:verify:school")
  async serveProtected(
    @Param("bucket") bucket: string,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: AuthUser
  ): Promise<void> {
    await this.storageService.assertReadAccess(bucket, user);
    await this.serveFile(bucket, (req.params.splat as string | undefined) ?? "", res);
  }

  /**
   * Upload file ke bucket (multipart, field "file").
   * Terautentikasi — RBAC per bucket di StorageService (materials: guru pengampu,
   * submissions: siswa kelas/role mengajar, branding/avatars/landing: admin).
   */
  @Post("files/:bucket")
  @RequirePermission(
    "material:write:class",
    "submission:submit:self",
    "app:write:school",
    "landing:write:school"
  )
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE }
    })
  )
  async upload(
    @Param("bucket") bucket: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser
  ): Promise<{ path: string }> {
    if (!file) throw new BadRequestException("File tidak ditemukan di field 'file'.");
    return this.storageService.upload(bucket, file, user);
  }

  /**
   * Upload publik PPDB (tanpa login) — hanya bucket ppdb-documents/ppdb-consents.
   * Rate limit per-IP di RateLimitMiddleware (R-22); magic bytes + size di provider.
   */
  @Post("files/public/:bucket")
  @Public()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE }
    })
  )
  async uploadPublic(
    @Param("bucket") bucket: string,
    @UploadedFile() file: Express.Multer.File | undefined
  ): Promise<{ path: string }> {
    if (!PUBLIC_UPLOAD_BUCKETS.has(bucket))
      throw new BadRequestException("Bucket tidak diizinkan untuk upload publik.");
    if (!file) throw new BadRequestException("File tidak ditemukan di field 'file'.");
    return this.storageService.upload(bucket, file, undefined);
  }

  /** Stream file dengan Content-Type + Cache-Control (immutable karena nama UUID). */
  private async serveFile(bucket: string, filePath: string, res: Response): Promise<void> {
    const absolute = await this.storageService.resolveFile(bucket, filePath);

    const s = await stat(absolute);
    const ext = extname(absolute).toLowerCase();
    const contentType = EXTENSION_MIMETYPE[ext] ?? "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", s.size);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // File non-gambar dilayani sebagai download (attachment) — cegah eksekusi
    // inline (HTML/SVG/script) dan render dokumen berbahaya di browser (R-26).
    if (!IMAGE_EXTENSIONS.has(ext)) {
      res.setHeader("Content-Disposition", `attachment; filename="${basename(absolute)}"`);
    }

    const stream = createReadStream(absolute);
    stream.on("error", () => {
      if (!res.headersSent) res.status(404).end();
    });
    stream.pipe(res);
  }
}
