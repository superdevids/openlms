import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";

import { Button } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { AchievementBadge, PrestasiGrid } from "@/components/landing/prestasi-grid";
import { APP_NAME } from "@/lib/constants";
import { getAchievements } from "@/lib/landing-pages";

/**
 * Halaman prestasi mandiri — GET /public/achievements (publik, cache 300s).
 * ISR 30s; fallback array kosong bila API mati atau tabel belum di-seed.
 * Desain landing v2 (docs/landing-design-v2.md E.7): hero gelap gradient,
 * highlight 3 prestasi terbaik (BadgeLevel), grid CardPlay + filter level.
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
    <div className="bg-[var(--surface-soft)]">
      {/* PageHero — varian gelap (bg-gradient-hero) */}
      <section
        className="relative overflow-hidden text-white"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <img
          src="/landing/playful/play-blob-1.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 opacity-60"
        />
        <img
          src="/landing/playful/play-spark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-10 h-10 w-10 opacity-80"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <FadeInUp className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              <img
                src="/landing/playful/play-star.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
              Prestasi
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              Prestasi Sekolah
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/90 md:text-lg">
              Kebanggaan warga sekolah dari tingkat kabupaten hingga internasional.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
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
          </FadeInUp>
          <FadeInUp delay={0.15} className="relative">
            <img
              src="/landing/playful/play-achievement.svg"
              alt="Ilustrasi prestasi dan penghargaan"
              role="img"
              className="w-full max-w-md"
            />
          </FadeInUp>
        </div>
      </section>

      {/* Strip 3 prestasi terbaik — BadgeLevel berwarna */}
      {highlights.length > 0 ? (
        <section className="border-b border-border bg-[var(--surface-soft-2)] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
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
                Prestasi Terbaik
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Capaian yang Membanggakan
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Tiga pencapaian tertinggi warga sekolah kami.
              </p>
            </FadeInUp>
            <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-3">
              {highlights.map((h) => {
                const tanggal = formatTanggal(h.date);
                return (
                  <StaggerItem key={h.id || h.title} className="h-full">
                    <article className="relative h-full overflow-hidden rounded-[1.5rem] bg-card p-6 shadow-[0_8px_30px_rgba(67,56,202,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(67,56,202,0.16)]">
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-primary to-cyan-400"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <AchievementBadge level={h.level || "Umum"} />
                        {tanggal ? (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {tanggal}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-foreground">{h.title}</h3>
                      {h.studentName ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {h.studentName}
                          {h.extracurricularName ? ` • ${h.extracurricularName}` : ""}
                        </p>
                      ) : null}
                    </article>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      ) : null}

      {/* Semua prestasi + filter level */}
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
            Prestasi
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Semua Prestasi</h2>
          <p className="mt-4 text-base text-muted-foreground">
            Saring berdasarkan tingkat perlombaan.
          </p>
        </FadeInUp>
        <div className="mt-6">
          <PrestasiGrid items={items} />
        </div>
      </section>

      {/* CTA — bangga alumni / ikut kompetisi */}
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
              src="/landing/playful/play-spark.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-8 top-8 h-8 w-8 opacity-60"
            />
            <div className="relative flex flex-col items-center gap-6 px-6 py-12 text-center md:py-16">
              <img
                src="/landing/playful/play-achievement.svg"
                alt=""
                aria-hidden="true"
                className="h-20 w-24 opacity-90"
              />
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Bangga dengan capaian ini?
              </h2>
              <p className="max-w-xl text-base text-white/90">
                Bergabunglah dan raih prestasi bersama kami di kompetisi berikutnya.
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
