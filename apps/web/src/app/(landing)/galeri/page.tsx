import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

import { Button } from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import { GaleriGrid } from "@/components/landing/galeri-grid";
import { LandingImage } from "@/components/landing/landing-image";
import { APP_NAME, LANDING_SCHOOL_IMAGES } from "@/lib/constants";
import { getGallery } from "@/lib/landing-pages";

/**
 * Halaman galeri mandiri — GET /public/gallery (publik, cache 300s).
 * ISR 30s; fallback struktur kosong bila API mati / section belum diterbitkan.
 * Gambar CMS (/storage/...) bisa 404 → LandingImage menukar ke placeholder lokal.
 * Desain landing v2 (docs/landing-design-v2.md E.8): hero terang gradient-soft,
 * grid ImageTile masonry + filter kategori, CTA band gradient.
 */

export const revalidate = 30;

const HERO_SOFT_GRADIENT = "linear-gradient(180deg,#eef2ff 0%,#f6f7fc 100%)";

export async function generateMetadata(): Promise<Metadata> {
  const galeri = await getGallery();
  return {
    title: `${galeri.title || "Galeri"} — ${APP_NAME}`,
    description: "Dokumentasi kegiatan dan momen sekolah."
  };
}

export default async function GaleriPage(): Promise<JSX.Element> {
  const galeri = await getGallery();

  return (
    <div className="bg-[var(--surface-soft)]">
      {/* PageHero — varian terang (bg-gradient-hero-soft) */}
      <section
        className="relative overflow-hidden bg-[var(--surface-soft)]"
        style={{ backgroundImage: `var(--gradient-hero-soft, ${HERO_SOFT_GRADIENT})` }}
      >
        <img
          src="/landing/playful/play-blob-3.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 opacity-50"
        />
        <img
          src="/landing/playful/play-spark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-10 top-12 h-10 w-10 opacity-70"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <FadeInUp className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-indigo-text)]/30 bg-[var(--accent-indigo-text)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--accent-indigo-text)]">
              <img
                src="/landing/playful/play-star.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
              Galeri
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              Galeri Kegiatan
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              Dokumentasi kegiatan, pembelajaran, dan momen sekolah.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/kontak">
                <Button
                  size="lg"
                  className="rounded-full text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                >
                  Hubungi Kami
                </Button>
              </Link>
              <Link href="/fasilitas">
                <Button size="lg" variant="outline" className="rounded-full">
                  Lihat Fasilitas
                </Button>
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15} className="relative">
            <LandingImage
              src={LANDING_SCHOOL_IMAGES.library}
              alt="Perpustakaan dan dokumentasi kegiatan sekolah"
              width={640}
              height={480}
              loading="eager"
              className="mx-auto w-full max-w-md rounded-[1.5rem] object-cover shadow-[var(--shadow-lift)]"
              fallbackText="Galeri"
            />
          </FadeInUp>
        </div>
      </section>

      {/* Grid galeri + filter kategori */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <FadeInUp className="mx-auto max-w-2xl text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
            style={{ backgroundImage: "var(--gradient-indigo)" }}
          >
            <img
              src="/landing/playful/play-spark.svg"
              alt=""
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />
            Dokumentasi
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Dokumentasi Sekolah
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Saring berdasarkan kategori kegiatan.
          </p>
        </FadeInUp>
        <div className="mt-6">
          <GaleriGrid images={galeri.images} />
        </div>
      </section>

      {/* CTA — ikuti kegiatan / kunjungi */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <FadeInUp>
          <div
            className="relative overflow-hidden rounded-[1.5rem] text-white"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <div aria-hidden="true" className="absolute inset-0 bg-black/15" />
            <img
              src="/landing/playful/play-blob-1.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 opacity-40"
            />
            <img
              src="/landing/playful/play-dots.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-6 left-8 h-12 w-12 opacity-30"
            />
            <div className="relative flex flex-col items-center gap-6 px-6 py-12 text-center md:py-16">
              <img
                src="/landing/playful/play-gallery.svg"
                alt=""
                aria-hidden="true"
                className="h-20 w-24 opacity-90"
              />
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Ingin melihat langsung?
              </h2>
              <p className="max-w-xl text-base text-white/90">
                Kunjungi sekolah kami atau hubungi tim kami untuk informasi lebih lanjut.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/kontak">
                  <Button
                    size="lg"
                    className="rounded-full bg-white text-brand-primary shadow-[var(--shadow-soft)] transition-all duration-300 hover:bg-white/90 hover:shadow-[var(--shadow-lift)]"
                  >
                    Hubungi Kami
                  </Button>
                </Link>
                <Link href="/fasilitas">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                  >
                    Lihat Fasilitas
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeInUp>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-14">
        <Link href="/">
          <Button variant="outline" size="sm" className="rounded-full">
            ← Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
