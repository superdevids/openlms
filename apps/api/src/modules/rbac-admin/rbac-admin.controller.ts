import { Body, Controller, Get, Param, Put, Req } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@prisma/client";
import {
  RbacAdminService,
  PermissionGroup,
  RolePermissionView,
  UserOverrideView
} from "./rbac-admin.service";
import { UpdateRolePermissionDto } from "./dto/update-role-permission.dto";
import { UpsertUserOverrideDto } from "./dto/upsert-user-override.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * RbacAdminController — konsol RBAC (prd04 §4.3).
 * GET /rbac/* → rbac:read:school; PUT → rbac:write:school (AuditLog + invalidasi cache).
 */
@Controller("rbac")
export class RbacAdminController {
  constructor(private readonly rbacAdminService: RbacAdminService) {}

  @Get("permissions")
  @RequirePermission("rbac:read:school")
  listPermissions(): Promise<PermissionGroup[]> {
    return this.rbacAdminService.listPermissions();
  }

  @Get("roles/:role/permissions")
  @RequirePermission("rbac:read:school")
  getRolePermissions(@Param("role") role: Role): Promise<RolePermissionView[]> {
    return this.rbacAdminService.getRolePermissions(role);
  }

  @Put("roles/:role/permissions/:id")
  @RequirePermission("rbac:write:school")
  setRolePermission(
    @Param("role") role: Role,
    @Param("id") permissionId: string,
    @Body() dto: UpdateRolePermissionDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<RolePermissionView> {
    return this.rbacAdminService.setRolePermission(
      role,
      permissionId,
      dto,
      user.id,
      req.ip,
      user.roles
    );
  }

  @Get("users/:id/overrides")
  @RequirePermission("rbac:read:school")
  getUserOverrides(@Param("id") userId: string): Promise<UserOverrideView[]> {
    return this.rbacAdminService.getUserOverrides(userId);
  }

  @Put("users/:id/overrides")
  @RequirePermission("rbac:write:school")
  setUserOverride(
    @Param("id") userId: string,
    @Body() dto: UpsertUserOverrideDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<UserOverrideView> {
    return this.rbacAdminService.setUserOverride(userId, dto, user.id, req.ip, user.roles);
  }
}
