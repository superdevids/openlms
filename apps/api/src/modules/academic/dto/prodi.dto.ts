import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

/** Buat jurusan/kompetensi keahlian (Prodi). */
export class CreateProdiDto {
  @IsString()
  @Matches(/^[A-Z0-9_-]{2,10}$/, { message: "Kode prodi 2-10 karakter alfanumerik (huruf besar)" })
  code!: string;

  @IsString()
  @Length(3, 100)
  name!: string;

  @IsString()
  @Length(2, 20)
  short_name!: string;
}

/** Update Prodi — semua field opsional. */
export class UpdateProdiDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  short_name?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/** Filter daftar prodi. */
export class ListProdiQuery {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  q?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
