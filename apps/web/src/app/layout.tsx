import type { Metadata } from "next";
import { cache } from "react";
import "./globals.css";
import { Toaster } from "@openlms/ui";
import { BrandingProvider } from "@/components/branding/branding-provider";
import { MaintenanceGate } from "@/components/maintenance/maintenance-gate";
import { FontSizeProvider } from "@/components/theme/font-size-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { fetchBrandingServer, type BrandingView } from "@/lib/api-client";
import { APP_NAME, FALLBACK_BRANDING } from "@/lib/constants";
import { STORAGE_KEYS } from "@/lib/storage";

/**
 * No-FOUC dark mode: terapkan class .dark + colorScheme sebelum React
 * hydrasi (baca pilihan dari localStorage; fallback preferensi OS).
 * Key sama dengan storage.ts (openlms_theme) agar konsisten.
 */
const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEYS.theme}");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;if(d){root.classList.add("dark");root.style.colorScheme="dark";}else{root.classList.remove("dark");root.style.colorScheme="light";}}catch(e){}})();`;

/**
 * No-FOUC skala teks: terapkan class .font-scale-* sebelum React hydrasi
 * (nilai disimpan JSON oleh storage.ts safeSet — parse dulu).
 */
const FONT_SCALE_BOOTSTRAP_SCRIPT = `(function(){try{var s=localStorage.getItem("${STORAGE_KEYS.fontScale}");if(s){try{s=JSON.parse(s);}catch(e){}}var root=document.documentElement;if(s==="large"){root.classList.add("font-scale-large");}else if(s==="big"){root.classList.add("font-scale-big");}else{root.classList.add("font-scale-normal");}}catch(e){}})();`;

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
  const title = `${b.appName ?? APP_NAME} — LMS & SIS Sekolah`;
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
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: FONT_SCALE_BOOTSTRAP_SCRIPT }} />
        {/* Font global "Plus Jakarta Sans" (Google Fonts) — dipakai var --font-sans.
            latin + latin-ext, weights 400/500/600/700/800. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
        <style id="branding-vars">{cssVars(branding)}</style>
        {branding.logoUrl ? (
          <link rel="icon" href={branding.faviconUrl ?? branding.logoUrl} />
        ) : null}
      </head>
      <body>
        <a href="#main" className="skip-link">
          Lewati ke konten utama
        </a>
        <ThemeProvider>
          <FontSizeProvider>
            <BrandingProvider>
              <MaintenanceGate>{children}</MaintenanceGate>
            </BrandingProvider>
          </FontSizeProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
