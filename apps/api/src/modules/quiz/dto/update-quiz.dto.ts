import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min
} from "class-validator";

/** DTO update kuis — semua field opsional. */
export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_min?: number;

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
