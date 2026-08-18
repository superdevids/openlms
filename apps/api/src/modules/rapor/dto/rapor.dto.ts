import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min
} from "class-validator";

/** Rekam/ubah proyek P5 manual (G-49 e-Rapor v1). */
export class RecordRaporP5Dto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(GANJIL|GENAP)$/, { message: "semester harus GANJIL atau GENAP" })
  semester!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}\/\d{4}$/, { message: "academicYear harus format 2026/2027" })
  academicYear!: string;

  @IsString()
  @IsNotEmpty()
  projectName!: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsString()
  @IsNotEmpty()
  deskripsi!: string;
}

/** Pengaturan bobot tipe nilai rapor (disimpan di SchoolProfile.settings.raporWeights). */
export class UpdateRaporSettingsDto {
  @IsObject()
  raporWeights!: Record<string, number>;
}

/** Query rapor siswa — semester wajib, academicYear opsional (fallback tahun aktif). */
export class RaporStudentQueryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(GANJIL|GENAP)$/, { message: "semester harus GANJIL atau GENAP" })
  semester!: string;

  @IsOptional()
  @IsString()
  academicYear?: string;
}

/** Query rapor per kelas / daftar siswa. */
export class RaporClassQueryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(GANJIL|GENAP)$/, { message: "semester harus GANJIL atau GENAP" })
  semester!: string;

  @IsOptional()
  @IsString()
  academicYear?: string;
}

/** Query daftar siswa per kelas (opsional). */
export class RaporStudentsQueryDto {
  @IsOptional()
  @IsString()
  classId?: string;
}
