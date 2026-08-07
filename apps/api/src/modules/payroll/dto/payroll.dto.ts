import {
  IsArray,
  IsBoolean,
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO Payroll — validasi input endpoint (class-validator, prd04 §5.E).
 * Nominal uang dikirim sebagai STRING desimal (backend memakai Decimal).
 */

export class CreateJobPositionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  defaultJabatanAllowance?: string;
}

export class UpdateJobPositionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  defaultJabatanAllowance?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpsertComponentDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  kind!: string;

  @IsBoolean()
  isTaxable!: boolean;

  @IsBoolean()
  isBpjsApplicable!: boolean;

  @IsOptional()
  @IsString()
  unit?: string | null;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateSalaryStructureDto {
  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: "effectiveFrom harus format YYYY-MM" })
  effectiveFrom!: string;

  /** kode komponen -> nominal string (mis. { GAJI_POKOK: "3000000" }) */
  @IsObject()
  components!: Record<string, string>;

  @IsOptional()
  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  attendanceAllowancePerDay?: string;
}

export class VariableHoursDto {
  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @IsInt()
  @Min(0)
  @Max(500)
  jtmHours!: number;

  @IsInt()
  @Min(0)
  @Max(500)
  lemburHours!: number;
}

export class CreateRunDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: "period harus format YYYY-MM" })
  period?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableHoursDto)
  variableHours?: VariableHoursDto[];
}

export class CalculateRunDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariableHoursDto)
  variableHours?: VariableHoursDto[];
}

export class ApproveRunDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class PayrollQueryDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  staffId?: string;
}
