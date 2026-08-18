import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class LoginDto {
  /**
   * Username — identifier login satu-satunya (bukan email).
   * Username = NIS (siswa) / NIP (guru): string unik per individu, format
   * bebas (bisa angka atau teks) agar seed admin/siswa1 tetap valid.
   * Email opsional, hanya untuk notifikasi — tidak dipakai untuk login.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
