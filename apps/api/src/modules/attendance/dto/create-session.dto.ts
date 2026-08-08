import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import type { AttendanceMethod } from "@opensis/types";
import { ALLOWED_SESSION_METHODS } from "../attendance.constants";

/** Buat sesi absensi QR/geofencing/manual (M-ABSQR-T1). */
export class CreateSessionDto {
  @IsOptional()
  @IsString()
  class_subject_id?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(ALLOWED_SESSION_METHODS)
  method!: AttendanceMethod;

  @IsOptional()
  @IsDateString()
  starts_at?: string;

  @IsOptional()
  @IsDateString()
  ends_at?: string;
}
