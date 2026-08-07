import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Difficulty, QuestionType } from "@prisma/client";

/** DTO update soal — semua field opsional (partial update). */
export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  subject_id?: string;

  @IsOptional()
  @IsString()
  quiz_id?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  text?: string;

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
