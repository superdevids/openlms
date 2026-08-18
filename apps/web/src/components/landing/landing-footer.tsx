import Link from "next/link";
import type { JSX } from "react";
import type { BrandingView } from "@/lib/api-client";

/**
 * Footer landing — dipakai bersama oleh halaman depan dan grup (landing).
 * Footer lengkap: kolom navigasi (Profil, Layanan, Informasi), kontak singkat,
 * dan baris hak cipta. Semua tautan menunjuk ke halaman mandiri (bukan anchor #).
 */
export function LandingFooter({ branding }: { branding: BrandingView }): JSX.Element {
  const year = new Date().getFullYear();

  const navProfil = [
    { href: "/tentang", label: "Tentang Sekolah" },
    { href: "/tentang#visi-misi", label: "Visi & Misi" },
    { href: "/program-keahlian", label: "Program Keahlian" },
    { href: "/prestasi", label: "Prestasi" },
    { href: "/ekstrakurikuler", label: "Ekstrakurikuler" }
  ];

  const navLayanan = [
    { href: "/berita", label: "Berita" },
    { href: "/galeri", label: "Galeri" },
    { href: "/fasilitas", label: "Fasilitas" },
    { href: "/faq", label: "FAQ" },
    { href: "/testimoni", label: "Testimoni" }
  ];

  const navInformasi = [
    { href: "/ppdb", label: "Daftar PPDB" },
    { href: "/ppdb/status", label: "Cek Status PPDB" },
    { href: "/kontak", label: "Hubungi Kami" },
    { href: "/login", label: "Masuk" }
  ];

  return (
    <footer className="landing-light border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-lg font-bold text-white">
                {branding.appName.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-lg font-bold text-brand-secondary">{branding.appName}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              LMS &amp; SIS Sekolah — platform digital terpadu untuk pembelajaran modern, hangat,
              dan menyenangkan.
            </p>
          </div>

          {/* Profil */}
          <nav aria-label="Footer profil">
            <p className="text-sm font-bold text-foreground">Profil</p>
            <ul className="mt-3 space-y-2 text-sm">
              {navProfil.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded text-muted-foreground transition-colors duration-200 hover:text-brand-primary focus-visible:text-brand-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Layanan */}
          <nav aria-label="Footer layanan">
            <p className="text-sm font-bold text-foreground">Layanan</p>
            <ul className="mt-3 space-y-2 text-sm">
              {navLayanan.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded text-muted-foreground transition-colors duration-200 hover:text-brand-primary focus-visible:text-brand-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Informasi */}
          <nav aria-label="Footer informasi">
            <p className="text-sm font-bold text-foreground">Informasi</p>
            <ul className="mt-3 space-y-2 text-sm">
              {navInformasi.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded text-muted-foreground transition-colors duration-200 hover:text-brand-primary focus-visible:text-brand-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-border pt-5 text-xs text-muted-foreground">
          © {year} {branding.appName}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
