import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Difficulty, QuestionType } from "@prisma/client";

/**
 * DTO buat soal bank (prd04 §5.A.5; M-EXAM-T1).
 * options: array string (PG) / array pasangan {left,right} (MENJODOHKAN);
 * correct_answer: string (PG/isian) atau JSON mapping (MENJODOHKAN).
 * Tidak ada created_by: atribusi audit tidak dipakai pada model Question.
 */
export class CreateQuestionDto {
  @IsOptional()
  @IsString()
  subject_id?: string;

  @IsOptional()
  @IsString()
  quiz_id?: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  options?: unknown;

  @IsOptional()
  @IsString()
  correct_answer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
