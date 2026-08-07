import {
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";

/**
 * DTO Aset — validasi input endpoint (class-validator, prd04 §5.G).
 * Nominal uang dikirim sebagai STRING desimal (backend memakai Decimal).
 */

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(["RUANG", "LAB", "ALAT", "KENDARAAN", "PERALATAN_IT", "LAINNYA"])
  category!: string;

  @IsOptional()
  @IsEnum(["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT", "MAINTENANCE"])
  condition?: string;

  @IsOptional()
  @IsEnum(["AVAILABLE", "BOOKED", "MAINTENANCE", "RETIRED"])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  location?: string;

  // ---- field perpanjangan (belum ada kolom di schema; AssetStore) ----
  @IsOptional()
  @IsString()
  merk?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  tahunPerolehan?: number;

  @IsOptional()
  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  hargaPerolehan?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  masaManfaatBulan?: number;

  @IsOptional()
  @IsString()
  penanggungJawab?: string;

  @IsOptional()
  @IsEnum(["BOS", "APBD", "SWADANA"])
  sumberDana?: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(["RUANG", "LAB", "ALAT", "KENDARAAN", "PERALATAN_IT", "LAINNYA"])
  category?: string;

  @IsOptional()
  @IsEnum(["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT", "MAINTENANCE"])
  condition?: string;

  @IsOptional()
  @IsEnum(["AVAILABLE", "BOOKED", "MAINTENANCE", "RETIRED"])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  merk?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  tahunPerolehan?: number;

  @IsOptional()
  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  hargaPerolehan?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  masaManfaatBulan?: number;

  @IsOptional()
  @IsString()
  penanggungJawab?: string;

  @IsOptional()
  @IsEnum(["BOS", "APBD", "SWADANA"])
  sumberDana?: string;
}

export class BookAssetDto {
  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsString()
  @IsNotEmpty()
  purpose!: string;
}

export class ApproveBookingDto {
  @IsBoolean()
  approved!: boolean;
}

export class CreateMaintenanceDto {
  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  cost!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class UpdateMaintenanceDto {
  @IsEnum(["SCHEDULED", "IN_PROGRESS", "DONE", "CANCELLED"])
  status!: string;
}

export class CreateAuditDto {
  @IsString()
  @IsNotEmpty()
  assetId!: string;

  @IsDateString()
  auditDate!: string;

  @IsEnum(["FISIK", "BOOK"])
  auditType!: string;

  @IsOptional()
  @IsInt()
  physicalQty?: number | null;

  @IsOptional()
  @IsInt()
  bookQty?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  proposeRetired?: boolean;
}

export class ApproveAuditDto {
  @IsBoolean()
  approved!: boolean;
}

export class AssetQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
