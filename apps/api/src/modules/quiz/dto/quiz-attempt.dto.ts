import { IsNotEmpty, IsOptional, IsString } from "class-validator";

/** Start attempt kuis. student_id client diabaikan untuk SISWA (dipakai actor.userId);
 *  wajib diisi hanya untuk staf (quiz:attempt:school / quiz:write:class). */
export class StartQuizAttemptDto {
  @IsOptional()
  @IsString()
  student_id?: string;
}

/** Jawaban satu soal kuis; answer = JSON string untuk MENJODOHKAN. */
export class SaveQuizAnswerDto {
  @IsString()
  @IsNotEmpty()
  question_id!: string;

  @IsOptional()
  @IsString()
  answer?: string;
}

/** Submit attempt kuis (opsional: info tambahan). */
export class SubmitQuizAttemptDto {
  @IsOptional()
  @IsString()
  note?: string;
}
