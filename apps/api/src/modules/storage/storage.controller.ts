import {
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
import { extname } from "path";
import { StorageService } from "./storage.service";
import { MAX_FILE_SIZE } from "./storage.constants";
import { CurrentUser } from "../../common/current-user.decorator";
import { Public } from "../../common/public.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import type { AuthUser } from "../../common/auth.guard";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

/**
 * StorageController — serve file lokal + upload (branding/avatars).
 * - GET /storage/files/branding|avatars/* → @Public() (pre-login; logo/favicon web).
 * - GET /storage/files/:bucket/* → protected (materials class-scoped, exports admin).
 * - Upload memakai multer memoryStorage (2MB, allowlist mimetype di provider).
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

  /** Serve bucket terproteksi (materials class-scoped, exports requester+admin). */
  @Get("files/:bucket/*splat")
  @RequirePermission("material:read:class", "export:read:school")
  async serveProtected(
    @Param("bucket") bucket: string,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: AuthUser
  ): Promise<void> {
    await this.storageService.assertReadAccess(bucket, user);
    await this.serveFile(bucket, (req.params.splat as string | undefined) ?? "", res);
  }

  /** Upload file ke bucket branding/avatars (multipart, field "file"). */
  @Post("files/:bucket")
  @RequirePermission("app:write:school")
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
    if (!file) {
      return { path: "" };
    }
    return this.storageService.upload(bucket, file, user);
  }

  /** Stream file dengan Content-Type + Cache-Control (immutable karena nama UUID). */
  private async serveFile(bucket: string, filePath: string, res: Response): Promise<void> {
    const absolute = await this.storageService.resolveFile(bucket, filePath);

    const s = await stat(absolute);
    const ext = extname(absolute).toLowerCase();
    const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", s.size);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const stream = createReadStream(absolute);
    stream.on("error", () => {
      if (!res.headersSent) res.status(404).end();
    });
    stream.pipe(res);
  }
}
