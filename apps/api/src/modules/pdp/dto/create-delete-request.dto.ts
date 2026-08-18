import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/** Ajukan permintaan penghapusan data pribadi (UU PDP). */
export class CreateDeleteRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason?: string;
}
