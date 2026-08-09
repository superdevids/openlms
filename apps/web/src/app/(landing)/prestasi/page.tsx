import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX } from "react";
import { Badge, Button } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { PrestasiSection, type PrestasiItem } from "@/components/landing/prestasi-section";
import {
  API_BASE_FALLBACK,
  API_TIMEOUT_MS,
  APP_NAME,
  FALLBACK_LANDING,
  type LandingPageData,
  type LandingSection
} from "@/lib/constants";

/**
 * Halaman prestasi — GET /public/landing (publik), section slug "prestasi".
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

const LEVEL_RANK: Record<string, number> = {
  INTERNASIONAL: 4,
  NASIONAL: 3,
  PROVINSI: 2,
  KABUPATEN: 1,
  SEKOLAH: 0
};

export async function generateMetadata(): Promise<Metadata> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "prestasi");
  return {
    title: `${section?.title ?? "Prestasi"} — ${APP_NAME}`,
    description: section?.subtitle ?? "Capaian juara peserta didik dan guru sekolah."
  };
}

export default async function PrestasiPage(): Promise<JSX.Element> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "prestasi");
  const items: PrestasiItem[] = extraOf(section, "items").map((p) => ({
    title: str(p, "title"),
    level: str(p, "level"),
    year: str(p, "year"),
    field: str(p, "field"),
    coach: str(p, "coach"),
    description: str(p, "description")
  }));

  const highlights = [...items]
    .sort(
      (a, b) =>
        (LEVEL_RANK[a.level.toUpperCase()] ?? -1) - (LEVEL_RANK[b.level.toUpperCase()] ?? -1)
    )
    .slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:py-20 lg:flex-row lg:items-center">
          <FadeInUp className="max-w-2xl flex-1">
            <Badge variant="primary" className="bg-white/15 text-white">
              Prestasi
            </Badge>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">
              Prestasi Sekolah
            </h1>
            {section?.subtitle ? (
              <p className="mt-3 text-lg font-medium text-white/90">{section.subtitle}</p>
            ) : null}
          </FadeInUp>
          <FadeInUp delay={0.1} className="hidden shrink-0 lg:block">
            <img src="/landing/landing-pre-hero.svg" alt="" className="h-44 w-44" />
          </FadeInUp>
        </div>
      </section>

      {/* Highlight 2-3 prestasi terbaik */}
      {highlights.length > 0 ? (
        <section className="border-b border-border bg-card py-8">
          <div className="mx-auto max-w-6xl px-4">
            <FadeInUp>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-secondary">
                Prestasi Terbaik
              </p>
            </FadeInUp>
            <StaggerContainer className="mt-4 grid gap-4 sm:grid-cols-3">
              {highlights.map((h) => (
                <StaggerItem key={h.title} className="h-full">
                  <div className="flex h-full flex-col rounded-xl border border-brand-primary/20 bg-background p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-success-700 px-2.5 py-0.5 text-xs font-medium text-white">
                        {h.level || "Umum"}
                      </span>
                      {h.year ? (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {h.year}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-semibold text-foreground">{h.title}</p>
                    {h.field ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {h.field}
                        {h.coach ? ` • ${h.coach}` : ""}
                      </p>
                    ) : null}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      ) : null}

      {/* Semua prestasi + filter level */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <FadeInUp className="text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Semua Prestasi</h2>
          <p className="mt-2 text-base text-muted-foreground">
            Saring berdasarkan tingkat perlombaan.
          </p>
        </FadeInUp>
        <div className="mt-6">
          <PrestasiSection items={items} />
        </div>
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
