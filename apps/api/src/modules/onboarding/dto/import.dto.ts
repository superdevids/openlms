import { IsArray, IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { ImportType } from "@prisma/client";

/** Preview/commit impor — prd04 §9.2, tek-05 F1-T5. */
export class ImportRowsDto {
  @IsEnum(ImportType, { message: "Tipe impor tidak dikenal" })
  importType!: ImportType;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsArray()
  @IsObject({ each: true })
  rows!: Record<string, unknown>[];
}
