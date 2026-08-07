import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

/**
 * Query inbox (docs/04 §2.9). DTO untuk kontrak — tanpa global ValidationPipe di Fase 0,
 * controller tetap mem-parsing dengan fallback aman; decorator berlaku saat pipe dipasang (F1).
 */
export class InboxQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}
