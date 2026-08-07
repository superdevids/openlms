import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

/** Start attempt ujian (M-EXAM-T4): token sesi sekali pakai. */
export class StartExamAttemptDto {
  @IsString()
  @IsNotEmpty()
  student_id!: string;

  @IsString()
  @IsNotEmpty()
  access_token!: string;

  @IsOptional()
  device_info?: Record<string, unknown>;
}

/** Autosave jawaban (M-EXAM-T5): wajib header Idempotency-Key dari client. */
export class SaveExamAnswerDto {
  @IsString()
  @IsNotEmpty()
  question_id!: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  device_info?: Record<string, unknown>;
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
