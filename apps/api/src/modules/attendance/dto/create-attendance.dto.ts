import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";
import { ATTENDANCE_STATUS_VALUES, type AttendanceStatus } from "@openlms/types";

/** Satu baris absensi siswa (absensi manual per kelas-pertemuan). */
export class RecordItemDto {
  @IsString()
  @IsNotEmpty()
  student_id!: string;

  @IsEnum(ATTENDANCE_STATUS_VALUES)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

/** Absensi manual bulk oleh guru (MVP; prd04 §5.A.7). */
export class CreateAttendanceDto {
  @IsOptional()
  @IsString()
  class_subject_id?: string;

  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RecordItemDto)
  records!: RecordItemDto[];
}
