import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EnrollmentStatus } from "@prisma/client";

export class BulkEnrollDto {
  @IsArray()
  // class-validator 0.14.4 isEmpty([]) = false -> @IsNotEmpty() TIDAK menangkap
  // array kosong; @ArrayNotEmpty() adalah dekorator yang tepat untuk ini.
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  studentIds!: string[];

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}

export class BulkUnenrollDto {
  @IsArray()
  @ArrayNotEmpty()
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
