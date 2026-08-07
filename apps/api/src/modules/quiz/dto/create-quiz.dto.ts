import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min
} from "class-validator";

/**
 * DTO buat kuis (prd04 §5.A.5): durasi, jadwal buka/tutup, shuffle_questions.
 * created_by TIDAK diterima dari client — di-bind controller dari @CurrentUser
 * (AuthGuard) ke QuizService.create (anti spoofing atribusi audit).
 */
export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  class_subject_id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  duration_min!: number;

  @IsOptional()
  @IsDateString()
  open_at?: string;

  @IsOptional()
  @IsDateString()
  close_at?: string;

  @IsOptional()
  @IsBoolean()
  shuffle_questions?: boolean;
}
