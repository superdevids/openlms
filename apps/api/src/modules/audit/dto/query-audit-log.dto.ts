import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AuditAction } from "@prisma/client";

/**
 * Filter daftar AuditLog (GET /admin/change-logs).
 * - entity/actorId/action/from/to = filter opsional
 * - page ≥ 1; pageSize 1..100 (default 20)
 * Waktu from/to memakai ISO-8601 (waktu server, created_at UTC).
 */
export class QueryAuditLogDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsEnum(AuditAction, { message: "action tidak dikenal" })
  action?: AuditAction;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
