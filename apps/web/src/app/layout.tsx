import type { Metadata } from "next";
import { cache } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { BrandingProvider } from "@/components/branding/branding-provider";
import { fetchBrandingServer, type BrandingView } from "@/lib/api-client";

/** Fallback bila fetch branding gagal (offline / API mati) — default openlms. */
const FALLBACK_BRANDING: BrandingView = {
  appName: "openlms",
  tagline: "LMS & SIS Sekolah",
  logoUrl: null,
  faviconUrl: null,
  colors: { primary: "#2563eb", secondary: "#1d4ed8", accent: "#0ea5e9" },
  radius: null,
  configVersion: 1
};

/** Dedup fetch branding dalam satu request (dipakai generateMetadata + layout). */
const getBranding = cache(async (): Promise<BrandingView> => {
  try {
    return await fetchBrandingServer();
  } catch {
    return FALLBACK_BRANDING;
  }
});

function cssVars(b: BrandingView): string {
  const radius = b.radius != null ? `${b.radius}px` : "8px";
  return [
    `:root{`,
    `--brand-primary:${b.colors.primary};`,
    `--brand-secondary:${b.colors.secondary};`,
    `--brand-accent:${b.colors.accent};`,
    `--brand-radius:${radius};`,
    `}`
  ].join("");
}

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  const title = b.appName ? `${b.appName} — LMS & SIS Sekolah` : "openlms — LMS & SIS Sekolah";
  return {
    title,
    description: b.tagline ?? "LMS & SIS Sekolah",
    icons: b.faviconUrl ? { icon: b.faviconUrl, shortcut: b.faviconUrl } : undefined
  };
}

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const branding = await getBranding();

  return (
    <html lang="id">
      <head>
        <style id="branding-vars">{cssVars(branding)}</style>
        {branding.logoUrl ? (
          <link rel="icon" href={branding.faviconUrl ?? branding.logoUrl} />
        ) : null}
      </head>
      <body>
        <a href="#main" className="skip-link">
          Lewati ke konten utama
        </a>
        <BrandingProvider>{children}</BrandingProvider>
        <Toaster />
      </body>
    </html>
  );
}
