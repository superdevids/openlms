import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * DTO update mode maintenance (PUT /admin/system/maintenance).
 * maintenanceEnabled wajib; message/eta opsional (kosong = hapus).
 */
export class UpdateMaintenanceDto {
  @IsBoolean({ message: "maintenanceEnabled harus boolean" })
  maintenanceEnabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Pesan maintenance maksimal 500 karakter" })
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: "ETA maksimal 120 karakter" })
  eta?: string;
}
