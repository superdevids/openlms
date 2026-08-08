import {
  FONT_FAMILY_VALUES,
  FONT_SCALE_VALUES,
  type FontFamily,
  type FontScale
} from "@opensis/types";

/**
 * Tipografi global (audit R-…, prd04 §6 UI aksesibilitas).
 * - FontScale: skala ukuran teks per user (normal/large/big) — class di <html>
 *   mengubah root font-size sehingga seluruh UI (token rem shadcn) ikut membesar.
 * - FontFamily: daftar font Google Fonts yang boleh dipilih SUPERADMIN
 *   (SchoolProfile.settings.font.font_family) — nilai tunggal dengan @opensis/types.
 */

export type { FontFamily, FontScale };

export interface FontScaleMeta {
  label: string;
  htmlClass: string;
  scale: number;
}

export const FONT_SCALES: Record<FontScale, FontScaleMeta> = {
  normal: { label: "Normal", htmlClass: "font-scale-normal", scale: 1 },
  large: { label: "Besar", htmlClass: "font-scale-large", scale: 1.125 },
  big: { label: "Sangat besar", htmlClass: "font-scale-big", scale: 1.25 }
};

export const FONT_SCALE_ORDER: FontScale[] = ["normal", "large", "big"];

export interface FontFamilyOption {
  value: FontFamily;
  label: string;
  /** Stylesheet Google Fonts (400–800) untuk memuat font saat dipilih. */
  googleUrl: string;
}

const GOOGLE_FONTS_BASE = "https://fonts.googleapis.com/css2?family=";
const WEIGHTS = "wght@400;500;600;700;800";

export const FONT_FAMILIES: FontFamilyOption[] = [
  {
    value: "Plus Jakarta Sans",
    label: "Plus Jakarta Sans",
    googleUrl: `${GOOGLE_FONTS_BASE}Plus+Jakarta+Sans:${WEIGHTS}&display=swap`
  },
  {
    value: "Inter",
    label: "Inter",
    googleUrl: `${GOOGLE_FONTS_BASE}Inter:${WEIGHTS}&display=swap`
  },
  {
    value: "Open Sans",
    label: "Open Sans",
    googleUrl: `${GOOGLE_FONTS_BASE}Open+Sans:${WEIGHTS}&display=swap`
  },
  {
    value: "Roboto",
    label: "Roboto",
    googleUrl: `${GOOGLE_FONTS_BASE}Roboto:${WEIGHTS}&display=swap`
  },
  {
    value: "Lato",
    label: "Lato",
    googleUrl: `${GOOGLE_FONTS_BASE}Lato:${WEIGHTS}&display=swap`
  },
  {
    value: "Montserrat",
    label: "Montserrat",
    googleUrl: `${GOOGLE_FONTS_BASE}Montserrat:${WEIGHTS}&display=swap`
  },
  {
    value: "Poppins",
    label: "Poppins",
    googleUrl: `${GOOGLE_FONTS_BASE}Poppins:${WEIGHTS}&display=swap`
  },
  {
    value: "Source Sans 3",
    label: "Source Sans 3",
    googleUrl: `${GOOGLE_FONTS_BASE}Source+Sans+3:${WEIGHTS}&display=swap`
  },
  {
    value: "Work Sans",
    label: "Work Sans",
    googleUrl: `${GOOGLE_FONTS_BASE}Work+Sans:${WEIGHTS}&display=swap`
  }
];

export const DEFAULT_FONT_SCALE: FontScale = "normal";
export const DEFAULT_FONT_FAMILY: FontFamily = "Plus Jakarta Sans";

export function isFontScale(value: unknown): value is FontScale {
  return typeof value === "string" && (FONT_SCALE_VALUES as readonly string[]).includes(value);
}

export function isFontFamily(value: unknown): value is FontFamily {
  return typeof value === "string" && (FONT_FAMILY_VALUES as readonly string[]).includes(value);
}

/** Stack CSS untuk var --app-font-sans (fallback ke ui-sans-serif/system-ui). */
export function fontFamilyStack(family: FontFamily): string {
  return `"${family}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
}
