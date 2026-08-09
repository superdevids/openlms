import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX } from "react";
import { Badge, Button, Card, CardContent } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import {
  API_BASE_FALLBACK,
  API_TIMEOUT_MS,
  APP_NAME,
  FALLBACK_LANDING,
  type LandingPageData,
  type LandingSection
} from "@/lib/constants";

/**
 * Halaman testimoni — GET /public/landing (publik), section slug "testimoni".
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

/** Inisial nama (2 huruf) untuk avatar placeholder. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${last}`.toUpperCase();
}

export async function generateMetadata(): Promise<Metadata> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "testimoni");
  return {
    title: `${section?.title ?? "Testimoni"} — ${APP_NAME}`,
    description: section?.subtitle ?? "Pengalaman orang tua, siswa, dan alumni sekolah."
  };
}

export default async function TestimoniPage(): Promise<JSX.Element> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "testimoni");
  const items = extraOf(section, "items");

  return (
    <div>
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

        {items.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Belum ada testimoni yang diterbitkan. Silakan kembali lagi nanti.
            </CardContent>
          </Card>
        ) : (
          <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <StaggerItem key={str(t, "name")} className="h-full">
                <Card className="h-full border-border">
                  <CardContent className="flex h-full flex-col p-5">
                    <span className="text-3xl leading-none text-brand-primary" aria-hidden="true">
                      &ldquo;
                    </span>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {str(t, "text")}
                    </p>
                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-accent text-sm font-bold text-white"
                        aria-hidden="true"
                      >
                        {initials(str(t, "name"))}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{str(t, "name")}</p>
                        <p className="truncate text-sm text-muted-foreground">{str(t, "role")}</p>
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
