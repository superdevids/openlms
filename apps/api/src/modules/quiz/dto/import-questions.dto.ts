import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Import massal soal (M-EXAM-T1) — CSV/Excel dasar tanpa vendor.
 * Kolom header: type,text,options,correct_answer,explanation,difficulty,tags,subject_id.
 * options diisi JSON string; tags dipisah koma.
 * TODO: library xlsx direkomendasikan bila file .xlsx biner benar-benar dibutuhkan
 * (lihat ISSUES modul quiz).
 */
export class ImportQuestionsDto {
  @IsString()
  @IsNotEmpty()
  csv!: string;

  @IsOptional()
  @IsString()
  subject_id?: string;

  @IsOptional()
  @IsString()
  quiz_id?: string;
}
