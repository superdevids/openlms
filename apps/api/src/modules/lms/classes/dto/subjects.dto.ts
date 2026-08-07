import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { SubjectCategory } from "@prisma/client";

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(SubjectCategory)
  category!: SubjectCategory;

  @IsOptional()
  isCompetencyBased?: boolean;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(SubjectCategory)
  category?: SubjectCategory;

  @IsOptional()
  isCompetencyBased?: boolean;
}

export class FindSubjectsQueryDto {
  @IsOptional()
  @IsEnum(SubjectCategory)
  category?: SubjectCategory;
}
