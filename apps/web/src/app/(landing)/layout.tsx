import { cache } from "react";
import { fetchBrandingServer, type BrandingView } from "@/lib/api-client";
import { FALLBACK_BRANDING } from "@/lib/constants";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";

/**
 * Layout grup (landing) — halaman publik di luar dashboard (berita, dll).
 * Berbagi header/footer dengan halaman depan (components/landing) tanpa shell aplikasi.
 */

export const dynamic = "force-dynamic";

const getBranding = cache(async (): Promise<BrandingView> => {
  try {
    return await fetchBrandingServer();
  } catch {
    return FALLBACK_BRANDING;
  }
});

export default async function LandingLayout({
  children
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const branding = await getBranding();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <LandingHeader branding={branding} />

      <main id="main" className="flex-1">
        {children}
      </main>

      <LandingFooter branding={branding} />
    </div>
  );
}
