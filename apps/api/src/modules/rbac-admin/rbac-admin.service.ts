import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, PermissionEffect, PermissionScope, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { PermissionsResolver } from "../auth/permissions-resolver";
import { UpdateRolePermissionDto } from "./dto/update-role-permission.dto";
import { UpsertUserOverrideDto } from "./dto/upsert-user-override.dto";

/** Kategori dengan daftar permission (GET /rbac/permissions). */
export interface PermissionGroup {
  category: string;
  permissions: Array<{
    id: string;
    code: string;
    description: string;
    is_system: boolean;
  }>;
}

/** RolePermission + detail permission (GET /rbac/roles/:role/permissions). */
export interface RolePermissionView {
  id: string;
  permissionId: string;
  code: string;
  category: string;
  description: string;
  effect: PermissionEffect;
  scopeDefault: PermissionScope;
  isSystem: boolean;
}

/** UserPermissionOverride + detail permission (GET /rbac/users/:id/overrides). */
export interface UserOverrideView {
  id: string;
  permissionId: string;
  code: string;
  description: string;
  effect: PermissionEffect;
  reason: string | null;
  expiresAt: Date | null;
}

const VALID_ROLES = Object.values(Role);

/**
 * RbacAdminService — konsol RBAC (permission catalog, role-permission, user override).
 * - Baca: rbac:read:school; mutasi: rbac:write:school (guard di controller).
 * - Semua mutasi menulis AuditLog + invalidasi cache PermissionsResolver (60s).
 */
@Injectable()
export class RbacAdminService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly permissionsResolver: PermissionsResolver
  ) {}

  /** Daftar permission dikelompokkan per kategori. */
  async listPermissions(): Promise<PermissionGroup[]> {
    const rows = await this.prisma.permission.findMany({
      orderBy: [{ category: "asc" }, { code: "asc" }]
    });
    const groups = new Map<string, PermissionGroup>();
    for (const row of rows) {
      const group = groups.get(row.category) ?? { category: row.category, permissions: [] };
      group.permissions.push({
        id: row.id,
        code: row.code,
        description: row.description,
        is_system: row.is_system
      });
      groups.set(row.category, group);
    }
    return [...groups.values()];
  }

  /** Daftar RolePermission untuk satu role. */
  async getRolePermissions(role: Role): Promise<RolePermissionView[]> {
    this.assertRole(role);
    const rows = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
      orderBy: { permission: { category: "asc" } }
    });
    return rows.map((r) => ({
      id: r.id,
      permissionId: r.permission_id,
      code: r.permission.code,
      category: r.permission.category,
      description: r.permission.description,
      effect: r.effect,
      scopeDefault: r.scope_default,
      isSystem: r.permission.is_system
    }));
  }

  /** Set/ubah RolePermission untuk role+permission (upsert). */
  async setRolePermission(
    role: Role,
    permissionId: string,
    dto: UpdateRolePermissionDto,
    actorId: string,
    ip?: string
  ): Promise<RolePermissionView> {
    this.assertRole(role);
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) {
      throw new NotFoundException("Permission tidak ditemukan.");
    }

    const before = await this.prisma.rolePermission.findUnique({
      where: { role_permission_id: { role, permission_id: permissionId } }
    });
    const after = await this.prisma.rolePermission.upsert({
      where: { role_permission_id: { role, permission_id: permissionId } },
      create: {
        role,
        permission_id: permissionId,
        effect: dto.effect,
        scope_default: dto.scope_default
      },
      update: { effect: dto.effect, scope_default: dto.scope_default },
      include: { permission: true }
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: actorId,
        action: before ? AuditAction.UPDATE : AuditAction.CREATE,
        entity: "role_permission",
        entity_id: after.id,
        before: before
          ? ({
              role: before.role,
              effect: before.effect,
              scope_default: before.scope_default
            } as unknown as Prisma.InputJsonValue)
          : undefined,
        after: {
          role: after.role,
          effect: after.effect,
          scope_default: after.scope_default
        } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });

    this.permissionsResolver.invalidate();
    return {
      id: after.id,
      permissionId: after.permission_id,
      code: after.permission.code,
      category: after.permission.category,
      description: after.permission.description,
      effect: after.effect,
      scopeDefault: after.scope_default,
      isSystem: after.permission.is_system
    };
  }

  /** Daftar override user. */
  async getUserOverrides(userId: string): Promise<UserOverrideView[]> {
    const rows = await this.prisma.userPermissionOverride.findMany({
      where: { user_id: userId },
      include: { permission: true },
      orderBy: { permission: { category: "asc" } }
    });
    return rows.map((r) => ({
      id: r.id,
      permissionId: r.permission_id,
      code: r.permission.code,
      description: r.permission.description,
      effect: r.effect,
      reason: r.reason,
      expiresAt: r.expires_at
    }));
  }

  /** Upsert override user. */
  async setUserOverride(
    userId: string,
    dto: UpsertUserOverrideDto,
    actorId: string,
    ip?: string
  ): Promise<UserOverrideView> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User tidak ditemukan.");
    }
    const permission = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId }
    });
    if (!permission) {
      throw new NotFoundException("Permission tidak ditemukan.");
    }

    const before = await this.prisma.userPermissionOverride.findUnique({
      where: { user_id_permission_id: { user_id: userId, permission_id: dto.permissionId } }
    });
    const after = await this.prisma.userPermissionOverride.upsert({
      where: { user_id_permission_id: { user_id: userId, permission_id: dto.permissionId } },
      create: {
        user_id: userId,
        permission_id: dto.permissionId,
        effect: dto.effect,
        reason: dto.reason,
        expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null
      },
      update: {
        effect: dto.effect,
        reason: dto.reason,
        expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null
      },
      include: { permission: true }
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: actorId,
        action: before ? AuditAction.UPDATE : AuditAction.CREATE,
        entity: "user_permission_override",
        entity_id: after.id,
        before: before
          ? ({
              effect: before.effect,
              reason: before.reason,
              expires_at: before.expires_at
            } as unknown as Prisma.InputJsonValue)
          : undefined,
        after: {
          effect: after.effect,
          reason: after.reason,
          expires_at: after.expires_at
        } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });

    this.permissionsResolver.invalidate();
    return {
      id: after.id,
      permissionId: after.permission_id,
      code: after.permission.code,
      description: after.permission.description,
      effect: after.effect,
      reason: after.reason,
      expiresAt: after.expires_at
    };
  }

  private assertRole(role: Role): void {
    if (!VALID_ROLES.includes(role)) {
      throw new NotFoundException(`Role tidak dikenal: ${role}`);
    }
  }
}
