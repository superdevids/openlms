import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@opensis/ui";
import type { BrandingView } from "@/lib/api-client";

/** Header landing — dipakai bersama oleh halaman depan dan grup (landing). */
export function LandingHeader({ branding }: { branding: BrandingView }): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <a href="#main" className="skip-link">
        Lewati ke konten
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-lg font-bold text-white">
            {branding.appName.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-lg font-bold text-brand-secondary">{branding.appName}</span>
        </Link>
        <nav aria-label="Navigasi landing" className="hidden items-center gap-5 md:flex">
          <Link
            href="/tentang"
            className="rounded text-sm font-medium text-foreground transition-colors duration-200 hover:text-brand-primary focus-visible:text-brand-primary"
          >
            Tentang
          </Link>
          <Link
            href="/tentang#visi-misi"
            className="rounded text-sm font-medium text-foreground transition-colors duration-200 hover:text-brand-primary focus-visible:text-brand-primary"
          >
            Visi &amp; Misi
          </Link>
          <Link
            href="/program-keahlian"
            className="rounded text-sm font-medium text-foreground transition-colors duration-200 hover:text-brand-primary focus-visible:text-brand-primary"
          >
            Program Keahlian
          </Link>
          <Link
            href="/berita"
            className="rounded text-sm font-medium text-foreground transition-colors duration-200 hover:text-brand-primary focus-visible:text-brand-primary"
          >
            Berita
          </Link>
          <Link
            href="/kontak"
            className="rounded text-sm font-medium text-foreground transition-colors duration-200 hover:text-brand-primary focus-visible:text-brand-primary"
          >
            Kontak
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/ppdb">
            <Button size="sm" variant="outline">
              Daftar PPDB
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm">Masuk</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
