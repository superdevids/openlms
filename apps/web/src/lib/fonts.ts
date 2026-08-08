import { Plus_Jakarta_Sans } from "next/font/google";

/**
 * Font default global "Plus Jakarta Sans" (Google Fonts — variable font).
 * - Di-load via next/font/google (self-hosted + preload) — pengganti <link>
 *   stylesheet Google Fonts yang sebelumnya statis di layout.tsx.
 * - Diekspos sebagai CSS variable `--font-plus-jakarta-sans` pada <html>
 *   (layout.tsx) lalu dipakai di globals.css `--font-sans`.
 * - Penggantian font sekolah (superadmin, 9 pilihan dari /app/settings/font)
 *   tetap runtime via FontSizeProvider → `--app-font-sans` (lihat lib/font.ts).
 */
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap"
});
