import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX } from "react";
import { Accordion, AccordionItem, Badge, Button, Card, CardContent } from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import {
  API_BASE_FALLBACK,
  API_TIMEOUT_MS,
  APP_NAME,
  FALLBACK_LANDING,
  type LandingPageData,
  type LandingSection
} from "@/lib/constants";

/**
 * Halaman FAQ — GET /public/landing (publik), section slug "faq".
 * ISR 30s — konten berubah hanya via superadmin; fallback FALLBACK_LANDING.
 */

export const revalidate = 30;

function landingApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? API_BASE_FALLBACK).replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) return `${base}${path}`;
  return `${base}/api/v1${path}`;
}

const getLanding = cache(async (): Promise<LandingPageData> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(landingApiUrl("/public/landing"), {
        next: { revalidate: 30 },
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`landing ${res.status}`);
      return (await res.json()) as LandingPageData;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return FALLBACK_LANDING;
  }
});

function findSection(sections: LandingSection[], slug: string): LandingSection | undefined {
  return sections.find((s) => s.slug === slug);
}

function extraOf(section: LandingSection | undefined, key: string): Array<Record<string, unknown>> {
  const value = section?.extra?.[key];
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function str(record: Record<string, unknown> | null | undefined, key: string): string {
  const v = record?.[key];
  return typeof v === "string" ? v : "";
}

export async function generateMetadata(): Promise<Metadata> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "faq");
  return {
    title: `${section?.title ?? "Pertanyaan Umum"} — ${APP_NAME}`,
    description: section?.subtitle ?? "Jawaban atas pertanyaan yang sering diajukan."
  };
}

export default async function FaqPage(): Promise<JSX.Element> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "faq");
  const faqItems = extraOf(section, "faq");

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:py-20 lg:flex-row lg:items-center">
          <FadeInUp className="max-w-2xl flex-1">
            <Badge variant="primary" className="bg-white/15 text-white">
              FAQ
            </Badge>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
              Pertanyaan yang Sering Diajukan
            </h1>
            {section?.subtitle ? (
              <p className="mt-3 text-lg font-medium text-white/90">{section.subtitle}</p>
            ) : null}
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
            <img src="/landing/landing-faq-hero.svg" alt="" className="h-44 w-44" />
          </FadeInUp>
        </div>
      </section>

      {/* Daftar pertanyaan */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <FadeInUp className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Pertanyaan Umum</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Informasi seputar pendaftaran, pembelajaran, dan layanan sekolah.
          </p>
        </FadeInUp>

        <div className="mt-8">
          {faqItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Belum ada pertanyaan yang dimuat. Silakan kembali lagi nanti.
              </CardContent>
            </Card>
          ) : (
            <Accordion>
              {faqItems.map((f) => (
                <AccordionItem key={str(f, "question")} title={str(f, "question")}>
                  <p className="whitespace-pre-line leading-relaxed">{str(f, "answer")}</p>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* CTA hubungi */}
        <FadeInUp className="mt-10 overflow-hidden rounded-2xl bg-brand-primary text-white">
          <div className="relative p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative text-center">
              <h3 className="text-2xl font-bold">Masih ada pertanyaan?</h3>
              <p className="mx-auto mt-2 max-w-xl text-white/90">
                Tim kami siap membantu Anda melalui halaman kontak sekolah.
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
