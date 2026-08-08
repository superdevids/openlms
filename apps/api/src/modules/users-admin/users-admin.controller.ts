import { Controller, Get, Query } from "@nestjs/common";
import { UsersAdminService, AdminUserPage } from "./users-admin.service";
import { RequirePermission } from "../../common/require-permission.decorator";

/**
 * UsersAdminController — GET /admin/users (R-38).
 * Daftar user untuk tab Manajemen User di Admin Sistem.
 * RBAC: user:read:school (SUPERADMIN + OPERATOR).
 */
@Controller("admin/users")
export class UsersAdminController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Get()
  @RequirePermission("user:read:school")
  list(
    @Query("search") search?: string,
    @Query("pageSize") pageSize?: string
  ): Promise<AdminUserPage> {
    const size = pageSize ? Number.parseInt(pageSize, 10) : 100;
    return this.usersAdminService.list(search, Number.isNaN(size) ? 100 : size);
  }
}
