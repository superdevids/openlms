import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaClient } from "@opensis/database";
import { readCacheTtlMs } from "./cache.util";
import { FEATURE_KEY } from "./feature-flag.decorator";

interface FlagCacheEntry {
  enabled: boolean;
  expiresAt: number;
}

/**
 * Cache module-level (static) agar semua instance guard berbagi data.
 * TTL dari env CACHE_TTL_MS (default 30s). Panggil `FeatureFlagGuard.invalidate(key)`
 * dari service yang mengubah flag agar perubahan langsung berlaku.
 */
const flagCache = new Map<string, FlagCacheEntry>();

/**
 * FeatureFlagGuard — global (APP_GUARD, F1-T13, prd04 §5.N).
 * Endpoint ber-@Feature('KEY') ditolak dengan 403 FEATURE_DISABLED saat flag OFF.
 * - Flag sistem (is_system) tidak pernah bisa dimatikan.
 * - Flag tak dikenal → ditolak (fail-closed).
 * - Nilai efektif: AppFeatureSetting.enabled, fallback FeatureFlag.default_enabled.
 * Catatan: AllExceptionsFilter memetakan 403 → code FORBIDDEN; kode
 * FEATURE_DISABLED dibawa di body exception (lihat ISSUES lintas-tim).
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  private readonly ttlMs = readCacheTtlMs(30_000);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaClient
  ) {}

  /** Hapus entri cache sebuah flag (dipanggil saat FeatureFlagsService.update). */
  static invalidate(key: string): void {
    flagCache.delete(key);
  }

  /** Hapus seluruh cache flag. */
  static invalidateAll(): void {
    flagCache.clear();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!key) {
      return true;
    }

    const now = Date.now();
    const cached = flagCache.get(key);
    if (cached && cached.expiresAt > now) {
      if (!cached.enabled) {
        throw featureDisabled(key);
      }
      return true;
    }

    const enabled = await this.loadEnabled(key);
    flagCache.set(key, { enabled, expiresAt: now + this.ttlMs });
    if (!enabled) {
      throw featureDisabled(key);
    }
    return true;
  }

  private async loadEnabled(key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      return false;
    }
    if (flag.is_system) {
      return true;
    }
    const setting = await this.prisma.appFeatureSetting.findUnique({
      where: { feature_key: key }
    });
    return setting ? setting.enabled : flag.default_enabled;
  }
}

function featureDisabled(key: string): HttpException {
  return new HttpException(
    { code: "FEATURE_DISABLED", message: `Fitur dinonaktifkan: ${key}` },
    HttpStatus.FORBIDDEN
  );
}
