import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { MaterialType } from "@prisma/client";

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MaterialType)
  type!: MaterialType;

  /** Path objek di bucket `materials` — dari alur signed URL (POST /materials/signed-url). */
  @IsString()
  @IsNotEmpty()
  contentUrl!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSize?: number;
}

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MaterialType)
  type?: MaterialType;

  @IsOptional()
  @IsString()
  contentUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSize?: number;
}

export class FindMaterialsQueryDto {
  @IsOptional()
  @IsString()
  classSubjectId?: string;

  @IsOptional()
  @Type(() => Boolean)
  isPublished?: boolean;
}

export class RequestSignedUploadDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  classSubjectId!: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  size?: number;
}
