import Link from "next/link";
import type { JSX } from "react";
import type { BrandingView } from "@/lib/api-client";

/** Footer landing — dipakai bersama oleh halaman depan dan grup (landing). */
export function LandingFooter({ branding }: { branding: BrandingView }): JSX.Element {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-base font-semibold text-brand-secondary">{branding.appName}</p>
            <p className="text-sm text-muted-foreground">
              LMS &amp; SIS Sekolah — platform digital terpadu.
            </p>
          </div>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <Link href="/ppdb" className="hover:text-brand-primary">
              Daftar PPDB
            </Link>
            <Link href="/login" className="hover:text-brand-primary">
              Masuk
            </Link>
            <Link href="/berita" className="hover:text-brand-primary">
              Berita
            </Link>
          </div>
        </div>
        <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {branding.appName}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
