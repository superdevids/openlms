import { IsEmail, IsIn, IsObject, IsOptional, IsString, Matches } from "class-validator";
import { SCHOOL_TYPE_VALUES } from "@opensis/types";

/** Pengaturan aplikasi (profil sekolah + ambang + settings Json) — endpoint /app/settings. */
export class UpdateAppSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Matches(/^\d{8}$/, { message: "NPSN harus 8 digit angka" })
  npsn?: string;

  @IsOptional()
  @IsIn(SCHOOL_TYPE_VALUES, { message: "Jenjang harus SMA atau SMK" })
  school_type?: (typeof SCHOOL_TYPE_VALUES)[number];

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email tidak valid" })
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  current_academic_year_id?: string;

  /** Ambang & nilai lain (attendance, qr, rollover, onboarding, font) — di-merge ke settings. */
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
