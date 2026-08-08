import { Transform, TransformFnParams } from "class-transformer";

/**
 * Transform boolean KETAT untuk query/body: hanya menerima boolean asli atau
 * string "true"/"false". Nilai lain (mis. "ya", "nope", "1") dibiarkan apa
 * adanya sehingga validator @IsBoolean() menolaknya.
 *
 * Alasan: @Type(() => Boolean) memakai coercion JS Boolean(), yang mengubah
 * SEMUA string non-empty (termasuk "false"!) menjadi true — bug nyata untuk
 * query filter `?isActive=false`. StrictBoolean memperbaiki ini tanpa
 * mengubah kontrak DTO.
 */
export const StrictBoolean = (): PropertyDecorator =>
  Transform(({ value }: TransformFnParams) => {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  });
