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
 * Data nyata dari tabel Prodi + pelengkap LandingContent (kompetensi, mitra
 * DUDI, prospek) via helper lib/landing-pages.ts. Bento grid asimetris:
 * 6 prodi (2 featured besar + 4 ringkas), rincian kompetensi via Accordion,
 * dan CTA PPDB. ISR 30s, fallback aman (array kosong → empty state).
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

/** Ilustrasi lokal per kode prodi — fallback null saat prodi baru belum digambar. */
const PROGRAM_IMG: Record<string, string> = {
  TKJ: "/landing/landing-prog-network.svg",
  RPL: "/landing/landing-prog-code.svg",
  TKR: "/landing/landing-prog-auto.svg",
  AKL: "/landing/landing-prog-finance.svg",
  MM: "/landing/landing-prog-media.svg",
  TSM: "/landing/landing-prog-motor.svg"
};

function programImg(code: string): string | null {
  return PROGRAM_IMG[code.toUpperCase()] ?? null;
}

/** Pola bento: kartu besar (col-span-4) berselang-seling dengan kartu ringkas. */
const BENTO_SPANS = [4, 2, 2, 4, 4, 2];

export const metadata: Metadata = {
  title: `Program Keahlian — ${APP_NAME}`,
  description: "Kompetensi keahlian yang diselenggarakan sekolah."
};

export default async function ProgramKeahlianPage(): Promise<JSX.Element> {
  const programs = await getPrograms();
  const hasKompetensi = programs.some((p) => strArr(p.kompetensi).length > 0);

  const mitraCount = new Set(programs.flatMap((p) => strArr(p.mitraDudi))).size;
  const kompetensiCount = programs.reduce((total, p) => total + strArr(p.kompetensi).length, 0);

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <img
          src="/landing/landing-hero-pattern.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-accent opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <StaggerContainer>
              <StaggerItem>
                <nav aria-label="Breadcrumb" className="text-sm text-white/70">
                  <Link href="/" className="transition-colors hover:text-white">
                    Beranda
                  </Link>
                  <span aria-hidden="true" className="mx-2">
                    /
                  </span>
                  <span className="text-white">Program Keahlian</span>
                </nav>
              </StaggerItem>
              <StaggerItem>
                <Badge variant="primary" className="mt-4 bg-white/15 text-white">
                  Kompetensi keahlian (SMK)
                </Badge>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
                  Program Keahlian
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
                  Sekolah menyelenggarakan program keahlian yang selaras dengan kebutuhan dunia
                  usaha dan dunia industri (DUDI). Setiap program dilengkapi kurikulum berbasis
                  industri, guru produktif, dan kemitraan magang.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/ppdb">
                    <Button
                      size="lg"
                      className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                    >
                      Daftar Sekarang
                    </Button>
                  </Link>
                  <Link href="/fasilitas">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/60 bg-transparent text-white hover:bg-white/10"
                    >
                      Lihat Fasilitas
                    </Button>
                  </Link>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-10 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
                    {programs.length} Program Keahlian
                  </span>
                  {mitraCount > 0 ? (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
                      {mitraCount} Mitra DUDI
                    </span>
                  ) : null}
                  {kompetensiCount > 0 ? (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
                      {kompetensiCount} Kompetensi Terpadu
                    </span>
                  ) : null}
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
          <FadeInUp className="relative">
            <img
              src="/landing/landing-prog-hero.svg"
              alt="Ilustrasi program keahlian: jaringan komputer, pemrograman, dan keterampilan industri"
              className="mx-auto w-full max-w-sm drop-shadow-2xl lg:max-w-md"
              loading="eager"
            />
          </FadeInUp>
        </div>
      </section>

      {/* Bento grid prodi */}
      {programs.length > 0 ? (
        <section id="program" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
          <FadeInUp>
            <Badge variant="primary">Program Keahlian</Badge>
            <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Pilih jalur kariermu
            </h2>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
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
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <FadeInUp>
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-800">
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
          className="scroll-mt-20 border-t border-border bg-card py-16 sm:py-20"
        >
          <FadeInUp className="mx-auto max-w-4xl px-4">
            <div className="text-center">
              <Badge variant="primary">Rincian</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                Kompetensi per program
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Perluas untuk melihat kompetensi, prospek karier, dan mitra DUDI tiap program.
              </p>
            </div>
            <div className="mt-10">
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
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-800">
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
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                              Kompetensi
                            </p>
                            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                              {kompetensi.map((k) => (
                                <li key={k} className="flex items-start gap-2 text-sm">
                                  <IconCheck
                                    className="mt-0.5 h-4 w-4 shrink-0 text-success-600"
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
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
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
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
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
            </div>
          </FadeInUp>
        </section>
      ) : null}

      {/* CTA */}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <FadeInUp className="relative overflow-hidden rounded-3xl bg-brand-primary text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-accent opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
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
                    className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                  >
                    Daftar Sekarang
                  </Button>
                </Link>
                <Link href="/ekstrakurikuler">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/60 bg-transparent text-white hover:bg-white/10"
                  >
                    Lihat Ekstrakurikuler
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <img
                src="/landing/landing-prog-hero.svg"
                alt=""
                aria-hidden="true"
                className="mx-auto w-full max-w-sm rounded-2xl drop-shadow-2xl"
                loading="lazy"
              />
            </div>
          </div>
        </FadeInUp>
      </div>
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
  const img = programImg(program.code);
  const kompetensi = strArr(program.kompetensi);
  const prospek = strArr(program.prospek);
  const mitra = strArr(program.mitraDudi);

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-xl">
      {img ? (
        <div className="relative overflow-hidden">
          <img
            src={img}
            alt=""
            aria-hidden="true"
            className={cn(
              "w-full object-cover transition-transform duration-300 group-hover:scale-105",
              featured ? "h-44 sm:h-52" : "h-32 sm:h-36"
            )}
            loading="lazy"
          />
          <span
            aria-hidden="true"
            className={cn(
              "absolute right-4 top-3 font-black text-white/40",
              featured ? "text-5xl" : "text-4xl"
            )}
          >
            {String(index).padStart(2, "0")}
          </span>
        </div>
      ) : (
        <div className="flex h-16 items-center gap-3 bg-primary-100/60 px-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
            <IconComp className="h-5 w-5" aria-hidden="true" />
          </span>
          <span aria-hidden="true" className="text-3xl font-black text-primary-800/30">
            {String(index).padStart(2, "0")}
          </span>
        </div>
      )}

      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {img ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
              <IconComp className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-lg font-bold leading-snug text-foreground">{title}</h3>
            {program.shortName && program.shortName !== title ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {program.shortName}
              </p>
            ) : null}
          </div>
        </div>
        {program.desc ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{program.desc}</p>
        ) : null}

        {kompetensi.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
              Kompetensi
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kompetensi.slice(0, featured ? kompetensi.length : 2).map((k) => (
                <Badge key={k} variant="neutral">
                  {k}
                </Badge>
              ))}
              {!featured && kompetensi.length > 2 ? (
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  +{kompetensi.length - 2}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {prospek.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
              Prospek karier
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prospek.slice(0, featured ? prospek.length : 2).map((pr) => (
                <span
                  key={pr}
                  className="rounded-full border border-brand-primary/30 bg-brand-primary/5 px-3 py-1 text-xs font-medium text-foreground"
                >
                  {pr}
                </span>
              ))}
              {!featured && prospek.length > 2 ? (
                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  +{prospek.length - 2}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {mitra.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
            <IconBriefcase className="h-3.5 w-3.5 shrink-0 text-brand-primary" aria-hidden="true" />
            <span className="font-medium text-foreground">Mitra:</span>
            <span className={cn(!featured && "line-clamp-1")}>
              {mitra.slice(0, featured ? mitra.length : 3).join(" · ")}
              {!featured && mitra.length > 3 ? ` +${mitra.length - 3}` : ""}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
