import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

/** Satu kartu dashboard (bagian dari PUT /admin/dashboard-config/:role). */
export class DashboardCardDto {
  @IsString()
  @Length(1, 80)
  featureKey!: string;

  @IsString()
  @Length(1, 120)
  label!: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  icon?: string;

  @IsString()
  @Length(1, 200)
  href!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  sectionOrder!: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  requiredPermission?: string;
}

/** PUT /admin/dashboard-config/:role — daftar kartu lengkap (full replace). */
export class UpdateDashboardConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardCardDto)
  cards!: DashboardCardDto[];
}
