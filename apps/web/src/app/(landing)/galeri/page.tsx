import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

import { Badge, Button } from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import { GaleriGrid } from "@/components/landing/galeri-grid";
import { APP_NAME } from "@/lib/constants";
import { getGallery } from "@/lib/landing-pages";

/**
 * Halaman galeri mandiri — GET /public/gallery (publik, cache 300s).
 * ISR 30s; fallback struktur kosong bila API mati / section belum diterbitkan.
 * Gambar CMS (/storage/...) bisa 404 → LandingImage menukar ke placeholder lokal.
 */

export const revalidate = 30;

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
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:py-20 lg:flex-row lg:items-center">
          <FadeInUp className="max-w-2xl flex-1">
            <Badge variant="primary" className="bg-white/15 text-white">
              Galeri
            </Badge>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
              Galeri Kegiatan
            </h1>
            <p className="mt-3 text-lg font-medium text-white/90">
              Dokumentasi kegiatan, pembelajaran, dan momen sekolah.
            </p>
            <div className="mt-8">
              <Link href="/kontak">
                <Button
                  size="lg"
                  className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                >
                  Hubungi Kami
                </Button>
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1} className="hidden shrink-0 lg:block">
            <img src="/landing/landing-gal-hero.svg" alt="" className="h-44 w-44" />
          </FadeInUp>
        </div>
      </section>

      {/* Grid galeri + filter kategori */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <FadeInUp className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Dokumentasi Sekolah</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Saring berdasarkan kategori kegiatan.
          </p>
        </FadeInUp>
        <div className="mt-6">
          <GaleriGrid images={galeri.images} />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <FadeInUp className="relative overflow-hidden rounded-2xl bg-brand-primary text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative p-8 text-center sm:p-10">
            <h3 className="text-2xl font-bold">Ingin melihat langsung?</h3>
            <p className="mx-auto mt-2 max-w-xl text-white/90">
              Kunjungi sekolah kami atau hubungi tim kami untuk informasi lebih lanjut.
            </p>
            <div className="mt-6">
              <Link href="/kontak">
                <Button
                  size="lg"
                  className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                >
                  Hubungi Kami
                </Button>
              </Link>
            </div>
          </div>
        </FadeInUp>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-14">
        <Link href="/">
          <Button variant="outline" size="sm">
            ← Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
