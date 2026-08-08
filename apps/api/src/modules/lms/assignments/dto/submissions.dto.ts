import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class SubmitSubmissionDto {
  @IsOptional()
  @IsString()
  content?: string;

  /** Path objek di bucket `submissions` — dari alur signed URL. */
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class GradeSubmissionDto {
  // Tanpa @Type(() => Number): score body harus number asli (bukan string
  // "90"), IsInt menolak string — mencegah coercion tak terduga.
  @IsInt()
  @Min(0)
  @Max(10000)
  score!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class RequestSubmissionUploadDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  assignmentId!: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}
