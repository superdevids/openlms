import type { Metadata } from "next";
import type { JSX } from "react";
import { cache } from "react";
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
import {
  API_BASE_FALLBACK,
  API_TIMEOUT_MS,
  APP_NAME,
  FALLBACK_LANDING,
  type LandingPageData,
  type LandingSection
} from "@/lib/constants";

/**
 * Program Keahlian — GET /public/landing (publik), section "program-keahlian".
 * Bento grid asimetris: 6 prodi (2 featured besar + 4 ringkas), rincian
 * kompetensi per prodi via Accordion, dan CTA PPDB. ISR 30s.
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

/** Aksesor aman untuk `extra` per slug. */
function extraOf(section: LandingSection | undefined, key: string): Array<Record<string, unknown>> {
  const value = section?.extra?.[key];
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function str(record: Record<string, unknown> | null | undefined, key: string): string {
  const v = record?.[key];
  return typeof v === "string" ? v : "";
}

/** Aksesor array-of-string yang aman (kompetensi / prospek / mitra). */
function strArr(record: Record<string, unknown> | null | undefined, key: string): string[] {
  const v = record?.[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/** Peta ikon dari nilai `icon` di data landing (fallback IconBook). */
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

function iconFor(name: string): (props: IconProps) => JSX.Element {
  return ICON_MAP[name] ?? IconBook;
}

/** Ilustrasi lokal per nama prodi — fallback null saat prodi baru belum digambar. */
const PROGRAM_IMG: Record<string, string> = {
  "Teknik Komputer & Jaringan": "/landing/landing-prog-network.svg",
  "Rekayasa Perangkat Lunak": "/landing/landing-prog-code.svg",
  "Teknik Kendaraan Ringan": "/landing/landing-prog-auto.svg",
  "Akuntansi & Keuangan": "/landing/landing-prog-finance.svg",
  Multimedia: "/landing/landing-prog-media.svg",
  "Teknik Sepeda Motor": "/landing/landing-prog-motor.svg"
};

function programImg(title: string): string | null {
  return PROGRAM_IMG[title] ?? null;
}

/** Pola bento: kartu besar (col-span-4) berselang-seling dengan kartu ringkas. */
const BENTO_SPANS = [4, 2, 2, 4, 4, 2];

export async function generateMetadata(): Promise<Metadata> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "program-keahlian");
  return {
    title: `${section?.title ?? "Program Keahlian"} — ${APP_NAME}`,
    description: section?.subtitle ?? "Kompetensi keahlian yang diselenggarakan sekolah."
  };
}

export default async function ProgramKeahlianPage(): Promise<JSX.Element> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "program-keahlian");
  const programs = extraOf(section, "programs");
  const ctaLink = section?.linkUrl ?? "/ppdb";
  const ctaLabel = section?.linkLabel ?? "Daftar Sekarang";

  const mitraCount = new Set(programs.flatMap((p) => strArr(p, "mitra_dudi"))).size;
  const kompetensiCount = programs.reduce((total, p) => total + strArr(p, "kompetensi").length, 0);

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
                  <span className="text-white">{section?.title ?? "Program Keahlian"}</span>
                </nav>
              </StaggerItem>
              <StaggerItem>
                {section?.subtitle ? (
                  <Badge variant="primary" className="mt-4 bg-white/15 text-white">
                    {section.subtitle}
                  </Badge>
                ) : null}
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
                  {section?.title ?? "Program Keahlian"}
                </h1>
              </StaggerItem>
              {section?.body ? (
                <StaggerItem>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
                    {section.body}
                  </p>
                </StaggerItem>
              ) : null}
              <StaggerItem>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={ctaLink}>
                    <Button
                      size="lg"
                      className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                    >
                      {ctaLabel}
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
                  key={str(p, "title")}
                  className={cn("h-full", span === 4 ? "lg:col-span-4" : "lg:col-span-2")}
                >
                  <ProgramCard program={p} index={i + 1} featured={span === 4} />
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </section>
      ) : null}

      {/* Rincian kompetensi per prodi */}
      {programs.length > 0 ? (
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
                  const IconComp = iconFor(str(p, "icon"));
                  const kompetensi = strArr(p, "kompetensi");
                  const prospek = strArr(p, "prospek");
                  const mitra = strArr(p, "mitra_dudi");
                  return (
                    <AccordionItem
                      key={str(p, "title")}
                      title={
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-800">
                            <IconComp className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="truncate">{str(p, "title")}</span>
                        </span>
                      }
                    >
                      <div className="space-y-5">
                        <p className="text-sm text-muted-foreground">{str(p, "desc")}</p>
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
                <Link href={ctaLink}>
                  <Button
                    size="lg"
                    className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                  >
                    {ctaLabel}
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
  program: Record<string, unknown>;
  index: number;
  featured: boolean;
}): JSX.Element {
  const title = str(program, "title");
  const IconComp = iconFor(str(program, "icon"));
  const img = programImg(title);
  const kompetensi = strArr(program, "kompetensi");
  const prospek = strArr(program, "prospek");
  const mitra = strArr(program, "mitra_dudi");

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
          <h3 className="text-lg font-bold leading-snug text-foreground">{title}</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{str(program, "desc")}</p>

        {kompetensi.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
              Kompetensi
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kompetensi.map((k) => (
                <Badge key={k} variant="neutral">
                  {k}
                </Badge>
              ))}
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
