import { IsDateString, IsOptional, IsString } from "class-validator";

/** Filter rekap kehadiran per siswa/mapel/periode (M-ABSQR-T5). */
export class RekapQueryDto {
  @IsOptional()
  @IsString()
  student_id?: string;

  @IsOptional()
  @IsString()
  class_subject_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
