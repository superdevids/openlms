import { Injectable } from "@nestjs/common";
import { AuditAction, Role } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { readCacheTtlMs } from "../../common/cache.util";
import { TtlCache } from "../../common/cache/ttl-cache";
import { canAccess, PermissionsResolver } from "../auth/permissions-resolver";
import { ROLE_PRIORITY, writeAudit, type AuditActorContext } from "../lms/lms-audit";
import { UpdateDashboardConfigDto } from "./dto/update-dashboard-config.dto";

export interface DashboardCardView {
  featureKey: string;
  label: string;
  description: string | null;
  icon: string | null;
  href: string;
  sectionOrder: number;
  isEnabled: boolean;
  requiredPermission: string | null;
  updatedAt: Date | null;
}

export interface DashboardConfigView extends DashboardCardView {
  id: string;
  role: Role;
  updatedBy: string | null;
}

interface RoleDashboardConfigRow {
  id: string;
  role: Role;
  feature_key: string;
  label: string;
  description: string | null;
  icon: string | null;
  href: string;
  section_order: number;
  is_enabled: boolean;
  required_permission: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * DashboardConfigService — konfigurasi kartu dashboard per role (R-05/R-10).
 * - GET /admin/dashboard-config: seluruh kartu (SUPERADMIN, dashboard:read:school).
 * - PUT /admin/dashboard-config/:role: full-replace transaksional upsert-by
 *   (role, feature_key) + delete-missing + AuditLog + invalidate cache.
 * - GET /dashboard/me: kartu aktif untuk role pemanggil, difilter
 *   required_permission (canAccess), diurutkan section_order; cache TTL 30s.
 */
@Injectable()
export class DashboardConfigService {
  /**
   * Cache GET /dashboard/me (ms) — di-key per role utama pemanggil agar user
   * dengan role berbeda TIDAK saling menimpa kartu (bug fix: cache lama
   * berbagi satu entri untuk semua role dalam TTL 30s).
   */
  private readonly cardsCache = new TtlCache<DashboardCardView[]>(readCacheTtlMs(30_000));

  constructor(
    private readonly prisma: PrismaClient,
    private readonly permissionsResolver: PermissionsResolver
  ) {}

  // ============================================================
  // Admin (SUPERADMIN)
  // ============================================================

  async getAdminConfigs(): Promise<DashboardConfigView[]> {
    const rows = await this.prisma.roleDashboardConfig.findMany({
      orderBy: [{ role: "asc" }, { section_order: "asc" }, { feature_key: "asc" }]
    });
    return rows.map((r) => this.toView(r));
  }

  /**
   * Full-replace kartu untuk satu role — transaksional:
   * upsert tiap kartu (role, feature_key) + hapus kartu yang tidak dikirim.
   */
  async updateRoleConfig(
    role: Role,
    dto: UpdateDashboardConfigDto,
    actor: AuditActorContext,
    ip?: string
  ): Promise<DashboardConfigView[]> {
    const actorId = actor.userId;
    const existing = await this.prisma.roleDashboardConfig.findMany({
      where: { role },
      select: { feature_key: true }
    });
    const existingKeys = new Set(existing.map((r) => r.feature_key));
    const incomingKeys = new Set(dto.cards.map((c) => c.featureKey));
    const removedKeys = [...existingKeys].filter((k) => !incomingKeys.has(k));

    await this.prisma.$transaction(async (tx) => {
      for (const card of dto.cards) {
        const data = {
          label: card.label,
          description: card.description ?? null,
          icon: card.icon ?? null,
          href: card.href,
          section_order: card.sectionOrder,
          is_enabled: card.isEnabled ?? true,
          required_permission: card.requiredPermission ?? null,
          updated_by: actorId
        };
        await tx.roleDashboardConfig.upsert({
          where: { role_feature_key: { role, feature_key: card.featureKey } },
          create: { role, feature_key: card.featureKey, ...data },
          update: data
        });
      }
      if (removedKeys.length > 0) {
        await tx.roleDashboardConfig.deleteMany({
          where: { role, feature_key: { in: removedKeys } }
        });
      }
    });

    await writeAudit({
      ctx: actor,
      action: AuditAction.UPDATE,
      entity: "role_dashboard_config",
      entityId: role,
      after: { role, cards: dto.cards.length, removed: removedKeys.length },
      ipAddress: ip
    });

    this.invalidateCardsCache();

    const rows = await this.prisma.roleDashboardConfig.findMany({
      where: { role },
      orderBy: [{ section_order: "asc" }, { feature_key: "asc" }]
    });
    return rows.map((r) => this.toView(r));
  }

  // ============================================================
  // Me — kartu dashboard role pemanggil (semua role aktif)
  // ============================================================

  async getMyCards(userId: string, roles: Role[]): Promise<DashboardCardView[]> {
    if (roles.length === 0) {
      return [];
    }
    const primaryRole = this.pickPrimaryRole(roles);
    return this.cardsCache.wrap(primaryRole, async () => {
      const [rows, grants, overrides] = await Promise.all([
        this.prisma.roleDashboardConfig.findMany({
          where: { role: primaryRole, is_enabled: true },
          orderBy: [{ section_order: "asc" }, { feature_key: "asc" }]
        }),
        this.permissionsResolver.resolvePermissions(roles),
        this.permissionsResolver.resolveOverrides(userId)
      ]);

      return rows
        .filter((r) => {
          if (!r.required_permission) return true;
          return canAccess(r.required_permission, grants, overrides);
        })
        .map((r) => this.toCard(r));
    });
  }

  /** Role "tertinggi" dari daftar role aktif — konsisten dengan resolveActorRole. */
  private pickPrimaryRole(roles: Role[]): Role {
    for (const role of ROLE_PRIORITY) {
      if (roles.includes(role)) return role;
    }
    return roles[0] ?? "SISWA";
  }

  private invalidateCardsCache(): void {
    this.cardsCache.invalidateAll();
  }

  // ============================================================
  // Mappers
  // ============================================================

  private toCard(row: RoleDashboardConfigRow): DashboardCardView {
    return {
      featureKey: row.feature_key,
      label: row.label,
      description: row.description,
      icon: row.icon,
      href: row.href,
      sectionOrder: row.section_order,
      isEnabled: row.is_enabled,
      requiredPermission: row.required_permission,
      updatedAt: row.updated_at
    };
  }

  private toView(row: RoleDashboardConfigRow): DashboardConfigView {
    return {
      id: row.id,
      role: row.role,
      updatedBy: row.updated_by,
      ...this.toCard(row)
    };
  }
}
