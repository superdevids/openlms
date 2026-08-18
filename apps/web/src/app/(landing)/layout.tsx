import { cache, type JSX, type ReactNode } from "react";
import { fetchBrandingServer, type BrandingView } from "@/lib/api-client";
import { FALLBACK_BRANDING } from "@/lib/constants";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";

/**
 * Layout grup (landing) — halaman publik di luar dashboard (berita, dll).
 * Berbagi header/footer dengan halaman depan (components/landing) tanpa shell aplikasi.
 * ISR: tanpa force-dynamic agar `revalidate` di page.tsx/berita/* efektif
 * (keputusan arsitek T3 — konten landing dari CMS, revalidate 30s).
 */

const getBranding = cache(async (): Promise<BrandingView> => {
  try {
    return await fetchBrandingServer();
  } catch {
    return FALLBACK_BRANDING;
  }
});

export default async function LandingLayout({
  children
}: Readonly<{ children: ReactNode }>): Promise<JSX.Element> {
  const branding = await getBranding();

  return (
    <div className="landing-light flex min-h-screen flex-col bg-background">
      <LandingHeader branding={branding} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <LandingFooter branding={branding} />
    </div>
  );
}
