import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ROLE_VALUES } from "@opensis/types";

/**
 * Undangan akun (F1-T6, prd04 §9.1 langkah 4).
 * Email ATAU username wajib minimal satu; role sudah ditentukan oleh pengirim.
 */
export class InvitationDto {
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
