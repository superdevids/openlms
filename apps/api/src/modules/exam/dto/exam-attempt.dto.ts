import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";

/** Start attempt ujian (M-EXAM-T4): token sesi sekali pakai. */
export class StartExamAttemptDto {
  /** SISWA selalu diikat ke actor.userId (nilai ini diabaikan); wajib untuk staf. */
  @IsOptional()
  @IsString()
  student_id?: string;

  @IsString()
  @IsNotEmpty()
  access_token!: string;

  @IsOptional()
  device_info?: Record<string, unknown>;
}

/** Satu item jawaban dalam batch autosave (M-EXAM-T5). */
export class SaveExamAnswersItemDto {
  @IsString()
  @IsNotEmpty()
  question_id!: string;

  @IsOptional()
  @IsString()
  answer?: string;

  /** Waktu jawaban dicatat di client (informasional; server memakai saved_at). */
  @IsOptional()
  @IsString()
  saved_at_client?: string;
}

/** Autosave batch (G-01): banyak soal dalam satu request; wajib header Idempotency-Key. */
export class SaveExamAnswersDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SaveExamAnswersItemDto)
  answers!: SaveExamAnswersItemDto[];
}

/** Submit attempt ujian. */
export class SubmitExamAttemptDto {
  @IsOptional()
  @IsString()
  note?: string;
}

/** Manual grade esai (M-EXAM-T7): skor 0–100. */
export class GradeExamAttemptDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score_manual!: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  @IsNotEmpty()
  graded_by!: string;
}

/** Log aktivitas (M-EXAM-T9): visibilitychange/TAB_SWITCH dll. */
export class LogExamActivityDto {
  @IsString()
  @IsNotEmpty()
  event!: string;

  @IsOptional()
  payload?: Record<string, unknown>;

  @IsOptional()
  device_info?: Record<string, unknown>;
}
