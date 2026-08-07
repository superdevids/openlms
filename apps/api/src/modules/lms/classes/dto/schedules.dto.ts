import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @IsString()
  @IsNotEmpty()
  teacherId!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsInt()
  @Min(1)
  startPeriod!: number;

  @IsInt()
  @Min(1)
  endPeriod!: number;

  @IsOptional()
  @IsString()
  room?: string;

  /** Denormalisasi tahun ajaran; bila kosong diambil dari Class. */
  @IsOptional()
  @IsString()
  academicYear?: string;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  classId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subjectId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teacherId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  startPeriod?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  endPeriod?: number;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;
}

export class FindSchedulesQueryDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;
}
