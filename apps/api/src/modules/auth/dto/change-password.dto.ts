import { IsNotEmpty, IsString, Length } from "class-validator";

/** Ganti password sendiri (auth:password:change:self) — melengkapi flow must_change_password. */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: "Password saat ini wajib diisi" })
  currentPassword!: string;

  @IsString()
  @Length(8, 128, { message: "Password baru minimal 8 karakter" })
  newPassword!: string;
}
