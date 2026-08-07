import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";

/**
 * DTO Keuangan — validasi input endpoint (class-validator, prd04 §5.F).
 * Konvensi: nominal uang dikirim sebagai STRING desimal agar tidak kehilangan
 * presisi (backend memakai Decimal).
 */

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsEnum(["SPP", "UANG_KEGIATAN", "UANG_DAFTAR", "UANG_SERAGAM", "UANG_OSIS", "DENDA", "LAINNYA"])
  type!:
    "SPP" | "UANG_KEGIATAN" | "UANG_DAFTAR" | "UANG_SERAGAM" | "UANG_OSIS" | "DENDA" | "LAINNYA";

  /** periode "YYYY-MM" untuk SPP bulanan; opsional untuk tipe lain */
  @IsOptional()
  @IsString()
  period?: string;

  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  amount!: string;

  @IsOptional()
  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  discount?: string;

  @IsDateString()
  dueDate!: string;

  @IsString()
  @IsNotEmpty()
  academicYear!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;
}

export class CreateBulkInvoiceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkInvoiceItemDto)
  students!: BulkInvoiceItemDto[];

  @IsEnum(["SPP", "UANG_KEGIATAN", "UANG_DAFTAR", "UANG_SERAGAM", "LAINNYA"])
  type!: "SPP" | "UANG_KEGIATAN" | "UANG_DAFTAR" | "UANG_SERAGAM" | "LAINNYA";

  @IsOptional()
  @IsString()
  period?: string;

  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  amount!: string;

  @IsDateString()
  dueDate!: string;

  @IsString()
  @IsNotEmpty()
  academicYear!: string;
}

export class RecordPaymentDto {
  @IsString()
  @IsNotEmpty()
  invoiceId!: string;

  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  amount!: string;

  @IsEnum(["TUNAI", "TRANSFER", "LAINNYA"])
  method!: "TUNAI" | "TRANSFER" | "LAINNYA";

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AllocatePaymentDto {
  /** daftar invoice tujuan (parsial/cicilan lintas tagihan) */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  invoiceIds!: string[];

  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  amount!: string;

  @IsEnum(["TUNAI", "TRANSFER", "LAINNYA"])
  method!: "TUNAI" | "TRANSFER" | "LAINNYA";

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class VerifyPaymentDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateLateFeeRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(["SPP", "UANG_KEGIATAN", "UANG_DAFTAR", "UANG_SERAGAM", "UANG_OSIS", "LAINNYA"])
  invoiceType!: string;

  @IsInt()
  @Min(0)
  @Max(365)
  graceDays!: number;

  @IsEnum(["NOMINAL", "PERSEN_PER_HARI"])
  feeType!: "NOMINAL" | "PERSEN_PER_HARI";

  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,6" })
  value!: string;

  @IsOptional()
  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  maxAmount?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateRefundDto {
  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  amount!: string;

  @IsEnum(["TRANSFER", "TUNAI"])
  method!: "TRANSFER" | "TUNAI";

  @IsOptional()
  @IsString()
  note?: string;
}

export class ApproveRefundDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ImportReconciliationDto {
  /** CSV mutasi bank: tanggal,keterangan,referensi,nominal,tipe */
  @IsString()
  @IsNotEmpty()
  csv!: string;

  @IsString()
  @IsNotEmpty()
  period!: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class ResolveReconciliationItemDto {
  @IsOptional()
  @IsString()
  matchedPaymentId?: string;

  @IsOptional()
  @IsString()
  resolutionNote?: string;
}

export class CashFlowRecordDto {
  @IsDateString()
  date!: string;

  @IsEnum(["IN", "OUT"])
  direction!: "IN" | "OUT";

  @IsNumberString()
  @IsDecimal({ decimal_digits: "0,2" })
  amount!: string;

  @IsEnum(["PAYMENT_VERIFIED", "REFUND", "EXPENSE", "OTHER"])
  category!: "PAYMENT_VERIFIED" | "REFUND" | "EXPENSE" | "OTHER";

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SppSchedulerDto {
  /** periode "YYYY-MM"; default bulan berjalan */
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class InvoiceQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsIn(["SPP", "UANG_KEGIATAN", "UANG_DAFTAR", "UANG_SERAGAM", "LAINNYA"])
  type?: string;

  @IsOptional()
  @IsIn(["PENDING", "PARTIAL", "PAID", "OVERDUE", "CARRIED_OVER", "CANCELLED", "REFUNDED"])
  status?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;
}

export class MonthPeriodQueryDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** Validasi string kosong helper (dipakai guard kecil di service). */
export function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}
