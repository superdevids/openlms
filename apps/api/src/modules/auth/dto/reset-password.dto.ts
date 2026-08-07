import { IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

/** Reset password oleh OPERATOR/SUPERADMIN (F1-T8) — password sementara sekali pakai. */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: "userId wajib diisi" })
  userId!: string;

  /** Opsional: operator bisa menentukan password sementara; default di-generate. */
  @IsOptional()
  @IsString()
  @Length(8, 128, { message: "Password sementara minimal 8 karakter" })
  newPassword?: string;
}
