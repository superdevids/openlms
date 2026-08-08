import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min
} from "class-validator";

/** Upsert konten landing (PUT /admin/landing/:slug) — title/body wajib. */
export class UpsertLandingContentDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 400)
  subtitle?: string;

  @IsString()
  @Length(0, 20000)
  body!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  imagePath?: string;

  /** URL CTA section (mis. "/ppdb" pada hero/kontak). */
  @IsOptional()
  @IsString()
  @Length(0, 500)
  linkUrl?: string;

  /** Label tombol CTA (mis. "Daftar PPDB"). */
  @IsOptional()
  @IsString()
  @Length(0, 120)
  linkLabel?: string;

  /** Data terstruktur per slug (programs/items/faq/images[]). */
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sectionOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
