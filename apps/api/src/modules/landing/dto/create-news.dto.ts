import { IsBoolean, IsDateString, IsOptional, IsString, Length } from "class-validator";

/** Buat berita (POST /admin/landing/berita). slug opsional — dibuat dari title. */
export class CreateNewsDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  slug?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  excerpt?: string;

  @IsString()
  @Length(1, 20000)
  body!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  coverImagePath?: string;

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
