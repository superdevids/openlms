import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString
} from "class-validator";

/**
 * Scan absensi QR (M-ABSQR-T2). `scanned_at` dari client hanya sinyal — validasi
 * expiry selalu memakai waktu SERVER (prd04 §5.A.7; toleransi jam device aman).
 */
export class ScanRecordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  student_id!: string;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  /** Kunci idempotensi queue offline (IndexedDB, M-ABSQR-T8). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  idempotency_key?: string;

  /** Waktu scan di device (sinyal; bukan otoritas). */
  @IsOptional()
  @IsDateString()
  scanned_at?: string;
}
