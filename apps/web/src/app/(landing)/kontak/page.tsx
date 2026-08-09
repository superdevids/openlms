import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import { ContactForm } from "@/components/landing/contact-form";
import { safeUrl } from "@/lib/safe-url";
import {
  API_BASE_FALLBACK,
  API_TIMEOUT_MS,
  APP_NAME,
  FALLBACK_LANDING,
  type LandingPageData,
  type LandingSection
} from "@/lib/constants";

/**
 * Halaman Hubungi Kami — SATU halaman berisi hero + seksi `kontak` dari
 * GET /public/landing: telepon/email/alamat/jam layanan, kanal sosial media,
 * peta (mapsEmbedUrl via safeUrl), dan form kontak DEMO (statis, tidak
 * mengirim API — komponen ContactForm). Semua CTA "Hubungi Kami" /
 * "Jadwalkan Kunjungan" di halaman landing lain menuju /kontak ini.
 * ISR 30s — konten berubah hanya via superadmin; fallback FALLBACK_LANDING
 * bila API offline. Berbagi LandingHeader/LandingFooter via layout (landing).
 */

export const revalidate = 30;

/** URL absolut /api/v1/public/landing untuk fetch server-side. */
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

function str(record: Record<string, unknown> | null | undefined, key: string): string {
  const v = record?.[key];
  return typeof v === "string" ? v : "";
}

export async function generateMetadata(): Promise<Metadata> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "kontak");
  return {
    title: `Hubungi Kami — ${APP_NAME}`,
    description:
      section?.subtitle ?? "Informasi kontak, alamat, jam layanan, dan kanal sosial media sekolah."
  };
}

export default async function KontakPage(): Promise<JSX.Element> {
  const landing = await getLanding();
  const kontak = findSection(landing.sections, "kontak");

  const kontakPhone = str(kontak?.extra, "phone");
  const kontakEmail = str(kontak?.extra, "email");
  const kontakAddress = str(kontak?.extra, "address");
  const kontakHours = str(kontak?.extra, "hours");
  const kontakWhatsapp = str(kontak?.extra, "whatsapp").replace(/[^0-9]/g, "");
  const kontakInstagram = safeUrl(str(kontak?.extra, "instagram"));
  const kontakFacebook = safeUrl(str(kontak?.extra, "facebook"));
  const kontakYoutube = safeUrl(str(kontak?.extra, "youtube"));
  const kontakMapsEmbed = safeUrl(str(kontak?.extra, "mapsEmbedUrl"));
  const kontakBody = kontak?.body?.trim() ? kontak.body : "";

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:py-20 lg:flex-row lg:items-center">
          <FadeInUp className="max-w-2xl flex-1">
            <Badge variant="primary" className="bg-white/15 text-white">
              Hubungi Kami
            </Badge>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
              {kontak?.title ?? "Hubungi Kami"}
            </h1>
            {kontak?.subtitle ? (
              <p className="mt-3 text-lg font-medium text-white/90">{kontak.subtitle}</p>
            ) : null}
            {kontakBody ? (
              <p className="mt-2 max-w-xl leading-relaxed text-white/90">{kontakBody}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              {kontakWhatsapp ? (
                <a
                  href={`https://wa.me/${kontakWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" variant="success">
                    Chat WhatsApp
                  </Button>
                </a>
              ) : null}
              <Link href="#form">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/60 bg-transparent text-white hover:bg-white/10"
                >
                  Kirim Pesan
                </Button>
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1} className="hidden shrink-0 lg:block">
            <img
              src="/landing/landing-about-contact.svg"
              alt=""
              className="h-44 w-44"
              loading="lazy"
            />
          </FadeInUp>
        </div>
      </section>

      {/* Info kontak + peta + form */}
      <section id="kontak" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <FadeInUp>
            <Card className="h-full border-brand-primary/20">
              <CardHeader>
                <CardTitle>Informasi Kontak</CardTitle>
                <CardDescription>Alamat, jam layanan, dan kanal sosial media</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <dl className="grid gap-3 text-muted-foreground sm:grid-cols-2">
                  {kontakAddress ? (
                    <div>
                      <dt className="font-semibold text-foreground">Alamat</dt>
                      <dd className="mt-0.5">{kontakAddress}</dd>
                    </div>
                  ) : null}
                  {kontakPhone ? (
                    <div>
                      <dt className="font-semibold text-foreground">Telepon</dt>
                      <dd className="mt-0.5">{kontakPhone}</dd>
                    </div>
                  ) : null}
                  {kontakEmail ? (
                    <div>
                      <dt className="font-semibold text-foreground">Email</dt>
                      <dd className="mt-0.5 break-all">{kontakEmail}</dd>
                    </div>
                  ) : null}
                  {kontakHours ? (
                    <div>
                      <dt className="font-semibold text-foreground">Jam layanan</dt>
                      <dd className="mt-0.5">{kontakHours}</dd>
                    </div>
                  ) : null}
                </dl>
                {kontakWhatsapp || kontakInstagram || kontakFacebook || kontakYoutube ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {kontakWhatsapp ? (
                      <a
                        href={`https://wa.me/${kontakWhatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {kontakInstagram ? (
                      <a
                        href={kontakInstagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        Instagram
                      </a>
                    ) : null}
                    {kontakFacebook ? (
                      <a
                        href={kontakFacebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        Facebook
                      </a>
                    ) : null}
                    {kontakYoutube ? (
                      <a
                        href={kontakYoutube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        YouTube
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {kontakMapsEmbed ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <iframe
                  src={kontakMapsEmbed}
                  title="Lokasi sekolah"
                  className="h-64 w-full border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}
          </FadeInUp>

          {/* Form kontak demo (statis, tidak mengirim API) */}
          <FadeInUp delay={0.1}>
            <Card id="form" className="h-full scroll-mt-20">
              <CardHeader>
                <CardTitle>Kirim Pesan</CardTitle>
                <CardDescription>
                  Formulir contoh (demo) — data tidak dikirim ke server.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </FadeInUp>
        </div>

        <div className="mt-12">
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
