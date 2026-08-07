import { IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";
import { PermissionEffect } from "@prisma/client";

/** Upsert UserPermissionOverride (PUT /rbac/users/:id/overrides). */
export class UpsertUserOverrideDto {
  @IsString()
  permissionId!: string;

  @IsEnum(PermissionEffect, { message: "effect harus ALLOW atau DENY" })
  effect!: PermissionEffect;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsISO8601({}, { message: "expiresAt harus ISO 8601" })
  expiresAt?: string;
}
