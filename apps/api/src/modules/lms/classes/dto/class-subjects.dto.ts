import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

const SEMESTER_PATTERN = /^(GANJIL|GENAP)$|^\d{4}\/\d{4}-(GANJIL|GENAP)$/;

export class CreateClassSubjectDto {
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  teacherId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(SEMESTER_PATTERN, {
    message: "semester harus 'GANJIL'/'GENAP' atau '2026/2027-GANJIL'"
  })
  semester!: string;
}

export class UpdateClassSubjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  classId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subjectId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teacherId?: string;

  @IsOptional()
  @IsString()
  @Matches(SEMESTER_PATTERN, {
    message: "semester harus 'GANJIL'/'GENAP' atau '2026/2027-GANJIL'"
  })
  semester?: string;
}

export class FindClassSubjectsQueryDto {
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  semester?: string;
}
