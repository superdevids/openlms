import { IsISO8601, IsOptional, IsString } from "class-validator";

export class CreateAlumniDto {
  @IsString()
  studentId!: string;

  @IsString()
  graduationYearId!: string;

  @IsOptional()
  @IsString()
  finalNisn?: string;

  @IsOptional()
  @IsISO8601()
  graduationDate?: string;
}
