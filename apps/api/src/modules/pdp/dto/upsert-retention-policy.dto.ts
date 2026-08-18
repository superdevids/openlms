import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * Upsert kebijakan retensi data (retention:configure:school).
 * Entity TIDAK ada di body — diambil dari path param `:entity` dan
 * divalidasi di controller (RETENTION_ENTITIES → 400 bila invalid).
 */
export class UpsertRetentionPolicyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  retentionMonths!: number;

  @IsIn(["DELETE", "ANONYMIZE", "ARCHIVE"], { message: "action harus DELETE/ANONYMIZE/ARCHIVE" })
  action!: "DELETE" | "ANONYMIZE" | "ARCHIVE";

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
