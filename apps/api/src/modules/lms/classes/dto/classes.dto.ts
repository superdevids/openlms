import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { StrictBoolean } from "../../dto/transform";

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(10)
  @Max(12)
  gradeLevel!: number;

  @IsString()
  @IsNotEmpty()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  homeroomTeacherId?: string;

  /** Prodi (jurusan/kompetensi keahlian SMK); null = SMA tanpa jurusan. */
  @IsOptional()
  @IsString()
  prodiId?: string;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(12)
  gradeLevel?: number;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  /** Kosongkan string "" berarti menghapus wali kelas. */
  @IsOptional()
  @IsString()
  homeroomTeacherId?: string;

  /** Prodi (jurusan/kompetensi keahlian SMK); null = SMA tanpa jurusan. */
  @IsOptional()
  @IsString()
  prodiId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FindClassesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(12)
  gradeLevel?: number;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @StrictBoolean()
  @IsBoolean()
  isActive?: boolean;
}
