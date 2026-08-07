import { IsString, IsNotEmpty } from "class-validator";

export class LoginDto {
  /** "Email atau Username" — prd04 §5.P */
  @IsString()
  @IsNotEmpty()
  emailOrUsername!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
