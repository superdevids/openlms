/**
 * Tipe bersama BrandingModule — identitas visual aplikasi (single-school).
 * BrandingView dipakai service, controller, dan klien web (pre-login).
 */

export interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface BrandingView {
  appName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: BrandingColors;
  radius: number | null;
  configVersion: number;
}
