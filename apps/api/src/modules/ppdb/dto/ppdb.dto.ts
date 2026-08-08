import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

/** Type lokal — @opensis/types belum mengekspor Gender (ISSUES). */
export type Gender = "L" | "P";

export class ConsentProofDto {
  @IsString()
  @MinLength(3)
  parentName!: string;

  @IsString()
  @MinLength(3)
  documentUrl!: string;
}

export class DocumentDto {
  @IsString()
  type!: string;

  @IsString()
  url!: string;
}

export class RegisterPpdbDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsOptional()
  @IsString()
  nisn?: string;

  @IsISO8601()
  birthDate!: string;

  @IsString()
  birthPlace!: string;

  @IsEnum(["L", "P"])
  gender!: Gender;

  @IsOptional()
  @IsString()
  originSchool?: string;

  @IsString()
  @MinLength(9)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  parentName!: string;

  @IsString()
  parentPhone!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => ConsentProofDto)
  consent!: ConsentProofDto;
}

export class SelectionDto {
  @IsInt()
  @Min(0)
  @Max(100)
  selectionScore!: number;
}

export class VerifyDto {
  @IsEnum([true, false])
  approve!: boolean;
}
