import { IsBoolean, IsObject, IsOptional } from "class-validator";

/** Update feature flag oleh SUPERADMIN (F1-T13). */
export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
