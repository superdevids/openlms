import { Injectable } from "@nestjs/common";
import { PermissionEffect, PermissionScope, Role } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import { TtlCache } from "../../common/cache/ttl-cache";

export interface PermissionGrant {
  code: string;
  scope: PermissionScope;
  deny: boolean;
}

export interface PermissionOverrideGrant {
  code: string;
  effect: PermissionEffect;
}

const SCOPE_RANK: Record<PermissionScope, number> = {
  SENDIRI: 1,
  KELAS: 2,
  SEKOLAH: 3
};

/** Scope yang tertulis di akhir kode permission ("resource:action[:scope]"). */
export function parseScopeFromCode(code: string): PermissionScope | null {
  const last = code.split(":").pop();
  if (last === "SENDIRI" || last === "KELAS" || last === "SEKOLAH") {
    return last;
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
 * Cache in-memory TTL 60 detik untuk menghindari 2 query DB per request
 * (security hardening). Di-invalidate otomatis via TTL; panggil `invalidate()`
 * saat role/permission berubah (mis. dari service yang mengubah RolePermission).
 */
@Injectable()
export class PermissionsResolver {
  private static readonly TTL_MS = 60_000;

  /** Cache permission per kombinasi role + override per user (TTL 60s). */
  private readonly permissionsCache = new TtlCache<PermissionGrant[]>(PermissionsResolver.TTL_MS);
  private readonly overridesCache = new TtlCache<PermissionOverrideGrant[]>(
    PermissionsResolver.TTL_MS
  );

  constructor(private readonly prisma: PrismaClient) {}

  /** Hapus seluruh cache (dipanggil saat role/permission/override berubah). */
  invalidate(): void {
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
