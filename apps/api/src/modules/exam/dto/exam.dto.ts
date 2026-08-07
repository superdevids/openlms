import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";
import { ExamType } from "@prisma/client";

/** DTO buat ujian resmi (prd04 §5.A.6). created_by di-bind controller dari @CurrentUser. */
export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ExamType)
  type!: ExamType;

  @IsString()
  @IsNotEmpty()
  subject_id!: string;

  @IsInt()
  @Min(1)
  duration_min!: number;
}

/** DTO update ujian — semua field opsional. */
export class UpdateExamDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ExamType)
  type?: ExamType;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_min?: number;
}

/** DTO buat paket soal A/B/C. */
export class CreateExamPackageDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  total_score?: number;

  @IsOptional()
  @IsBoolean()
  shuffle_options?: boolean;
}

/** DTO update paket soal. */
export class UpdateExamPackageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  total_score?: number;

  @IsOptional()
  @IsBoolean()
  shuffle_options?: boolean;
}

/** DTO buat sesi ujian (jadwal buka/tutup otomatis, sesi ganda/shift). */
export class CreateExamSessionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  starts_at!: string;

  @IsDateString()
  ends_at!: string;

  @IsOptional()
  @IsString()
  target_class_id?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsBoolean()
  is_serentak?: boolean;
}

/** DTO generate token sesi (proctor/guru). */
export class GenerateSessionTokenDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  ttl_minutes?: number;

  @IsString()
  @IsNotEmpty()
  generated_by!: string;
}
