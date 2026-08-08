/**
 * Unit test — RbacAdminService: permission catalog, role-permission upsert,
 * user override, validasi role, AuditLog + invalidasi cache resolver.
 */
import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { AuditAction, PermissionEffect, PermissionScope } from "@prisma/client";
import { RbacAdminService } from "../../src/modules/rbac-admin/rbac-admin.service";
import { PermissionsResolver } from "../../src/modules/auth/permissions-resolver";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

function makePermissionsResolver() {
  return { invalidate: jest.fn() } as unknown as PermissionsResolver;
}

const permissionRow = (overrides: Record<string, unknown> = {}) => ({
  id: "perm_1",
  code: "user:read:school",
  category: "User",
  description: "Baca data user",
  is_system: false,
  ...overrides
});

describe("RbacAdminService", () => {
  let db: MockDb;
  let resolver: PermissionsResolver;
  let service: RbacAdminService;

  beforeEach(() => {
    db = createMockDb();
    resolver = makePermissionsResolver();
    service = new RbacAdminService(db, resolver);
  });

  describe("listPermissions", () => {
    it("mengelompokkan permission per kategori (urutan kategori asc)", async () => {
      mockFn(db, "permission", "findMany").mockResolvedValue([
        permissionRow({ id: "p1", code: "a", category: "Zeta" }),
        permissionRow({ id: "p2", code: "b", category: "Alpha" }),
        permissionRow({ id: "p3", code: "c", category: "Alpha" })
      ]);

      const groups = await service.listPermissions();
      expect(groups).toHaveLength(2);
      const alpha = groups.find((g) => g.category === "Alpha");
      expect(alpha?.permissions).toHaveLength(2);
      expect(mockFn(db, "permission", "findMany")).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ category: "asc" }, { code: "asc" }] })
      );
    });

    it("mengembalikan array kosong bila tidak ada permission", async () => {
      mockFn(db, "permission", "findMany").mockResolvedValue([]);
      await expect(service.listPermissions()).resolves.toEqual([]);
    });
  });

  describe("getRolePermissions", () => {
    it("melempar NotFoundException untuk role tidak dikenal", async () => {
      await expect(service.getRolePermissions("HACKER" as never)).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(mockFn(db, "rolePermission", "findMany")).not.toHaveBeenCalled();
    });

    it("memetakan RolePermission + detail permission", async () => {
      mockFn(db, "rolePermission", "findMany").mockResolvedValue([
        {
          id: "rp_1",
          role: "GURU",
          permission_id: "perm_1",
          effect: PermissionEffect.ALLOW,
          scope_default: PermissionScope.KELAS,
          permission: permissionRow({ code: "lms:read:class", category: "LMS" })
        }
      ]);

      const rows = await service.getRolePermissions("GURU");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        code: "lms:read:class",
        category: "LMS",
        effect: PermissionEffect.ALLOW,
        scopeDefault: PermissionScope.KELAS
      });
    });
  });

  describe("setRolePermission", () => {
    it("upsert baru (create) + audit CREATE + invalidasi resolver", async () => {
      mockFn(db, "permission", "findUnique").mockResolvedValue(permissionRow());
      mockFn(db, "rolePermission", "findUnique").mockResolvedValue(null);
      mockFn(db, "rolePermission", "upsert").mockResolvedValue({
        id: "rp_new",
        role: "GURU",
        permission_id: "perm_1",
        effect: PermissionEffect.DENY,
        scope_default: PermissionScope.SEKOLAH,
        permission: permissionRow()
      });
      const auditCreate = mockFn(db, "auditLog", "create");

      const view = await service.setRolePermission(
        "GURU",
        "perm_1",
        { effect: PermissionEffect.DENY, scope_default: PermissionScope.SEKOLAH },
        "sa_1",
        "10.0.0.1"
      );

      expect(view.effect).toBe(PermissionEffect.DENY);
      expect(view.scopeDefault).toBe(PermissionScope.SEKOLAH);
      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: AuditAction.CREATE,
            entity_id: "rp_new",
            ip_address: "10.0.0.1"
          })
        })
      );
      expect(resolver.invalidate).toHaveBeenCalledTimes(1);
    });

    it("update yang sudah ada → audit UPDATE (bukan CREATE)", async () => {
      mockFn(db, "permission", "findUnique").mockResolvedValue(permissionRow());
      mockFn(db, "rolePermission", "findUnique").mockResolvedValue({
        id: "rp_1",
        role: "GURU",
        permission_id: "perm_1",
        effect: PermissionEffect.ALLOW,
        scope_default: PermissionScope.KELAS
      });
      mockFn(db, "rolePermission", "upsert").mockResolvedValue({
        id: "rp_1",
        role: "GURU",
        permission_id: "perm_1",
        effect: PermissionEffect.DENY,
        scope_default: PermissionScope.KELAS,
        permission: permissionRow()
      });

      await service.setRolePermission(
        "GURU",
        "perm_1",
        { effect: PermissionEffect.DENY, scope_default: PermissionScope.KELAS },
        "sa_1"
      );

      expect(mockFn(db, "auditLog", "create")).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuditAction.UPDATE })
        })
      );
    });

    it("permission tidak ditemukan → NotFoundException tanpa upsert", async () => {
      mockFn(db, "permission", "findUnique").mockResolvedValue(null);
      await expect(
        service.setRolePermission(
          "GURU",
          "missing",
          { effect: PermissionEffect.ALLOW, scope_default: PermissionScope.SENDIRI },
          "sa_1"
        )
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockFn(db, "rolePermission", "upsert")).not.toHaveBeenCalled();
    });
  });

  describe("getUserOverrides / setUserOverride", () => {
    it("getUserOverrides memetakan override + detail permission", async () => {
      mockFn(db, "userPermissionOverride", "findMany").mockResolvedValue([
        {
          id: "uo_1",
          user_id: "u1",
          permission_id: "perm_1",
          effect: PermissionEffect.DENY,
          reason: "hackathon",
          expires_at: new Date("2026-12-31"),
          permission: permissionRow()
        }
      ]);

      const rows = await service.getUserOverrides("u1");
      expect(rows).toHaveLength(1);
      expect(rows[0]?.reason).toBe("hackathon");
      expect(rows[0]?.expiresAt).toBeInstanceOf(Date);
    });

    it("setUserOverride menolak user tidak ditemukan", async () => {
      mockFn(db, "user", "findUnique").mockResolvedValue(null);
      await expect(
        service.setUserOverride(
          "nobody",
          { permissionId: "perm_1", effect: "ALLOW" as never },
          "sa_1"
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("setUserOverride menolak permission tidak ditemukan", async () => {
      mockFn(db, "user", "findUnique").mockResolvedValue({ id: "u1" });
      mockFn(db, "permission", "findUnique").mockResolvedValue(null);
      await expect(
        service.setUserOverride("u1", { permissionId: "perm_x", effect: "ALLOW" as never }, "sa_1")
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("setUserOverride membuat override baru + audit + invalidasi", async () => {
      mockFn(db, "user", "findUnique").mockResolvedValue({ id: "u1" });
      mockFn(db, "permission", "findUnique").mockResolvedValue(permissionRow());
      mockFn(db, "userPermissionOverride", "findUnique").mockResolvedValue(null);
      mockFn(db, "userPermissionOverride", "upsert").mockResolvedValue({
        id: "uo_new",
        user_id: "u1",
        permission_id: "perm_1",
        effect: PermissionEffect.ALLOW,
        reason: null,
        expires_at: null,
        permission: permissionRow()
      });

      const view = await service.setUserOverride(
        "u1",
        { permissionId: "perm_1", effect: PermissionEffect.ALLOW },
        "sa_1"
      );

      expect(view.permissionId).toBe("perm_1");
      expect(mockFn(db, "auditLog", "create")).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: AuditAction.CREATE })
        })
      );
      expect(resolver.invalidate).toHaveBeenCalled();
    });
  });

  describe("validasi role", () => {
    it("setRolePermission menolak role tidak dikenal sebelum query permission", async () => {
      await expect(
        service.setRolePermission(
          "ROLE_FAKE" as never,
          "perm_1",
          { effect: PermissionEffect.ALLOW, scope_default: PermissionScope.SENDIRI },
          "sa_1"
        )
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockFn(db, "permission", "findUnique")).not.toHaveBeenCalled();
    });
  });
});
