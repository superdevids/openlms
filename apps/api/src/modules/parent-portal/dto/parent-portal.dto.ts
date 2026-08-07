import { IsEnum, IsString, MinLength } from "class-validator";

export class EnsureParentDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsString()
  @MinLength(9)
  phone!: string;
}

export class LinkChildDto {
  @IsString()
  studentId!: string;

  @IsEnum(["AYAH", "IBU", "WALI"])
  relationship!: "AYAH" | "IBU" | "WALI";
}
