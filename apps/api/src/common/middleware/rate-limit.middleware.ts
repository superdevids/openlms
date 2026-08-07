import { HttpException, HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

/**
 * Rate limit per-IP (sliding window) — in-memory Map dengan TTL cleanup.
 * - General routes: RATE_LIMIT_MAX request per RATE_LIMIT_WINDOW_MS (default 100/menit)
 * - POST /auth/login  : LOGIN_RATE_LIMIT_MAX (default 10/menit)  — brute-force layer di atas locked_until
 * - POST /auth/refresh: REFRESH_RATE_LIMIT_MAX (default 30/menit)
 * - Socket.IO (/socket.io, /ws) dikecualikan — di-throttle di Nginx (long-poll/websocket).
 * Respon 429 + header Retry-After (format error standar lewat AllExceptionsFilter).
 *
 * Catatan: memori per-instance (bukan distributed). Untuk multi-instance gunakan
 * store eksternal (Redis) — lihat docs/03 scalability.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const LOGIN_MARKER = "/auth/login";
const REFRESH_MARKER = "/auth/refresh";

/** Path realtime dikecualikan dari rate limit app (di-throttle di Nginx). */
const SKIPPED_PREFIXES = ["/socket.io", "/ws"];

function envNumber(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs = envNumber("RATE_LIMIT_WINDOW_MS", 60_000);
  private readonly generalMax = envNumber("RATE_LIMIT_MAX", 100);
  private readonly loginMax = envNumber("LOGIN_RATE_LIMIT_MAX", 10);
  private readonly refreshMax = envNumber("REFRESH_RATE_LIMIT_MAX", 30);
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    // Cleanup berkala agar Map tidak membengkak (interval 2x window, timer tidak menahan proses).
    this.cleanupTimer = setInterval(() => this.cleanup(), Math.max(this.windowMs, 1000) * 2);
    this.cleanupTimer.unref();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const path = (req.originalUrl ?? req.url ?? "") as string;

    if (SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      next();
      return;
    }

    const ip = (req.ip as string | undefined) ?? "unknown";
    const max = this.limitFor(path);
    const key = `${ip}:${max}`;
    const now = Date.now();

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      next(
        new HttpException(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Terlalu banyak permintaan, coba lagi nanti",
              details: { retryAfterSec }
            }
          },
          HttpStatus.TOO_MANY_REQUESTS
        )
      );
      return;
    }

    bucket.count += 1;
    next();
  }

  /** Limit per-route: login/refresh lebih ketat, sisanya general. */
  private limitFor(path: string): number {
    if (path.includes(LOGIN_MARKER)) {
      return this.loginMax;
    }
    if (path.includes(REFRESH_MARKER)) {
      return this.refreshMax;
    }
    return this.generalMax;
  }

  /** Hapus bucket yang sudah lewat window — mencegah kebocoran memori. */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
