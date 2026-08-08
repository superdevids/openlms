import { HttpException, HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { parseCookies } from "../../modules/auth/cookie.util";
import { verifyAccessToken } from "../../modules/auth/jwt.util";
import { ACCESS_COOKIE_NAME, SESSION_COOKIE_NAME } from "../../modules/auth/auth.constants";

/**
 * Rate limit sliding window — in-memory Map dengan TTL cleanup.
 * Keying (G-06):
 * - Route terautentikasi (ada JWT access valid di cookie / requestContext):
 *   dikunci per-IDENTITAS USER (`user:<id>`) → 2000 siswa di belakang 1 NAT IP
 *   tidak saling potong; limit USER_RATE_LIMIT_MAX (default 120/menit/user).
 * - POST /auth/login & /auth/refresh: tetap per-IP (brute-force layer di atas
 *   locked_until); login LOGIN_RATE_LIMIT_MAX (default 10/menit), refresh
 *   REFRESH_RATE_LIMIT_MAX (default 30/menit).
 * - Endpoint publik tanpa identitas: per-IP RATE_LIMIT_MAX (default 100/menit).
 * - Socket.IO (/socket.io, /ws) dikecualikan — di-throttle di Nginx.
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

/** Request yang mungkin sudah diproses AuthGuard (bila middleware berjalan setelahnya). */
type RateLimitRequest = Request & { requestContext?: { userId?: string } };

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs = envNumber("RATE_LIMIT_WINDOW_MS", 60_000);
  private readonly generalMax = envNumber("RATE_LIMIT_MAX", 100);
  private readonly loginMax = envNumber("LOGIN_RATE_LIMIT_MAX", 10);
  private readonly refreshMax = envNumber("REFRESH_RATE_LIMIT_MAX", 30);
  private readonly authUserMax = envNumber("USER_RATE_LIMIT_MAX", 120);
  private readonly uploadMax = envNumber("UPLOAD_RATE_LIMIT_MAX", 30);
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

    const { key, max } = this.limitForKey(path, req);
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

  /**
   * Limit & key per route:
   * - login/refresh selalu per-IP (publik, anti-brute-force);
   * - upload (POST/PUT ke /storage/files* atau /files/upload) → per-user bila
   *   terautentikasi, else per-IP — limit lebih ketat (R-22, default 30/menit);
   * - identitas user valid → per-user USER_RATE_LIMIT_MAX;
   * - selain itu → per-IP RATE_LIMIT_MAX (endpoint publik).
   */
  private limitForKey(path: string, req: Request): { key: string; max: number } {
    const ip = (req.ip as string | undefined) ?? "unknown";
    if (path.includes(LOGIN_MARKER)) {
      return { key: `${ip}:login:${this.loginMax}`, max: this.loginMax };
    }
    if (path.includes(REFRESH_MARKER)) {
      return { key: `${ip}:refresh:${this.refreshMax}`, max: this.refreshMax };
    }
    const isUpload =
      (req.method === "POST" || req.method === "PUT") &&
      (path.includes("/storage/files") || path.includes("/files/upload"));
    if (isUpload) {
      const userId = this.userIdOf(req);
      if (userId) return { key: `upload:user:${userId}:${this.uploadMax}`, max: this.uploadMax };
      return { key: `${ip}:upload:${this.uploadMax}`, max: this.uploadMax };
    }
    const userId = this.userIdOf(req);
    if (userId) return { key: `user:${userId}:${this.authUserMax}`, max: this.authUserMax };
    return { key: `${ip}:general:${this.generalMax}`, max: this.generalMax };
  }

  /** Identitas user dari requestContext (jika sudah ada) atau verifikasi JWT access cookie. */
  private userIdOf(req: Request): string | null {
    const contextUser = (req as RateLimitRequest).requestContext?.userId;
    if (contextUser) return contextUser;
    const cookies = parseCookies(req.headers?.cookie);
    const token = cookies[SESSION_COOKIE_NAME] ?? cookies[ACCESS_COOKIE_NAME];
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload?.sub) return payload.sub;
    }
    return null;
  }

  /** Hapus bucket yang sudah lewat window — mencegah kebocoran memori. */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
