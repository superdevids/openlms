import { IsArray, IsOptional, IsString, MinLength } from "class-validator";

export class UpsertCurriculumDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(2)
  subjectCode!: string;

  @IsString()
  @MinLength(2)
  subjectName!: string;

  @IsString()
  phase!: string;

  @IsString()
  @MinLength(10)
  capaianPembelajaran!: string;

  @IsArray()
  @IsString({ each: true })
  alurTujuanPembelajaran!: string[];
}
