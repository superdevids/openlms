import {
  IsArray,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

export class CreateInternshipDto {
  @IsString()
  studentId!: string;

  @IsString()
  partnerId!: string;

  @IsString()
  academicYearId!: string;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsOptional()
  @IsString()
  schoolMentorId?: string;

  @IsOptional()
  @IsString()
  industryMentorId?: string;
}

export class AddJournalDto {
  @IsISO8601()
  entryDate!: string;

  @IsString()
  @MinLength(3)
  activity!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RubricItemDto {
  @IsString()
  criterion!: string;

  @IsInt()
  @Min(1)
  maxScore!: number;
}

export class CreateCompetencyTestDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(3)
  competencyStandard!: string;

  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  examinerId?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricItemDto)
  rubricItems?: RubricItemDto[];
}

export class GradeRubricItemDto {
  @IsString()
  rubricItemId!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;
}

export class GradeCompetencyTestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeRubricItemDto)
  items!: GradeRubricItemDto[];
}

export class CreatePartnerDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  industryType?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  agreementYear?: string;
}

export class AddMentorDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
