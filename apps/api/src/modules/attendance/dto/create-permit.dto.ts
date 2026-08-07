import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PERMIT_TYPES } from "../attendance.constants";

/**
 * Pengajuan izin/sakit online + upload surat (path) (M-ABSQR-T7).
 * Schema tidak memiliki entitas Permit — record disimpan di tabel `attendance`
 * dengan status IZIN/SAKIT, method MANUAL, dan note JSON (lihat README.registration.md).
 */
export class CreatePermitDto {
  @IsString()
  @IsNotEmpty()
  student_id!: string;

  @IsOptional()
  @IsString()
  class_subject_id?: string;

  @IsDateString()
  date!: string;

  @IsIn(PERMIT_TYPES)
  type!: "IZIN" | "SAKIT";

  @IsString()
  @IsNotEmpty()
  reason!: string;

  /** Path file surat (bucket `permits`) — upload endpoint terpisah. */
  @IsOptional()
  @IsString()
  attachment_path?: string;
}
