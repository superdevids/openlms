import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

import { Badge, Button } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { PrestasiGrid } from "@/components/landing/prestasi-grid";
import { APP_NAME } from "@/lib/constants";
import { getAchievements } from "@/lib/landing-pages";

/**
 * Halaman prestasi mandiri — GET /public/achievements (publik, cache 300s).
 * ISR 30s; fallback array kosong bila API mati atau tabel belum di-seed.
 */

export const revalidate = 30;

const LEVEL_RANK: Record<string, number> = {
  INTERNASIONAL: 4,
  NASIONAL: 3,
  PROVINSI: 2,
  KABUPATEN: 1,
  SEKOLAH: 0
};

function formatTanggal(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Prestasi — ${APP_NAME}`,
    description:
      "Capaian juara peserta didik dan guru sekolah di tingkat kabupaten hingga internasional."
  };
}

export default async function PrestasiPage(): Promise<JSX.Element> {
  const items = await getAchievements();

  const highlights = [...items]
    .sort(
      (a, b) =>
        (LEVEL_RANK[a.level.toUpperCase()] ?? -1) - (LEVEL_RANK[b.level.toUpperCase()] ?? -1)
    )
    .slice(0, 3);

  return (
    <div className="bg-background">
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
            <p className="mt-3 text-lg font-medium text-white/90">
              Kebanggaan warga sekolah dari tingkat kabupaten hingga internasional.
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
            <img src="/landing/landing-pre-hero.svg" alt="" className="h-44 w-44" />
          </FadeInUp>
        </div>
      </section>

      {/* Highlight 3 prestasi terbaik */}
      {highlights.length > 0 ? (
        <section className="border-b border-border bg-card py-8">
          <div className="mx-auto max-w-6xl px-4">
            <FadeInUp>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-secondary">
                Prestasi Terbaik
              </p>
            </FadeInUp>
            <StaggerContainer className="mt-4 grid gap-4 sm:grid-cols-3">
              {highlights.map((h) => {
                const tanggal = formatTanggal(h.date);
                return (
                  <StaggerItem key={h.id || h.title} className="h-full">
                    <div className="flex h-full flex-col rounded-xl border border-brand-primary/20 bg-background p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-success-700 px-2.5 py-0.5 text-xs font-medium text-white">
                          {h.level || "Umum"}
                        </span>
                        {tanggal ? (
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                            {tanggal}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 font-semibold text-foreground">{h.title}</p>
                      {h.studentName ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {h.studentName}
                          {h.extracurricularName ? ` • ${h.extracurricularName}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </StaggerItem>
                );
              })}
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
          <PrestasiGrid items={items} />
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
