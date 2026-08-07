import { IsBoolean, IsNotEmpty, IsString, MaxLength } from "class-validator";

/** PUT /onboarding/me/progress — tandai satu langkah tour selesai/dibatalkan. */
export class UpdateOnboardingProgressDto {
  @IsString()
  @IsNotEmpty({ message: "stepKey wajib diisi" })
  @MaxLength(80, { message: "stepKey maksimal 80 karakter" })
  stepKey!: string;

  @IsBoolean({ message: "done harus boolean" })
  done!: boolean;
}
