import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/** Approve/reject permintaan PDP oleh admin (pdp:review:school). */
export class ReviewRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note?: string;
}
