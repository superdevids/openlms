import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

import { Accordion, AccordionItem, Button, cn } from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import { APP_NAME } from "@/lib/constants";
import { getFaqs } from "@/lib/landing-pages";

/**
 * Halaman FAQ mandiri — GET /public/faqs (publik, cache 300s).
 * ISR 30s; fallback struktur kosong bila API mati / section belum diterbitkan.
 * Desain landing v2 (docs/landing-design-v2.md E.10): hero terang gradient-soft,
 * FaqAccordion (D.7) memakai Accordion packages/ui dengan styling playful
 * (rounded, border tinted, shadow, ikon brand) + CTA band gradient.
 */

export const revalidate = 30;

const HERO_SOFT_GRADIENT = "linear-gradient(180deg,#eef2ff 0%,#f6f7fc 100%)";

/** Styling playful item accordion via arbitrary variant pada wrapper (D.7). */
const ACCORDION_CLASSES = cn(
  "mx-auto max-w-3xl space-y-3",
  "[&>div]:rounded-[1.5rem]",
  "[&>div]:border-border",
  "[&>div]:bg-card",
  "[&>div]:shadow-[0_8px_30px_rgba(67,56,202,0.1)]",
  "[&>div]:transition-shadow",
  "[&>div]:hover:shadow-[0_20px_45px_rgba(67,56,202,0.16)]",
  "[&>div>h3>button]:gap-4",
  "[&>div>h3>button]:px-5",
  "[&>div>h3>button]:py-4",
  "[&>div>h3>button]:text-left",
  "[&>div>h3>button]:text-base",
  "[&>div>h3>button]:font-semibold",
  "[&>div>h3>button_svg]:h-5",
  "[&>div>h3>button_svg]:w-5",
  "[&>div>h3>button_svg]:shrink-0",
  "[&>div>h3>button_svg]:text-brand-primary",
  "[&>div>div>div]:px-5",
  "[&>div>div>div]:pb-5",
  "[&>div>div>div]:text-sm",
  "[&>div>div>div]:leading-relaxed"
);

export async function generateMetadata(): Promise<Metadata> {
  const faqs = await getFaqs();
  return {
    title: `${faqs.title || "Pertanyaan Umum"} — ${APP_NAME}`,
    description: "Jawaban atas pertanyaan yang sering diajukan."
  };
}

export default async function FaqPage(): Promise<JSX.Element> {
  const faqs = await getFaqs();

  return (
    <div className="bg-[var(--surface-soft)]">
      {/* PageHero — varian terang (bg-gradient-hero-soft) */}
      <section
        className="relative overflow-hidden bg-[var(--surface-soft)]"
        style={{ backgroundImage: `var(--gradient-hero-soft, ${HERO_SOFT_GRADIENT})` }}
      >
        <img
          src="/landing/playful/play-blob-4.svg"
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
              Pusat Bantuan
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              Pertanyaan yang Sering Diajukan
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              Informasi seputar pendaftaran, pembelajaran, dan layanan sekolah.
            </p>
            <div className="mt-8">
              <Link href="/kontak">
                <Button
                  size="lg"
                  className="rounded-full text-white shadow-[0_8px_30px_rgba(67,56,202,0.1)] hover:shadow-[0_20px_45px_rgba(67,56,202,0.16)]"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                >
                  Hubungi Kami
                </Button>
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15} className="relative">
            <img
              src="/landing/playful/play-faq.svg"
              alt="Ilustrasi pertanyaan yang sering diajukan"
              role="img"
              className="w-full max-w-md"
            />
          </FadeInUp>
        </div>
      </section>

      {/* Daftar pertanyaan — FaqAccordion playful */}
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
            FAQ
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Pertanyaan Umum</h2>
          <p className="mt-4 text-base text-muted-foreground">
            Informasi seputar pendaftaran, pembelajaran, dan layanan sekolah.
          </p>
        </FadeInUp>

        <div className="mt-10">
          {faqs.items.length === 0 ? (
            <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-dashed border-border bg-card px-6 py-12 text-center shadow-[0_8px_30px_rgba(67,56,202,0.1)]">
              <img
                src="/landing/playful/play-faq.svg"
                alt=""
                aria-hidden="true"
                className="mx-auto h-16 w-20 opacity-80"
              />
              <p className="mt-4 font-semibold text-foreground">Belum ada pertanyaan yang dimuat</p>
              <p className="mt-1 text-sm text-muted-foreground">Silakan kembali lagi nanti.</p>
            </div>
          ) : (
            <Accordion className={ACCORDION_CLASSES}>
              {faqs.items.map((f, index) => (
                <AccordionItem
                  key={f.question || f.answer}
                  title={f.question}
                  defaultOpen={index === 0}
                >
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                    {f.answer}
                  </p>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </section>

      {/* CTA kontak — belum terjawab? */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <FadeInUp>
          <div
            className="relative overflow-hidden rounded-[1.5rem] text-white"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <div aria-hidden="true" className="absolute inset-0 bg-black/15" />
            <img
              src="/landing/playful/play-blob-2.svg"
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
                src="/landing/playful/play-contact.svg"
                alt=""
                aria-hidden="true"
                className="h-20 w-24 opacity-90"
              />
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Masih ada pertanyaan?
              </h2>
              <p className="max-w-xl text-base text-white/90">
                Tim kami siap membantu Anda melalui halaman kontak sekolah.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/kontak">
                  <Button
                    size="lg"
                    className="rounded-full bg-white text-brand-primary shadow-[0_8px_30px_rgba(67,56,202,0.1)] hover:bg-white/90 hover:shadow-[0_20px_45px_rgba(67,56,202,0.16)]"
                  >
                    Hubungi Kami
                  </Button>
                </Link>
                <Link href="/ppdb">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                  >
                    Daftar PPDB
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
