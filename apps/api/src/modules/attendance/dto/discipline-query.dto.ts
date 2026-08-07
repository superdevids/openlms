import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { DISCIPLINE_ALPA_THRESHOLD_DEFAULT } from "../attendance.constants";

/** Dashboard kedisiplinan: hitung ALPA per siswa per bulan (M-ABSQR-T6). */
export class DisciplineQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  /** Ambang alpa (default 3/bulan — konfigurabel per sekolah). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  threshold?: number;

  get resolvedThreshold(): number {
    return this.threshold ?? DISCIPLINE_ALPA_THRESHOLD_DEFAULT;
  }
}
