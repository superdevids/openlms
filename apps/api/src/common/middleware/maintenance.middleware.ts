import { HttpStatus, Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { MaintenanceService } from "../../modules/maintenance/maintenance.service";
import { GLOBAL_PREFIX } from "../constants";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  MAINTENANCE_RETRY_AFTER_DEFAULT_SEC
} from "../../modules/maintenance/maintenance.constants";

/**
 * MaintenanceMiddleware — gerbang global mode maintenance (dev mode).
 * Urutan di app.module.ts: RequestId → Maintenance → RateLimit.
 *
 * - Status dibaca dari cache MaintenanceService (TTL 5 dtk) — TIDAK hit DB per request.
 * - maintenance_enabled → 503 JSON format standar { error: { code: "MAINTENANCE", ... } }
 *   + header Retry-After (dari ETA bila parseable, else 300 dtk).
 * - Allowlist (harus SELALU bekerja): /api/v1/health, /api/v1/public/*
 *   (semua endpoint publik per-halaman landing + system-status — web mengecualikan
 *   10 rute landing saat maintenance ON, data fallback tidak boleh 503), dan
 *   /api/v1/admin/system/maintenance (agar SUPERADMIN tetap bisa mematikan mode
 *   lewat UI; otorisasi tetap di guard).
 * - DB/status error → fail-open (next) supaya outage DB tidak memblokir seluruh API.
 */

const ALLOWLIST_PREFIXES = [
  `/${GLOBAL_PREFIX}/health`,
  `/${GLOBAL_PREFIX}/public/`,
  `/${GLOBAL_PREFIX}/public/system-status`,
  `/${GLOBAL_PREFIX}/public/landing`,
  `/${GLOBAL_PREFIX}/admin/system/maintenance`
];

function isAllowedPath(path: string): boolean {
  return ALLOWLIST_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** Retry-After (dtk): ETA ISO parseable → detik hingga ETA; else default 300. */
function retryAfterSeconds(eta: string | null | undefined): number {
  if (eta) {
    const parsed = Date.parse(eta);
    if (Number.isFinite(parsed)) {
      const sec = Math.ceil((parsed - Date.now()) / 1000);
      if (sec > 0) {
        return sec;
      }
    }
  }
  return MAINTENANCE_RETRY_AFTER_DEFAULT_SEC;
}

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MaintenanceMiddleware.name);

  constructor(private readonly maintenanceService: MaintenanceService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const path = (req.originalUrl ?? req.url ?? "") as string;
    if (isAllowedPath(path)) {
      next();
      return;
    }

    try {
      const status = await this.maintenanceService.getStatus();
      if (!status.maintenanceEnabled) {
        next();
        return;
      }

      const message =
        status.message && status.message.trim().length > 0
          ? status.message.trim()
          : DEFAULT_MAINTENANCE_MESSAGE;

      res.setHeader("Retry-After", String(retryAfterSeconds(status.eta)));
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        error: {
          code: "MAINTENANCE",
          message,
          ...(status.eta ? { eta: status.eta } : {})
        }
      });
    } catch (err) {
      // Fail-open: jangan blokir request karena error status.
      this.logger.warn(`maintenance check gagal (fail-open): ${(err as Error).message}`);
      next();
    }
  }
}
