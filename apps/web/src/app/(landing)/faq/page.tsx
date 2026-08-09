import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

import { Accordion, AccordionItem, Badge, Button, Card, CardContent } from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import { APP_NAME } from "@/lib/constants";
import { getFaqs } from "@/lib/landing-pages";

/**
 * Halaman FAQ mandiri — GET /public/faqs (publik, cache 300s).
 * ISR 30s; fallback struktur kosong bila API mati / section belum diterbitkan.
 */

export const revalidate = 30;

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
    <div className="bg-background">
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
            <p className="mt-3 text-lg font-medium text-white/90">
              Informasi seputar pendaftaran, pembelajaran, dan layanan sekolah.
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
          {faqs.items.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Belum ada pertanyaan yang dimuat. Silakan kembali lagi nanti.
              </CardContent>
            </Card>
          ) : (
            <Accordion>
              {faqs.items.map((f) => (
                <AccordionItem key={f.question || f.answer} title={f.question}>
                  <p className="whitespace-pre-line leading-relaxed">{f.answer}</p>
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
