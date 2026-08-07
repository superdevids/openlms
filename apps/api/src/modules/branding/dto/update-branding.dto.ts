import { IsHexColor, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

/** Update branding (PATCH /app/branding) — semua field opsional. */
export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  appName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 160)
  tagline?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32)
  radius?: number;
}
