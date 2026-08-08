import { IsBoolean, IsDateString, IsOptional, IsString, Length } from "class-validator";

/** Perbarui berita (PATCH /admin/landing/berita/:id) — semua field opsional. */
export class UpdateNewsDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  slug?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20000)
  body?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  coverImagePath?: string;

  @IsOptional()
  @IsString()
  @Length(0, 60)
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  author?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
