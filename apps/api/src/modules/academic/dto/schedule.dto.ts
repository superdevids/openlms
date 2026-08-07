import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateScheduleDto {
  @IsString()
  class_id!: string;

  @IsString()
  subject_id!: string;

  @IsString()
  teacher_id!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week!: number;

  @IsInt()
  @Min(1)
  start_period!: number;

  @IsInt()
  @Min(1)
  end_period!: number;

  @IsOptional()
  @IsString()
  room?: string | null;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  subject_id?: string;

  @IsOptional()
  @IsString()
  teacher_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  start_period?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  end_period?: number;

  @IsOptional()
  @IsString()
  room?: string | null;
}
