import { IsBoolean, IsISO8601, IsObject, IsOptional, IsString, MinLength } from "class-validator";
import type { RolloverAction } from "@opensis/types";

export class CreateRolloverDraftDto {
  @IsString()
  sourceYearId!: string;

  @IsString()
  @MinLength(7)
  newYearCode!: string;

  @IsString()
  @MinLength(3)
  newYearName!: string;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsBoolean()
  includeFinanceRollover?: boolean;

  @IsOptional()
  @IsBoolean()
  includePayrollRollover?: boolean;

  @IsOptional()
  @IsString()
  ppdbTargetClassId?: string;

  /** Override promosi per siswa: { [studentId]: PROMOTED|REPEATED|GRADUATED|TRANSFERRED|DROPPED }. */
  @IsOptional()
  @IsObject()
  overrides?: Record<string, RolloverAction>;

  @IsOptional()
  @IsObject()
  backup?: { confirmed: boolean; label?: string };
}

export class RollbackRolloverDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
