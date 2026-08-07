import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EnrollmentStatus } from "@prisma/client";

export class BulkEnrollDto {
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  studentIds!: string[];

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}

export class BulkUnenrollDto {
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  studentIds!: string[];
}

export class UpdateEnrollmentStatusDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsEnum(EnrollmentStatus)
  status!: EnrollmentStatus;
}
