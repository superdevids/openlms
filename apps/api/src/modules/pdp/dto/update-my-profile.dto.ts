import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

/**
 * Update profil sendiri (UU PDP) — allowlist ketat.
 * email/username TIDAK pernah ada di DTO (tidak dapat diubah lewat PDP);
 * service menolak 400 bila field di luar allowlist dikirim langsung.
 */
export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[0-9+\-\s()]*$/, { message: "phone hanya boleh berisi angka, +, -, spasi, dan ()" })
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}(-[A-Za-z]{2})?$/, { message: "preferredLanguage harus format id / en-US" })
  preferredLanguage?: string;
}
