import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { ROLE_VALUES } from "@opensis/types";
import type { LetterType } from "../official-letter.service";

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(3)
  body!: string;

  @IsArray()
  @IsEnum(ROLE_VALUES, { each: true })
  targetRoles!: string[];

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ROLE_VALUES, { each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

export class CreateOfficialLetterDto {
  @IsEnum(["KETERANGAN", "IZIN", "UNDANGAN", "LAINNYA"])
  type!: LetterType;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(3)
  body!: string;
}
