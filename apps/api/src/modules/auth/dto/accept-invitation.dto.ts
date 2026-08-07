import { IsNotEmpty, IsString } from "class-validator";

/** Accept undangan lewat token yang dikirim via link (F1-T6). */
export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty({ message: "Token undangan wajib diisi" })
  token!: string;
}
