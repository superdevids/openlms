import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from "class-validator";
import { ROLE_VALUES } from "@opensis/types";

/**
 * Undangan akun (F1-T6, prd04 §9.1 langkah 4).
 * Username WAJIB (NIS/NIP — identifier akun); email OPSIONAL, hanya untuk
 * notifikasi/pemberitahuan, bukan untuk login.
 */
export class InvitationDto {
  @IsOptional()
  @IsEmail({}, { message: "Email tidak valid" })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: "Username wajib diisi" })
  // Username dipakai sebagai identifier akun — batasi karakter aman.
  @MaxLength(50, { message: "Username maksimal 50 karakter" })
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: "Username hanya huruf/angka/._-" })
  username!: string;

  @IsString()
  @IsNotEmpty({ message: "Nama lengkap wajib diisi" })
  fullName!: string;

  @IsIn(ROLE_VALUES, { message: "Role tidak dikenal" })
  role!: (typeof ROLE_VALUES)[number];
}
