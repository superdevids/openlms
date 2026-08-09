import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX } from "react";
import { Badge, Button } from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import { GaleriSection, type GaleriItem } from "@/components/landing/galeri-section";
import {
  API_BASE_FALLBACK,
  API_TIMEOUT_MS,
  APP_NAME,
  FALLBACK_LANDING,
  type LandingPageData,
  type LandingSection
} from "@/lib/constants";

/**
 * Halaman galeri — GET /public/landing (publik), section slug "galeri".
 * ISR 30s — konten berubah hanya via superadmin; fallback FALLBACK_LANDING.
 * Gambar CMS (/storage/...) bisa 404 → fallback placeholder lokal (galeri-section).
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

function formatTanggal(value: string): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "galeri");
  return {
    title: `${section?.title ?? "Galeri"} — ${APP_NAME}`,
    description: section?.subtitle ?? "Dokumentasi kegiatan dan momen sekolah."
  };
}

export default async function GaleriPage(): Promise<JSX.Element> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "galeri");
  const items: GaleriItem[] = extraOf(section, "images").map((g) => ({
    title: str(g, "title"),
    src: str(g, "src"),
    category: str(g, "category"),
    dateLabel: formatTanggal(str(g, "date"))
  }));

  return (
    <div>
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
            {section?.subtitle ? (
              <p className="mt-3 text-lg font-medium text-white/90">{section.subtitle}</p>
            ) : null}
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
          <GaleriSection items={items} />
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
