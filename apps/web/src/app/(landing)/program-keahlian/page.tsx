import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Card,
  CardContent,
  cn,
  IconBook,
  IconBriefcase,
  IconCamera,
  IconChart,
  IconCheck,
  IconDatabase,
  IconFile,
  IconFlag,
  IconGrade,
  IconRefresh,
  IconRocket,
  IconSettings,
  IconWallet,
  type IconProps
} from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { getPrograms, type ProgramPageItem } from "@/lib/landing-pages";
import { APP_NAME } from "@/lib/constants";

/**
 * Program Keahlian — GET /public/programs (publik, per-halaman).
 * Redesign v2 (docs/landing-design-v2.md E.4): PageHero playful (play-program +
 * blob + badge), StatStrip angka nyata, bento grid CardPlay premium (icon chip,
 * deskripsi, ChipGroup kompetensi, prospek, mitra DUDI), Accordion "Kompetensi
 * per program", dan CTA PPDB. Data nyata via helper lib/landing-pages.ts.
 * ISR 30s, fallback aman (array kosong → empty state). Token landing v2
 * (--surface-soft, --gradient-*, --shadow-*, --playful-*) dipakai via var()
 * agar tidak error — dideklarasikan di globals.css oleh task token terpisah.
 */

export const revalidate = 30;

/** Aksesor array-of-string yang aman. */
function strArr(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

/** Peta ikon dari nilai `icon` di data program (fallback IconBook). */
const ICON_MAP: Record<string, (props: IconProps) => JSX.Element> = {
  database: IconDatabase,
  file: IconFile,
  settings: IconSettings,
  wallet: IconWallet,
  camera: IconCamera,
  chart: IconChart,
  flag: IconFlag,
  rocket: IconRocket,
  grade: IconGrade,
  book: IconBook,
  refresh: IconRefresh
};

function iconFor(name: string | null | undefined): (props: IconProps) => JSX.Element {
  return (name ? ICON_MAP[name] : undefined) ?? IconBook;
}

/** Pola bento: kartu besar (col-span-4) berselang-seling dengan kartu ringkas. */
const BENTO_SPANS = [4, 2, 2, 4, 4, 2];

/** Gradient aksen strip atas kartu — diputar per kartu (LP3: maks 2 aksen/blok). */
const STRIP_GRADIENTS = [
  "var(--gradient-indigo)",
  "var(--gradient-pink)",
  "var(--gradient-teal)",
  "var(--gradient-amber)"
];

export const metadata: Metadata = {
  title: `Program Keahlian — ${APP_NAME}`,
  description: "Kompetensi keahlian yang diselenggarakan sekolah."
};

export default async function ProgramKeahlianPage(): Promise<JSX.Element> {
  const programs = await getPrograms();
  const hasKompetensi = programs.some((p) => strArr(p.kompetensi).length > 0);

  const mitraCount = new Set(programs.flatMap((p) => strArr(p.mitraDudi))).size;
  const kompetensiCount = programs.reduce((total, p) => total + strArr(p.kompetensi).length, 0);
  const prospekCount = new Set(programs.flatMap((p) => strArr(p.prospek))).size;

  const stats: Array<{ value: string; label: string }> = [
    { value: String(programs.length), label: "Program Keahlian" },
    ...(kompetensiCount > 0
      ? [{ value: String(kompetensiCount), label: "Kompetensi Terpadu" }]
      : []),
    ...(mitraCount > 0 ? [{ value: String(mitraCount), label: "Mitra DUDI" }] : []),
    ...(prospekCount > 0 ? [{ value: String(prospekCount), label: "Prospek Karier" }] : [])
  ];

  return (
    <div className="bg-[var(--surface-soft)]">
      {/* Hero playful */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero-soft)" }}
      >
        <img
          src="/landing/playful/play-blob-1.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 opacity-60"
        />
        <img
          src="/landing/playful/play-blob-3.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 opacity-50"
        />
        <img
          src="/landing/playful/play-spark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-12 h-10 w-10 opacity-80"
        />
        <img
          src="/landing/playful/play-grid.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 left-8 h-24 w-24 opacity-[0.12]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <FadeInUp>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-indigo-text)]/30 bg-[var(--accent-indigo-text)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--accent-indigo-text)]">
                <img
                  src="/landing/playful/play-star.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                Kompetensi keahlian (SMK)
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
                Program Keahlian
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                Sekolah menyelenggarakan program keahlian yang selaras dengan kebutuhan dunia usaha
                dan dunia industri (DUDI). Setiap program dilengkapi kurikulum berbasis industri,
                guru produktif, dan kemitraan magang.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/ppdb">
                  <Button
                    size="lg"
                    style={{ backgroundImage: "var(--gradient-hero)" }}
                    className="rounded-full text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
                  >
                    Daftar Sekarang
                  </Button>
                </Link>
                <Link href="/fasilitas">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Lihat Fasilitas
                  </Button>
                </Link>
              </div>
              {programs.length > 0 ? (
                <div className="mt-10 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur">
                    {programs.length} Program Keahlian
                  </span>
                  {mitraCount > 0 ? (
                    <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur">
                      {mitraCount} Mitra DUDI
                    </span>
                  ) : null}
                  {kompetensiCount > 0 ? (
                    <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur">
                      {kompetensiCount} Kompetensi Terpadu
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="relative">
              <img
                src="/landing/playful/play-program.svg"
                alt="Ilustrasi program keahlian: pemrograman, otomotif, dan keterampilan industri"
                role="img"
                className="mx-auto w-full max-w-md"
                loading="eager"
              />
              <img
                src="/landing/playful/play-star.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -left-2 top-8 h-8 w-8 opacity-80"
              />
              <img
                src="/landing/playful/play-dots.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-4 right-2 h-20 w-20 opacity-40"
              />
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* StatStrip — angka nyata dari data program */}
      {programs.length > 0 ? (
        <section className="bg-[var(--surface-soft-2)]">
          <StaggerContainer className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-14 md:grid-cols-4">
            {stats.map((s) => (
              <StaggerItem key={s.label} className="text-center">
                <p
                  className="bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl"
                  style={{ backgroundImage: "var(--gradient-text)" }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{s.label}</p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      ) : null}

      {/* Bento grid prodi */}
      {programs.length > 0 ? (
        <section id="program" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
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
              Program Keahlian
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Pilih jalur kariermu
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Setiap program dibekali kurikulum berbasis industri, kompetensi terukur, dan kemitraan
              magang bersama dunia usaha dan dunia industri (DUDI).
            </p>
          </FadeInUp>
          <StaggerContainer className="mt-10 grid gap-5 lg:grid-cols-6">
            {programs.map((p, i) => {
              const span = BENTO_SPANS[i % BENTO_SPANS.length];
              return (
                <StaggerItem
                  key={p.id}
                  className={cn("h-full", span === 4 ? "lg:col-span-4" : "lg:col-span-2")}
                >
                  <ProgramCard program={p} index={i + 1} featured={span === 4} />
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <FadeInUp>
            <Card className="rounded-3xl border-dashed shadow-[var(--shadow-soft)]">
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                  style={{ backgroundImage: "var(--gradient-indigo)" }}
                >
                  <IconBook className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="text-base font-semibold text-foreground">
                  Data program keahlian belum tersedia
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Operator sekolah dapat mengisinya melalui menu data program keahlian di aplikasi.
                  Silakan kembali lagi nanti.
                </p>
              </CardContent>
            </Card>
          </FadeInUp>
        </section>
      )}

      {/* Rincian kompetensi per prodi */}
      {hasKompetensi ? (
        <section
          id="rincian-kompetensi"
          className="scroll-mt-20 bg-[var(--surface-soft-2)] py-16 md:py-20"
        >
          <div className="mx-auto max-w-4xl px-4">
            <FadeInUp className="text-center">
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
                Rincian
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Kompetensi per program
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Perluas untuk melihat kompetensi, prospek karier, dan mitra DUDI tiap program.
              </p>
            </FadeInUp>
            <FadeInUp className="mt-10">
              <Accordion>
                {programs.map((p) => {
                  const IconComp = iconFor(p.icon);
                  const kompetensi = strArr(p.kompetensi);
                  const prospek = strArr(p.prospek);
                  const mitra = strArr(p.mitraDudi);
                  const title = p.name || p.shortName;
                  return (
                    <AccordionItem
                      key={p.id}
                      title={
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                            style={{ backgroundImage: "var(--gradient-indigo)" }}
                          >
                            <IconComp className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="truncate">{title}</span>
                          {p.shortName && p.shortName !== title ? (
                            <Badge variant="neutral" className="shrink-0">
                              {p.shortName}
                            </Badge>
                          ) : null}
                        </span>
                      }
                    >
                      <div className="space-y-5">
                        {p.desc ? <p className="text-sm text-muted-foreground">{p.desc}</p> : null}
                        {kompetensi.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-indigo-text)]">
                              Kompetensi
                            </p>
                            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                              {kompetensi.map((k) => (
                                <li key={k} className="flex items-start gap-2 text-sm">
                                  <IconCheck
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--playful-teal)]"
                                    aria-hidden="true"
                                  />
                                  <span className="text-foreground">{k}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {prospek.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-indigo-text)]">
                              Prospek karier
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {prospek.map((pr) => (
                                <span
                                  key={pr}
                                  className="rounded-full border border-brand-primary/30 bg-brand-primary/5 px-3 py-1 text-xs font-medium text-foreground"
                                >
                                  {pr}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {mitra.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-indigo-text)]">
                              Mitra DUDI
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {mitra.map((m) => (
                                <Badge key={m} variant="neutral">
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </FadeInUp>
          </div>
        </section>
      ) : null}

      {/* CTA PPDB */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <FadeInUp>
          <div
            className="relative overflow-hidden rounded-3xl text-white shadow-[var(--shadow-lift)]"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <img
              src="/landing/playful/play-blob-4.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-40"
            />
            <img
              src="/landing/playful/play-blob-2.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 opacity-30"
            />
            <img
              src="/landing/playful/play-star.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-10 top-8 h-8 w-8 opacity-70"
            />
            <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <Badge variant="primary" className="bg-white/15 text-white">
                  PPDB 2026/2027
                </Badge>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                  Siap memilih program keahlian?
                </h2>
                <p className="mt-3 max-w-xl text-white/90">
                  Daftar melalui portal PPDB resmi sekolah dan raih masa depanmu bersama program
                  keahlian yang selaras dengan kebutuhan industri.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/ppdb">
                    <Button
                      size="lg"
                      className="rounded-full bg-white text-brand-primary hover:bg-white/90"
                    >
                      Daftar Sekarang
                    </Button>
                  </Link>
                  <Link href="/ekstrakurikuler">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/60 bg-transparent text-white hover:bg-white/10"
                    >
                      Lihat Ekstrakurikuler
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <img
                  src="/landing/playful/play-ppdb.svg"
                  alt=""
                  aria-hidden="true"
                  className="mx-auto w-full max-w-sm"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </FadeInUp>
      </section>
    </div>
  );
}

function ProgramCard({
  program,
  index,
  featured
}: {
  program: ProgramPageItem;
  index: number;
  featured: boolean;
}): JSX.Element {
  const title = program.name || program.shortName;
  const IconComp = iconFor(program.icon);
  const kompetensi = strArr(program.kompetensi);
  const prospek = strArr(program.prospek);
  const mitra = strArr(program.mitraDudi);
  const visibleKompetensi = featured ? kompetensi : kompetensi.slice(0, 2);
  const visibleProspek = featured ? prospek : prospek.slice(0, 2);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundImage: STRIP_GRADIENTS[(index - 1) % STRIP_GRADIENTS.length] }}
      />
      <CardContent className="relative flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
            style={{ backgroundImage: "var(--gradient-indigo)" }}
          >
            <IconComp className="h-6 w-6" aria-hidden="true" />
          </span>
          <span
            aria-hidden="true"
            className="text-3xl font-black text-[var(--playful-rose)] opacity-30"
          >
            {String(index).padStart(2, "0")}
          </span>
        </div>
        <h3 className="mt-4 text-xl font-bold text-foreground">{title}</h3>
        {program.shortName && program.shortName !== title ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {program.shortName}
          </p>
        ) : null}
        {program.desc ? (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {program.desc}
          </p>
        ) : null}

        {kompetensi.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-indigo-text)]">
              Kompetensi
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleKompetensi.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
                >
                  <IconCheck className="h-3 w-3 text-[var(--playful-teal)]" aria-hidden="true" />
                  {k}
                </span>
              ))}
              {!featured && kompetensi.length > 2 ? (
                <span className="rounded-full border border-border bg-[var(--surface-soft-2)] px-3 py-1 text-xs font-medium text-muted-foreground">
                  +{kompetensi.length - 2}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {prospek.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-indigo-text)]">
              Prospek karier
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visibleProspek.map((pr) => (
                <span
                  key={pr}
                  className="rounded-full border border-brand-primary/30 bg-brand-primary/5 px-3 py-1 text-xs font-medium text-foreground"
                >
                  {pr}
                </span>
              ))}
              {!featured && prospek.length > 2 ? (
                <span className="rounded-full border border-border bg-[var(--surface-soft-2)] px-3 py-1 text-xs font-medium text-muted-foreground">
                  +{prospek.length - 2}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {mitra.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
            <IconBriefcase
              className="h-3.5 w-3.5 shrink-0 text-[var(--playful-indigo)]"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">Mitra:</span>
            <span className={cn(!featured && "line-clamp-1")}>
              {mitra.slice(0, featured ? mitra.length : 3).join(" · ")}
              {!featured && mitra.length > 3 ? ` +${mitra.length - 3}` : ""}
            </span>
          </div>
        ) : null}

        <Link
          href="#rincian-kompetensi"
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-primary transition-all hover:gap-2"
        >
          Selengkapnya <span aria-hidden="true">→</span>
        </Link>
      </CardContent>
    </Card>
  );
}
