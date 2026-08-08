import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min
} from "class-validator";
import { GradeType } from "@prisma/client";

export class RecordGradeDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @IsString()
  @IsNotEmpty()
  semester!: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsEnum(GradeType)
  type!: GradeType;

  /** Polymorphic string: assignment/quiz/exam attempt id (docs/03 §2.16). */
  @IsOptional()
  @IsString()
  sourceId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  score!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weight?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class FindGradesQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  classSubjectId?: string;

  @IsOptional()
  @IsString()
  semester?: string;

  @IsOptional()
  @IsEnum(GradeType)
  type?: GradeType;
}

export class RecapStudentQueryDto {
  @IsOptional()
  @IsString()
  classSubjectId?: string;

  @IsOptional()
  @IsString()
  semester?: string;
}

export class RecapClassQueryDto {
  @IsOptional()
  @IsString()
  semester?: string;
}

export class RecapClassSubjectQueryDto {
  @IsOptional()
  @IsString()
  semester?: string;
}

export class ExportGradesDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  classSubjectId?: string;

  @IsOptional()
  @IsString()
  // Keamanan: semester dipakai pada nama file ekspor (grade-export.service).
  // Batasi karakter + panjang agar tidak bisa jadi path traversal (`..`/`\` ditolak);
  // slash diperbolehkan untuk format "2025/2026" dan disanitasi di service.
  @Matches(/^[\w/-]{0,32}$/, { message: "semester mengandung karakter tidak aman" })
  semester?: string;
}
