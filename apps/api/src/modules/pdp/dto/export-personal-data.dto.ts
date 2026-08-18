import { IsIn, IsOptional } from "class-validator";

/** Format ekspor data pribadi (UU PDP). */
export class ExportPersonalDataDto {
  @IsOptional()
  @IsIn(["json", "csv"], { message: "format harus json atau csv" })
  format?: "json" | "csv";
}
