import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches
} from "class-validator";
import { SCHOOL_TYPE_VALUES, ROLE_VALUES } from "@openlms/types";

/** Langkah 1 — profil sekolah (prd04 §9.1). */
export class OnboardingStep1Dto {
  @IsString()
  @IsNotEmpty({ message: "Nama sekolah wajib diisi" })
  name!: string;

  @Matches(/^\d{8}$/, { message: "NPSN harus 8 digit angka" })
  npsn!: string;

  @IsIn(SCHOOL_TYPE_VALUES, { message: "Jenjang harus SMA atau SMK" })
  school_type!: (typeof SCHOOL_TYPE_VALUES)[number];

  @IsString()
  @IsNotEmpty({ message: "Alamat wajib diisi" })
  address!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email tidak valid" })
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  academicYearCode?: string;

  @IsOptional()
  @IsString()
  academicYearName?: string;
}

/** Langkah 2 — data dasar (semester, ambang alpa, toggle fitur, template tagihan). */
export class OnboardingStep2Dto {
  @IsOptional()
  @IsString()
  semester?: string;

  @IsOptional()
  @IsInt()
  absenceThresholdPerMonth?: number;

  @IsOptional()
  @IsBoolean()
  dataSaver?: boolean;

  @IsOptional()
  @IsObject()
  featureToggles?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  invoiceTemplate?: Record<string, unknown>;
}

/** Langkah 4 — undang (menggunakan InvitationsService; role tetap dari pengirim). */
export class OnboardingStep4Dto {
  @IsOptional()
  @IsEmail({}, { message: "Email tidak valid" })
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @IsNotEmpty({ message: "Nama lengkap wajib diisi" })
  fullName!: string;

  @IsIn(ROLE_VALUES, { message: "Role tidak dikenal" })
  role!: (typeof ROLE_VALUES)[number];
}
