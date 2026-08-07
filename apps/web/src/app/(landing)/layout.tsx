import Link from "next/link";
import { cache } from "react";
import { Button } from "@/components/ui/button";
import { fetchBrandingServer, type BrandingView } from "@/lib/api-client";

/**
 * Layout grup (landing) — halaman publik di luar dashboard (berita, dll).
 * Berbagi header/footer dengan halaman depan, tetapi TANPA shell aplikasi.
 */

export const dynamic = "force-dynamic";

const getBranding = cache(async (): Promise<BrandingView> => {
  try {
    return await fetchBrandingServer();
  } catch {
    return {
      appName: "openlms",
      tagline: "LMS & SIS Sekolah",
      logoUrl: null,
      faviconUrl: null,
      colors: { primary: "#2563eb", secondary: "#1d4ed8", accent: "#0ea5e9" },
      radius: null,
      configVersion: 1
    };
  }
});

export default async function LandingLayout({
  children
}: Readonly<{ children: React.ReactNode }>): Promise<React.JSX.Element> {
  const branding = await getBranding();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-lg font-bold text-white">
              {branding.appName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-lg font-bold text-brand-secondary">{branding.appName}</span>
          </Link>
          <nav aria-label="Navigasi landing" className="hidden items-center gap-5 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
            >
              Beranda
            </Link>
            <Link
              href="/#tentang"
              className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
            >
              Tentang
            </Link>
            <Link
              href="/#piagam"
              className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
            >
              Piagam
            </Link>
            <Link
              href="/berita"
              className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
            >
              Berita
            </Link>
            <Link
              href="/#kontak"
              className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
            >
              Kontak
            </Link>
          </nav>
          <Link href="/login">
            <Button size="sm">Masuk</Button>
          </Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-base font-semibold text-brand-secondary">{branding.appName}</p>
              <p className="text-sm text-neutral-600">
                LMS & SIS Sekolah — platform digital terpadu.
              </p>
            </div>
            <div className="flex gap-5 text-sm text-neutral-600">
              <Link href="/login" className="hover:text-brand-primary">
                Masuk
              </Link>
              <Link href="/berita" className="hover:text-brand-primary">
                Berita
              </Link>
            </div>
          </div>
          <p className="mt-6 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
            © {new Date().getFullYear()} {branding.appName}. Seluruh hak cipta dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
}
