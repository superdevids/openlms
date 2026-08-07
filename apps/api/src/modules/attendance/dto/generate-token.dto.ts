import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { QR_TOKEN_TTL_MIN_MAX, QR_TOKEN_TTL_MIN_MIN } from "../attendance.constants";

/** Generate token QR sekali pakai untuk sebuah sesi (M-ABSQR-T1). */
export class GenerateTokenDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(QR_TOKEN_TTL_MIN_MIN)
  @Max(QR_TOKEN_TTL_MIN_MAX)
  ttl_minutes?: number;
}
