import { Injectable, Logger } from "@nestjs/common";
import { PermissionEffect, PermissionScope, Role } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { Redis } from "ioredis";
import { TtlCache } from "../../common/cache/ttl-cache";
import { RedisTtlCache } from "../../common/cache/redis-ttl-cache";
import { createRedisClient, redisUrl } from "../../common/redis/redis.client";

export interface PermissionGrant {
  code: string;
  scope: PermissionScope;
  deny: boolean;
}

export interface PermissionOverrideGrant {
  code: string;
  effect: PermissionEffect;
}

/** Kontrak cache yang dipakai resolver — TtlCache (in-memory) atau RedisTtlCache. */
interface PermissionsCacheLike<V> {
  wrap(key: string, loader: () => Promise<V>): Promise<V>;
  invalidateAll(): void | Promise<void>;
}

const SCOPE_RANK: Record<PermissionScope, number> = {
  SENDIRI: 1,
  KELAS: 2,
  SEKOLAH: 3
};

/** Scope yang tertulis di akhir kode permission ("resource:action[:scope]").
 *  Case-insensitive; menerima suffix lowercase ("self"/"class"/"school") yang
 *  dipakai di seed maupun uppercase ("SENDIRI"/"KELAS"/"SEKOLAH") untuk
 *  kompatibilitas mundur. Kode tanpa suffix scope → null (cukup punya grant). */
export function parseScopeFromCode(code: string): PermissionScope | null {
  const last = code.split(":").pop();
  if (!last) return null;
  const scope = last.toUpperCase();
  if (scope === "SELF" || scope === "SENDIRI") {
    return PermissionScope.SENDIRI;
  }
  if (scope === "CLASS" || scope === "KELAS") {
    return PermissionScope.KELAS;
  }
  if (scope === "SCHOOL" || scope === "SEKOLAH") {
    return PermissionScope.SEKOLAH;
  }
  return null;
}

/**
 * Evaluasi akses murni (tanpa DB) — prd04 §4.
 * - UserPermissionOverride DENY menang; ALLOW menang atas role.
 * - Grant tanpa scope di kode → cukup memiliki permission.
 * - Grant dengan scope → scope role harus ≥ scope yang diminta
 *   (SEKOLAH memenuhi SENDIRI/KELAS; KELAS tidak memenuhi SEKOLAH).
 */
export function canAccess(
  requiredCode: string,
  grants: PermissionGrant[],
  overrides: PermissionOverrideGrant[]
): boolean {
  const override = overrides.find((o) => o.code === requiredCode);
  if (override) {
    return override.effect === PermissionEffect.ALLOW;
  }

  const grant = grants.find((g) => g.code === requiredCode);
  if (!grant || grant.deny) {
    return false;
  }

  const requestedScope = parseScopeFromCode(requiredCode);
  if (!requestedScope) {
    return true;
  }
  return SCOPE_RANK[grant.scope] >= SCOPE_RANK[requestedScope];
}

/**
 * PermissionsResolver — memuat permission set role (RolePermission + Permission)
 * dan UserPermissionOverride dari database (F1-T4, prd04 §4.3).
 * Cache TTL 60 detik untuk menghindari 2 query DB per request (security
 * hardening). Multi-instance: cache disimpan di Redis (`perm:*` / `override:*`)
 * bila REDIS_URL tersedia, fallback in-memory (TtlCache) bila tidak / Redis
 * gagal — kontrak pemakai tidak berubah (wrap + invalidate).
 */
@Injectable()
export class PermissionsResolver {
  private static readonly TTL_MS = 60_000;
  private static readonly PERM_PREFIX = "perm:";
  private static readonly OVERRIDE_PREFIX = "override:";

  private readonly logger = new Logger(PermissionsResolver.name);
  private readonly permissionsCache: PermissionsCacheLike<PermissionGrant[]>;
  private readonly overridesCache: PermissionsCacheLike<PermissionOverrideGrant[]>;

  constructor(private readonly prisma: PrismaClient) {
    const url = redisUrl();
    let redis: Redis | null = null;
    if (url) {
      try {
        redis = createRedisClient(url);
        redis.on("error", (err) =>
          this.logger.warn(
            `Redis permission-cache error: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      } catch (err) {
        redis = null;
        this.logger.warn(
          `Redis permission-cache gagal init, fallback in-memory: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    this.permissionsCache = redis
      ? new RedisTtlCache<PermissionGrant[]>(
          PermissionsResolver.TTL_MS,
          PermissionsResolver.PERM_PREFIX,
          redis
        )
      : new TtlCache<PermissionGrant[]>(PermissionsResolver.TTL_MS);
    this.overridesCache = redis
      ? new RedisTtlCache<PermissionOverrideGrant[]>(
          PermissionsResolver.TTL_MS,
          PermissionsResolver.OVERRIDE_PREFIX,
          redis
        )
      : new TtlCache<PermissionOverrideGrant[]>(PermissionsResolver.TTL_MS);
  }

  /** Hapus seluruh cache (dipanggil saat role/permission/override berubah). */
  invalidate(): void {
    // Memori dibersihkan sinkron di dalam implementasi; Redis SCAN+DEL async.
    this.permissionsCache.invalidateAll();
    this.overridesCache.invalidateAll();
  }

  async resolvePermissions(roles: Role[]): Promise<PermissionGrant[]> {
    if (roles.length === 0) {
      return [];
    }
    const key = [...roles].sort().join(",");
    return this.permissionsCache.wrap(key, async () => {
      const rows = await this.prisma.rolePermission.findMany({
        where: { role: { in: roles } },
        select: {
          effect: true,
          scope_default: true,
          permission: { select: { code: true } }
        }
      });

      // Union antar role: scope terluas menang; DENY pada salah satu role → deny.
      const best = new Map<string, PermissionGrant>();
      for (const row of rows) {
        const code = row.permission.code;
        const current = best.get(code);
        if (row.effect === PermissionEffect.DENY) {
          best.set(code, { code, scope: current?.scope ?? row.scope_default, deny: true });
          continue;
        }
        if (!current || current.deny || SCOPE_RANK[row.scope_default] > SCOPE_RANK[current.scope]) {
          best.set(code, { code, scope: row.scope_default, deny: false });
        }
      }
      return [...best.values()];
    });
  }

  async resolveOverrides(userId: string): Promise<PermissionOverrideGrant[]> {
    return this.overridesCache.wrap(userId, async () => {
      const rows = await this.prisma.userPermissionOverride.findMany({
        where: {
          user_id: userId,
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }]
        },
        select: {
          effect: true,
          permission: { select: { code: true } }
        }
      });
      return rows.map((r) => ({ code: r.permission.code, effect: r.effect }));
    });
  }
}
