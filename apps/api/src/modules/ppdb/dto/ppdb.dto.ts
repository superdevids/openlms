import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

/** Type lokal — @opensis/types belum mengekspor Gender (ISSUES). */
export type Gender = "L" | "P";

/** Nomor telepon: digit/spasi/tanda baca pemisah, maksimal 20 karakter. */
const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]{8,18}$/;

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
  @MaxLength(20)
  @Matches(PHONE_PATTERN, { message: "phone berisi karakter tidak valid" })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  parentName!: string;

  @IsString()
  @MaxLength(20)
  @Matches(PHONE_PATTERN, { message: "parentPhone berisi karakter tidak valid" })
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
