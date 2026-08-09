import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

import { Badge, Button, Card, CardContent } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { APP_NAME } from "@/lib/constants";
import { getTestimonials } from "@/lib/landing-pages";

/**
 * Halaman testimoni mandiri — GET /public/testimonials (publik, cache 300s).
 * ISR 30s; fallback struktur kosong bila API mati / section belum diterbitkan.
 */

export const revalidate = 30;

/** Inisial nama (2 huruf) untuk avatar placeholder. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

export async function generateMetadata(): Promise<Metadata> {
  const testimonials = await getTestimonials();
  return {
    title: `${testimonials.title || "Testimoni"} — ${APP_NAME}`,
    description: "Pengalaman orang tua, siswa, dan alumni sekolah."
  };
}

export default async function TestimoniPage(): Promise<JSX.Element> {
  const testimonials = await getTestimonials();

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:py-20 lg:flex-row lg:items-center">
          <FadeInUp className="max-w-2xl flex-1">
            <Badge variant="primary" className="bg-white/15 text-white">
              Testimoni
            </Badge>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Testimoni</h1>
            <p className="mt-3 text-lg font-medium text-white/90">
              Pengalaman nyata dari orang tua, siswa, dan alumni sekolah.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/kontak">
                <Button
                  size="lg"
                  className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                >
                  Hubungi Kami
                </Button>
              </Link>
              <Link href="/ppdb">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/60 bg-transparent text-white hover:bg-white/10"
                >
                  Daftar PPDB
                </Button>
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1} className="hidden shrink-0 lg:block">
            <img src="/landing/landing-tes-hero.svg" alt="" className="h-44 w-44" />
          </FadeInUp>
        </div>
      </section>

      {/* Kartu testimoni */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <FadeInUp className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Apa Kata Mereka</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Pengalaman nyata dari orang tua, siswa, dan alumni.
          </p>
        </FadeInUp>

        {testimonials.items.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Belum ada testimoni yang diterbitkan. Silakan kembali lagi nanti.
            </CardContent>
          </Card>
        ) : (
          <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.items.map((t) => (
              <StaggerItem key={t.name || t.role || "testimoni"} className="h-full">
                <Card className="h-full border-border">
                  <CardContent className="flex h-full flex-col p-5">
                    <span className="text-3xl leading-none text-brand-primary" aria-hidden="true">
                      &ldquo;
                    </span>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {t.text || "Belum ada keterangan."}
                    </p>
                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-accent text-sm font-bold text-white"
                        aria-hidden="true"
                      >
                        {initials(t.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{t.name}</p>
                        {t.role ? (
                          <p className="truncate text-sm text-muted-foreground">{t.role}</p>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
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
