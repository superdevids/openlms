import { IsOptional, IsString } from "class-validator";

/** Body POST /dapodik/export — tahun ajaran opsional (fallback tahun aktif). */
export class ExportDapodikDto {
  @IsOptional()
  @IsString()
  academicYear?: string;
}
