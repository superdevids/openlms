import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

import { Button } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { APP_NAME } from "@/lib/constants";
import { getTestimonials } from "@/lib/landing-pages";

/**
 * Halaman testimoni mandiri — GET /public/testimonials (publik, cache 300s).
 * ISR 30s; fallback struktur kosong bila API mati / section belum diterbitkan.
 * Desain landing v2 (docs/landing-design-v2.md E.9): hero terang gradient-soft,
 * QuoteCard unggulan (kutipan besar, border gradient) + grid QuoteCard (D.5),
 * avatar inisial gradient, CTA band gradient.
 */

export const revalidate = 30;

const HERO_SOFT_GRADIENT = "linear-gradient(180deg,#eef2ff 0%,#f6f7fc 100%)";

/** Inisial nama (2 huruf) untuk avatar placeholder. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

function Stars(): JSX.Element {
  return (
    <div className="flex gap-1" role="img" aria-label="Rating 5 dari 5">
      {[1, 2, 3, 4, 5].map((i) => (
        <img
          key={i}
          src="/landing/playful/play-star.svg"
          alt=""
          aria-hidden="true"
          className="h-4 w-4"
        />
      ))}
    </div>
  );
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

  const [featured, ...rest] = testimonials.items;

  return (
    <div className="bg-[var(--surface-soft)]">
      {/* PageHero — varian terang (bg-gradient-hero-soft) */}
      <section
        className="relative overflow-hidden bg-[var(--surface-soft)]"
        style={{ backgroundImage: `var(--gradient-hero-soft, ${HERO_SOFT_GRADIENT})` }}
      >
        <img
          src="/landing/playful/play-blob-2.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 opacity-50"
        />
        <img
          src="/landing/playful/play-star.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-10 top-14 h-8 w-8 opacity-70"
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
              Kata Mereka
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">Testimoni</h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              Pengalaman nyata dari orang tua, siswa, dan alumni sekolah.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/kontak">
                <Button
                  size="lg"
                  className="rounded-full text-white shadow-[0_8px_30px_rgba(67,56,202,0.1)] hover:shadow-[0_20px_45px_rgba(67,56,202,0.16)]"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                >
                  Hubungi Kami
                </Button>
              </Link>
              <Link href="/ppdb">
                <Button size="lg" variant="outline" className="rounded-full">
                  Daftar PPDB
                </Button>
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15} className="relative">
            <img
              src="/landing/playful/play-testimonial.svg"
              alt="Ilustrasi testimoni"
              role="img"
              className="w-full max-w-md"
            />
          </FadeInUp>
        </div>
      </section>

      {/* QuoteCard unggulan + grid QuoteCard */}
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
            Testimoni
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Apa Kata Mereka</h2>
          <p className="mt-4 text-base text-muted-foreground">
            Pengalaman nyata dari orang tua, siswa, dan alumni.
          </p>
        </FadeInUp>

        {!featured ? (
          <div className="mx-auto mt-10 max-w-3xl rounded-[1.5rem] border border-dashed border-border bg-card px-6 py-12 text-center shadow-[0_8px_30px_rgba(67,56,202,0.1)]">
            <img
              src="/landing/playful/play-testimonial.svg"
              alt=""
              aria-hidden="true"
              className="mx-auto h-16 w-20 opacity-80"
            />
            <p className="mt-4 font-semibold text-foreground">
              Belum ada testimoni yang diterbitkan
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Silakan kembali lagi nanti.</p>
          </div>
        ) : (
          <>
            {/* Kutipan unggulan — border gradient playful */}
            <FadeInUp className="mx-auto mt-10 max-w-3xl">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-indigo-500 via-cyan-400 to-pink-400 p-[2px] shadow-[0_8px_30px_rgba(67,56,202,0.1)]">
                <figure className="flex h-full flex-col rounded-[calc(1.5rem-2px)] bg-card p-6 md:p-8">
                  <div className="flex items-center justify-between">
                    <Stars />
                    <img
                      src="/landing/playful/play-testimonial.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-8 w-8 opacity-70"
                    />
                  </div>
                  <blockquote className="mt-4 flex-1 text-lg font-medium italic leading-relaxed text-foreground">
                    &ldquo;{featured.text || "Belum ada keterangan."}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundImage: "var(--gradient-indigo)" }}
                      aria-hidden="true"
                    >
                      {initials(featured.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{featured.name}</p>
                      {featured.role ? (
                        <p className="truncate text-xs text-muted-foreground">{featured.role}</p>
                      ) : null}
                    </div>
                  </figcaption>
                </figure>
              </div>
            </FadeInUp>

            {/* Grid QuoteCard lainnya */}
            {rest.length > 0 ? (
              <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((t) => (
                  <StaggerItem key={t.name || t.role || "testimoni"} className="h-full">
                    <figure className="flex h-full flex-col rounded-[1.5rem] bg-card p-6 shadow-[0_8px_30px_rgba(67,56,202,0.1)] transition-shadow duration-300 hover:shadow-[0_20px_45px_rgba(67,56,202,0.16)]">
                      <div className="flex items-center justify-between">
                        <Stars />
                        <img
                          src="/landing/playful/play-testimonial.svg"
                          alt=""
                          aria-hidden="true"
                          className="h-8 w-8 opacity-70"
                        />
                      </div>
                      <blockquote className="mt-4 flex-1 text-base italic leading-relaxed text-foreground">
                        &ldquo;{t.text || "Belum ada keterangan."}&rdquo;
                      </blockquote>
                      <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ backgroundImage: "var(--gradient-indigo)" }}
                          aria-hidden="true"
                        >
                          {initials(t.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{t.name}</p>
                          {t.role ? (
                            <p className="truncate text-xs text-muted-foreground">{t.role}</p>
                          ) : null}
                        </div>
                      </figcaption>
                    </figure>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            ) : null}
          </>
        )}
      </section>

      {/* CTA — jadi bagian sekolah */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <FadeInUp>
          <div
            className="relative overflow-hidden rounded-[1.5rem] text-white"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <div aria-hidden="true" className="absolute inset-0 bg-black/15" />
            <img
              src="/landing/playful/play-blob-3.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 opacity-40"
            />
            <img
              src="/landing/playful/play-star.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-8 left-8 h-8 w-8 opacity-50"
            />
            <div className="relative flex flex-col items-center gap-6 px-6 py-12 text-center md:py-16">
              <img
                src="/landing/playful/play-testimonial.svg"
                alt=""
                aria-hidden="true"
                className="h-20 w-24 opacity-90"
              />
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Jadilah Bagian dari Cerita Kami
              </h2>
              <p className="max-w-xl text-base text-white/90">
                Bergabunglah dan rasakan sendiri pengalaman belajar di sekolah kami.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/ppdb">
                  <Button
                    size="lg"
                    className="rounded-full bg-white text-brand-primary shadow-[0_8px_30px_rgba(67,56,202,0.1)] hover:bg-white/90 hover:shadow-[0_20px_45px_rgba(67,56,202,0.16)]"
                  >
                    Daftar PPDB
                  </Button>
                </Link>
                <Link href="/kontak">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                  >
                    Hubungi Kami
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
