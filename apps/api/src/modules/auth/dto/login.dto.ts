import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class LoginDto {
  /** "Email atau Username" — prd04 §5.P (menerima email, jadi tanpa pola username). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  emailOrUsername!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
