import { Injectable, NestMiddleware, PayloadTooLargeException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { bucketMaxSize, globalMaxFileSize } from "./storage.constants";

/**
 * UploadSizeLimitMiddleware — reject DINI upload besar (R-26).
 *
 * Bila header Content-Length melebihi batas per-bucket atau batas keras
 * global, langsung 413 tanpa menunggu body upload selesai (hemat bandwidth,
 * memori, dan waktu). Untuk request chunked (tanpa Content-Length) multer
 * `limits.fileSize` tetap menegakkan batas saat membaca stream.
 *
 * Dicocokkan di AppModule/StorageModule untuk semua route; middleware ini
 * self-guard (hanya POST ke /storage/files/* yang diproses).
 */
@Injectable()
export class UploadSizeLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (req.method !== "POST") {
      next();
      return;
    }
    const rawLength = req.headers["content-length"];
    if (!rawLength) {
      next(); // chunked / tanpa Content-Length → multer yang menegakkan
      return;
    }
    const contentLength = Number(rawLength);
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      next();
      return;
    }

    const path = (req.originalUrl ?? req.url ?? "").split("?")[0] ?? "";
    const match = path.match(/\/storage\/files\/(?:public\/)?([^/]+)\/?$/);
    if (!match || !match[1]) {
      next();
      return;
    }

    let bucket: string;
    try {
      bucket = decodeURIComponent(match[1]);
    } catch {
      next(); // bucket malformed — ditolak handler upload nanti
      return;
    }

    const limit = Math.min(bucketMaxSize(bucket), globalMaxFileSize());
    if (contentLength > limit) {
      const mb = limit / (1024 * 1024);
      next(new PayloadTooLargeException(`Ukuran upload melebihi batas ${mb}MB.`));
      return;
    }
    next();
  }
}
