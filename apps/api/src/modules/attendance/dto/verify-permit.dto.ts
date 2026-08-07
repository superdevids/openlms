import { IsBoolean, IsOptional, IsString } from "class-validator";

/** Verifikasi pengajuan izin/sakit oleh homeroom/GURU_BK (M-ABSQR-T7). */
export class VerifyPermitDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
