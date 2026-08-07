import { IsEnum, IsIn } from "class-validator";
import { PermissionEffect, PermissionScope } from "@prisma/client";

/** Update RolePermission — effect + scope default (PUT /rbac/roles/:role/permissions/:id). */
export class UpdateRolePermissionDto {
  @IsEnum(PermissionEffect, { message: "effect harus ALLOW atau DENY" })
  effect!: PermissionEffect;

  @IsIn(Object.values(PermissionScope), { message: "scope_default harus SENDIRI/KELAS/SEKOLAH" })
  scope_default!: PermissionScope;
}
