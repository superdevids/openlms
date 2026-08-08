import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Accordion,
  AccordionItem
} from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { brandingApiUrl, type BrandingView } from "@/lib/api-client";
import {
  API_BASE_FALLBACK,
  API_TIMEOUT_MS,
  APP_NAME,
  FALLBACK_BRANDING,
  FALLBACK_LANDING,
  type LandingPageData,
  type LandingSection
} from "@/lib/constants";

/**
 * Halaman depan sekolah — konten dari GET /public/landing (API).
 * Section: hero, statistik, sambutan-kepsek, tentang, visi-misi, piagam,
 * struktur-organisasi, program-keahlian, ekstrakurikuler, prestasi, agenda,
 * fasilitas, galeri, testimoni, faq, ppdb-cta, kontak + berita.
 * ISR 30s — konten berubah hanya via superadmin; halaman publik cukup
 * di-revalidate berkala (fallback default bila API offline).
 */

export const revalidate = 30;

/** URL absolut /api/v1/public/landing untuk fetch server-side. */
function landingApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? API_BASE_FALLBACK).replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) return `${base}${path}`;
  return `${base}/api/v1${path}`;
}

const getBranding = cache(async (): Promise<BrandingView> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetch(brandingApiUrl(), {
        next: { revalidate: 30 },
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`branding ${res.status}`);
      return (await res.json()) as BrandingView;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return FALLBACK_BRANDING;
  }
});

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

function formatTanggal(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}

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

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return {
    title: `${b.appName ?? APP_NAME} — Website Resmi Sekolah`,
    description: b.tagline ?? "LMS & SIS Sekolah"
  };
}

export default async function HomePage(): Promise<JSX.Element> {
  const [branding, landing] = await Promise.all([getBranding(), getLanding()]);
  const hero = findSection(landing.sections, "hero");
  const statistik = findSection(landing.sections, "statistik");
  const sambutan = findSection(landing.sections, "sambutan-kepsek");
  const tentang = findSection(landing.sections, "tentang");
  const visiMisi = findSection(landing.sections, "visi-misi");
  const piagam =
    findSection(landing.sections, "piagam") ?? findSection(landing.sections, "visi-misi");
  const struktur = findSection(landing.sections, "struktur-organisasi");
  const program = findSection(landing.sections, "program-keahlian");
  const ekskul = findSection(landing.sections, "ekstrakurikuler");
  const prestasi = findSection(landing.sections, "prestasi");
  const agenda = findSection(landing.sections, "agenda");
  const fasilitas = findSection(landing.sections, "fasilitas");
  const galeri = findSection(landing.sections, "galeri");
  const testimoni = findSection(landing.sections, "testimoni");
  const faq = findSection(landing.sections, "faq");
  const ppdbCta = findSection(landing.sections, "ppdb-cta");
  const kontak = findSection(landing.sections, "kontak");
  const berita = landing.berita.slice(0, 6);

  const heroStats = extraOf(hero, "stats");
  const statistikStats = extraOf(statistik, "stats");
  const tentangFeatures = extraOf(tentang, "features");
  const strukturGroups = extraOf(struktur, "groups");
  const programs = extraOf(program, "programs");
  const ekskulItems = extraOf(ekskul, "items");
  const prestasiItems = extraOf(prestasi, "items");
  const agendaItems = extraOf(agenda, "items");
  const fasilitasItems = extraOf(fasilitas, "items");
  const galeriImages = extraOf(galeri, "images");
  const testimoniItems = extraOf(testimoni, "items");
  const faqItems = extraOf(faq, "faq");
  const ppdbJalur = Array.isArray(ppdbCta?.extra?.jalur) ? (ppdbCta.extra.jalur as string[]) : [];
  const ppdbInfo = extraOf(ppdbCta, "info");
  const misi = Array.isArray(visiMisi?.extra?.misi) ? (visiMisi.extra.misi as string[]) : [];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader branding={branding} />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-primary text-white">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <StaggerContainer className="max-w-2xl">
              {hero?.subtitle ? (
                <StaggerItem>
                  <Badge variant="primary" className="mb-4 bg-white/15 text-white">
                    {hero.subtitle}
                  </Badge>
                </StaggerItem>
              ) : null}
              <StaggerItem>
                <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                  {branding.appName}
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-3 text-lg font-medium text-white/90">
                  {branding.tagline ?? hero?.title ?? "LMS & SIS Sekolah"}
                </p>
              </StaggerItem>
              {hero?.body ? (
                <StaggerItem>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85">
                    {hero.body}
                  </p>
                </StaggerItem>
              ) : null}
              <StaggerItem>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/ppdb">
                    <Button
                      size="lg"
                      className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                    >
                      {hero?.linkLabel ?? "Daftar PPDB"}
                    </Button>
                  </Link>
                  <Link href="/berita">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/60 bg-transparent text-white hover:bg-white/10"
                    >
                      Lihat Berita
                    </Button>
                  </Link>
                </div>
              </StaggerItem>
            </StaggerContainer>

            {/* Stats strip */}
            {heroStats.length > 0 ? (
              <FadeInUp className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {heroStats.map((s) => (
                  <div
                    key={str(s, "label")}
                    className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur"
                  >
                    <p className="text-2xl font-extrabold">{str(s, "value")}</p>
                    <p className="mt-1 text-sm text-white/85">{str(s, "label")}</p>
                  </div>
                ))}
              </FadeInUp>
            ) : null}
          </div>
        </section>

        {/* Statistik */}
        {statistik && statistikStats.length > 0 ? (
          <section id="statistik" className="border-b border-border bg-card py-14">
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <Badge variant="primary">Statistik</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">{statistik.title}</h2>
                {statistik.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {statistik.subtitle}
                  </p>
                ) : null}
              </div>
              <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {statistikStats.map((s) => (
                  <StaggerItem key={str(s, "label")} className="h-full">
                    <Card className="h-full border-border text-center">
                      <CardContent className="p-6">
                        <p className="text-3xl font-extrabold text-brand-primary">
                          {str(s, "value")}
                        </p>
                        <p className="mt-2 font-semibold text-foreground">{str(s, "label")}</p>
                        {str(s, "desc") ? (
                          <p className="mt-1 text-sm text-muted-foreground">{str(s, "desc")}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeInUp>
          </section>
        ) : null}

        {/* Sambutan Kepala Sekolah */}
        {sambutan ? (
          <section id="sambutan" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <Badge variant="primary">Sambutan</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">{sambutan.title}</h2>
                {sambutan.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {sambutan.subtitle}
                  </p>
                ) : null}
                <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
                  {sambutan.body}
                </p>
                {str(sambutan.extra, "name") ? (
                  <div className="mt-6 rounded-lg border border-border bg-card p-4">
                    <p className="font-semibold text-foreground">{str(sambutan.extra, "name")}</p>
                    <p className="text-sm text-muted-foreground">
                      {str(sambutan.extra, "position")}
                    </p>
                  </div>
                ) : null}
              </div>
              <Card className="border-brand-primary/20 bg-card">
                <CardHeader>
                  <CardTitle className="text-brand-secondary">Mengapa memilih kami?</CardTitle>
                  <CardDescription>Nilai utama sekolah kami.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(tentangFeatures.length > 0
                    ? tentangFeatures
                    : [
                        {
                          title: "Pembelajaran modern",
                          desc: "Kurikulum aktif, kreatif, dan menyenangkan."
                        },
                        {
                          title: "Teknologi terpadu",
                          desc: "LMS & SIS dalam satu platform digital."
                        },
                        {
                          title: "Karakter unggul",
                          desc: "Pembiasaan positif dan penguatan budi pekerti."
                        }
                      ]
                  ).map((f) => (
                    <FeatureRow
                      key={str(f, "title")}
                      title={str(f, "title")}
                      desc={str(f, "desc")}
                    />
                  ))}
                </CardContent>
              </Card>
            </FadeInUp>
          </section>
        ) : null}

        {/* Tentang */}
        {tentang ? (
          <section id="tentang" className="scroll-mt-20 border-t border-border bg-background py-16">
            <FadeInUp className="mx-auto max-w-4xl px-4">
              <div className="text-center">
                <Badge variant="primary">Tentang</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">{tentang.title}</h2>
                {tentang.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {tentang.subtitle}
                  </p>
                ) : null}
              </div>
              <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-center leading-relaxed text-muted-foreground">
                {tentang.body}
              </p>
            </FadeInUp>
          </section>
        ) : null}

        {/* Visi & Misi */}
        {visiMisi || piagam ? (
          <section id="visi-misi" className="scroll-mt-20 bg-brand-secondary py-16 text-white">
            <FadeInUp className="mx-auto max-w-5xl px-4">
              <Badge variant="primary" className="bg-white/15 text-white">
                Visi &amp; Misi
              </Badge>
              <h2 className="mt-3 text-3xl font-bold">{(visiMisi ?? piagam)?.title}</h2>
              {(visiMisi ?? piagam)?.subtitle ? (
                <p className="mt-2 text-base font-medium text-white/85">
                  {(visiMisi ?? piagam)?.subtitle}
                </p>
              ) : null}
              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {typeof visiMisi?.extra?.visi === "string" ? (
                  <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
                    <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                      Visi
                    </p>
                    <p className="mt-2 leading-relaxed text-white/95">
                      {visiMisi.extra.visi as string}
                    </p>
                  </div>
                ) : null}
                {misi.length > 0 ? (
                  <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
                    <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                      Misi
                    </p>
                    <ul className="mt-2 space-y-2">
                      {misi.map((m, i) => (
                        <li key={i} className="flex gap-2 text-white/95">
                          <span className="font-bold">{i + 1}.</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </FadeInUp>
          </section>
        ) : null}

        {/* Piagam */}
        {piagam && !visiMisi ? (
          <section id="piagam" className="scroll-mt-20 bg-brand-secondary py-16 text-white">
            <FadeInUp className="mx-auto max-w-4xl px-4">
              <Badge variant="primary" className="bg-white/15 text-white">
                Piagam
              </Badge>
              <h2 className="mt-3 text-3xl font-bold">{piagam.title}</h2>
              <div className="mt-6 rounded-2xl bg-white/10 p-6 backdrop-blur sm:p-8">
                <p className="whitespace-pre-line leading-relaxed text-white/95">{piagam.body}</p>
              </div>
            </FadeInUp>
          </section>
        ) : null}

        {/* Struktur Organisasi */}
        {struktur && strukturGroups.length > 0 ? (
          <section
            id="struktur-organisasi"
            className="scroll-mt-20 border-b border-border bg-card py-16"
          >
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <Badge variant="primary">Struktur Organisasi</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">{struktur.title}</h2>
                {struktur.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {struktur.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="mx-auto mt-8 max-w-3xl">
                <Accordion>
                  {strukturGroups.map((g) => {
                    const members = Array.isArray(g["items"])
                      ? (g["items"] as Array<Record<string, unknown>>)
                      : [];
                    return (
                      <AccordionItem key={str(g, "title")} title={str(g, "title")}>
                        <ul className="space-y-3">
                          {members.map((m, i) => (
                            <li key={i} className="flex flex-col gap-0.5">
                              <span className="font-medium text-foreground">{str(m, "name")}</span>
                              <span className="text-sm text-muted-foreground">
                                {str(m, "position")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </FadeInUp>
          </section>
        ) : null}

        {/* Program Keahlian */}
        {program && programs.length > 0 ? (
          <section id="program-keahlian" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="text-center">
              <Badge variant="primary">Program Keahlian</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground">{program.title}</h2>
              {program.subtitle ? (
                <p className="mt-2 text-base font-medium text-brand-secondary">
                  {program.subtitle}
                </p>
              ) : null}
            </FadeInUp>
            <StaggerContainer className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.map((p) => (
                <StaggerItem key={str(p, "title")} className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>{str(p, "title")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{str(p, "desc")}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
            {program.linkUrl ? (
              <FadeInUp className="mt-8 text-center">
                <Link href={program.linkUrl}>
                  <Button size="lg">{program.linkLabel ?? "Daftar Sekarang"}</Button>
                </Link>
              </FadeInUp>
            ) : null}
          </section>
        ) : null}

        {/* Ekstrakurikuler */}
        {ekskul && ekskulItems.length > 0 ? (
          <section
            id="ekstrakurikuler"
            className="scroll-mt-20 border-t border-border bg-background py-16"
          >
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <Badge variant="primary">Ekstrakurikuler</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">{ekskul.title}</h2>
                {ekskul.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {ekskul.subtitle}
                  </p>
                ) : null}
              </div>
              <StaggerContainer className="mt-8 flex flex-wrap justify-center gap-2">
                {ekskulItems.map((e) => (
                  <StaggerItem key={str(e, "title")}>
                    <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/5 px-4 py-2 text-sm font-medium text-foreground">
                      {str(e, "title")}
                    </span>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeInUp>
          </section>
        ) : null}

        {/* Prestasi */}
        {prestasi && prestasiItems.length > 0 ? (
          <section id="prestasi" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="text-center">
              <Badge variant="primary">Prestasi</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground">{prestasi.title}</h2>
            </FadeInUp>
            <StaggerContainer className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {prestasiItems.map((p) => (
                <StaggerItem key={str(p, "title")} className="h-full">
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{str(p, "level")}</Badge>
                        <Badge variant="neutral">{str(p, "year")}</Badge>
                      </div>
                      <p className="mt-3 font-semibold text-foreground">{str(p, "title")}</p>
                      {str(p, "field") ? (
                        <p className="mt-1 text-xs font-medium text-brand-secondary">
                          {str(p, "field")}
                        </p>
                      ) : null}
                      {str(p, "description") ? (
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                          {str(p, "description")}
                        </p>
                      ) : null}
                      {str(p, "coach") ? (
                        <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                          Pembina: {str(p, "coach")}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ) : null}

        {/* Agenda */}
        {agenda && agendaItems.length > 0 ? (
          <section id="agenda" className="scroll-mt-20 border-y border-border bg-card py-16">
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <Badge variant="primary">Agenda</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">{agenda.title}</h2>
                {agenda.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {agenda.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="mx-auto mt-8 max-w-4xl space-y-4">
                {agendaItems.map((a) => (
                  <Card key={str(a, "title")} className="border-border">
                    <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:gap-4">
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-100 text-primary-800">
                        <span className="text-xl font-extrabold leading-none">
                          {formatTanggal(str(a, "date")).split(" ")[0]}
                        </span>
                        <span className="mt-0.5 text-xs font-semibold">
                          {formatTanggal(str(a, "date")).split(" ")[1]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{str(a, "title")}</p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          {str(a, "date") ? <span>{formatTanggal(str(a, "date"))}</span> : null}
                          {str(a, "time") ? <span>• {str(a, "time")}</span> : null}
                          {str(a, "location") ? <span>• {str(a, "location")}</span> : null}
                        </div>
                        {str(a, "desc") ? (
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {str(a, "desc")}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </FadeInUp>
          </section>
        ) : null}

        {/* Fasilitas */}
        {fasilitas && fasilitasItems.length > 0 ? (
          <section
            id="fasilitas"
            className="scroll-mt-20 border-t border-border bg-background py-16"
          >
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <Badge variant="primary">Fasilitas</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">{fasilitas.title}</h2>
              </div>
              <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fasilitasItems.map((f) => (
                  <StaggerItem key={str(f, "title")} className="h-full">
                    <Card className="h-full">
                      <CardContent className="p-5">
                        <p className="font-semibold text-foreground">{str(f, "title")}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{str(f, "desc")}</p>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeInUp>
          </section>
        ) : null}

        {/* Galeri */}
        {galeri && galeriImages.length > 0 ? (
          <section id="galeri" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="text-center">
              <Badge variant="primary">Galeri</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground">{galeri.title}</h2>
            </FadeInUp>
            <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {galeriImages.map((g) => {
                const src = str(g, "src");
                return (
                  <StaggerItem key={str(g, "title")} className="h-full">
                    <Card className="h-full">
                      {src ? (
                        <img
                          src={src}
                          alt={str(g, "title")}
                          className="h-40 w-full rounded-t-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center rounded-t-xl bg-muted text-4xl font-bold text-brand-primary/40">
                          {str(g, "title").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-foreground">{str(g, "title")}</p>
                        {str(g, "category") || str(g, "date") ? (
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            {str(g, "category") ? (
                              <span className="text-xs text-brand-secondary">
                                {str(g, "category")}
                              </span>
                            ) : null}
                            {str(g, "date") ? (
                              <span className="text-xs text-muted-foreground">
                                {formatTanggal(str(g, "date"))}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </section>
        ) : null}

        {/* Testimoni */}
        {testimoni && testimoniItems.length > 0 ? (
          <section id="testimoni" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="text-center">
              <Badge variant="primary">Testimoni</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground">{testimoni.title}</h2>
              {testimoni.subtitle ? (
                <p className="mt-2 text-base font-medium text-brand-secondary">
                  {testimoni.subtitle}
                </p>
              ) : null}
            </FadeInUp>
            <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {testimoniItems.map((t) => (
                <StaggerItem key={str(t, "name")} className="h-full">
                  <Card className="h-full border-border">
                    <CardContent className="flex h-full flex-col p-5">
                      <span className="text-3xl leading-none text-brand-primary" aria-hidden="true">
                        &ldquo;
                      </span>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {str(t, "text")}
                      </p>
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="font-semibold text-foreground">{str(t, "name")}</p>
                        <p className="text-sm text-muted-foreground">{str(t, "role")}</p>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ) : null}

        {/* Berita */}
        <section id="berita" className="scroll-mt-20 border-t border-border bg-background py-16">
          <FadeInUp className="mx-auto flex max-w-6xl items-end justify-between gap-3 px-4">
            <div>
              <Badge variant="primary">Berita</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground">Kabar Sekolah</h2>
            </div>
            {berita.length > 0 ? (
              <Link href="/berita">
                <Button variant="outline" size="sm">
                  Semua Berita
                </Button>
              </Link>
            ) : null}
          </FadeInUp>
          {berita.length === 0 ? (
            <FadeInUp className="mx-auto mt-8 max-w-6xl px-4">
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Belum ada berita. Operator sekolah dapat menambahkan berita melalui menu Landing
                  Page di aplikasi.
                </CardContent>
              </Card>
            </FadeInUp>
          ) : (
            <StaggerContainer className="mx-auto mt-8 grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
              {berita.map((item) => (
                <StaggerItem key={item.id} className="h-full">
                  <Link href={`/berita/${item.slug}`} className="block h-full">
                    <Card className="h-full transition-colors hover:border-brand-primary">
                      {item.coverImagePath ? (
                        <img
                          src={item.coverImagePath}
                          alt={item.title}
                          className="h-40 w-full rounded-t-xl object-cover"
                        />
                      ) : null}
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="neutral">{formatTanggal(item.publishedAt)}</Badge>
                          {item.category ? (
                            <span className="text-xs text-muted-foreground">{item.category}</span>
                          ) : null}
                        </div>
                        <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                        {item.excerpt ? (
                          <CardDescription className="line-clamp-3">{item.excerpt}</CardDescription>
                        ) : null}
                      </CardHeader>
                      <CardContent>
                        <span className="text-sm font-semibold text-brand-primary">
                          Baca selengkapnya
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </section>

        {/* FAQ */}
        {faq && faqItems.length > 0 ? (
          <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="text-center">
              <Badge variant="primary">FAQ</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground">{faq.title}</h2>
              {faq.subtitle ? (
                <p className="mt-2 text-base font-medium text-brand-secondary">{faq.subtitle}</p>
              ) : null}
            </FadeInUp>
            <div className="mt-8 space-y-3">
              {faqItems.map((f) => (
                <details
                  key={str(f, "question")}
                  className="group rounded-lg border border-border bg-card"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-medium text-foreground">
                    {str(f, "question")}
                    <span className="text-brand-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {str(f, "answer")}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* PPDB CTA */}
        {ppdbCta ? (
          <section id="ppdb-cta" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="overflow-hidden rounded-2xl bg-brand-primary text-white">
              <div className="relative p-8 sm:p-12">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <Badge variant="primary" className="bg-white/15 text-white">
                    {ppdbCta.subtitle ?? "PPDB"}
                  </Badge>
                  <h2 className="mt-3 text-3xl font-bold">{ppdbCta.title}</h2>
                  <p className="mt-3 max-w-2xl text-white/90">{ppdbCta.body}</p>
                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/90">
                    {str(ppdbCta.extra as Record<string, unknown> | undefined, "periode") ? (
                      <span className="rounded-full bg-white/10 px-3 py-1.5">
                        Periode: {str(ppdbCta.extra as Record<string, unknown>, "periode")}
                      </span>
                    ) : null}
                    {str(ppdbCta.extra as Record<string, unknown> | undefined, "kuota") ? (
                      <span className="rounded-full bg-white/10 px-3 py-1.5">
                        Kuota: {str(ppdbCta.extra as Record<string, unknown>, "kuota")}
                      </span>
                    ) : null}
                  </div>
                  {ppdbJalur.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ppdbJalur.map((j) => (
                        <span
                          key={j}
                          className="rounded-full border border-white/40 px-3 py-1 text-sm"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {ppdbInfo.length > 0 ? (
                    <dl className="mt-6 grid gap-3 text-sm text-white/90 sm:grid-cols-3">
                      {ppdbInfo.map((inf) => (
                        <div key={str(inf, "label")} className="rounded-lg bg-white/10 p-3">
                          <dt className="text-white/70">{str(inf, "label")}</dt>
                          <dd className="mt-0.5 font-semibold text-white">{str(inf, "value")}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {ppdbCta.linkUrl ? (
                    <div className="mt-8">
                      <Link href={ppdbCta.linkUrl}>
                        <Button
                          size="lg"
                          className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                        >
                          {ppdbCta.linkLabel ?? "Daftar Sekarang"}
                        </Button>
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </FadeInUp>
          </section>
        ) : null}

        {/* Kontak */}
        {kontak ? (
          <section id="kontak" className="scroll-mt-20 border-t border-border bg-background py-16">
            <FadeInUp className="mx-auto max-w-4xl px-4">
              <div className="text-center">
                <Badge variant="primary">Kontak</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">{kontak.title}</h2>
                {kontak.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {kontak.subtitle}
                  </p>
                ) : null}
              </div>
              <Card className="mx-auto mt-8 max-w-xl border-brand-primary/20">
                <CardContent className="space-y-3 p-6">
                  <p className="whitespace-pre-line text-center leading-relaxed text-muted-foreground">
                    {kontak.body}
                  </p>
                  <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    {str(kontak.extra as Record<string, unknown> | undefined, "address") ? (
                      <div>
                        <dt className="font-semibold text-foreground">Alamat</dt>
                        <dd>{str(kontak.extra as Record<string, unknown>, "address")}</dd>
                      </div>
                    ) : null}
                    {str(kontak.extra as Record<string, unknown> | undefined, "phone") ? (
                      <div>
                        <dt className="font-semibold text-foreground">Telepon</dt>
                        <dd>{str(kontak.extra as Record<string, unknown>, "phone")}</dd>
                      </div>
                    ) : null}
                    {str(kontak.extra as Record<string, unknown> | undefined, "email") ? (
                      <div>
                        <dt className="font-semibold text-foreground">Email</dt>
                        <dd>{str(kontak.extra as Record<string, unknown>, "email")}</dd>
                      </div>
                    ) : null}
                    {str(kontak.extra as Record<string, unknown> | undefined, "hours") ? (
                      <div>
                        <dt className="font-semibold text-foreground">Jam layanan</dt>
                        <dd>{str(kontak.extra as Record<string, unknown>, "hours")}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {str(kontak.extra as Record<string, unknown> | undefined, "whatsapp") ||
                  str(kontak.extra as Record<string, unknown> | undefined, "instagram") ||
                  str(kontak.extra as Record<string, unknown> | undefined, "facebook") ||
                  str(kontak.extra as Record<string, unknown> | undefined, "youtube") ? (
                    <div className="flex flex-wrap justify-center gap-2 pt-4">
                      {str(kontak.extra as Record<string, unknown> | undefined, "whatsapp") ? (
                        <a
                          href={`https://wa.me/${str(
                            kontak.extra as Record<string, unknown>,
                            "whatsapp"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {str(kontak.extra as Record<string, unknown> | undefined, "instagram") ? (
                        <a
                          href={str(kontak.extra as Record<string, unknown>, "instagram")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                        >
                          Instagram
                        </a>
                      ) : null}
                      {str(kontak.extra as Record<string, unknown> | undefined, "facebook") ? (
                        <a
                          href={str(kontak.extra as Record<string, unknown>, "facebook")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                        >
                          Facebook
                        </a>
                      ) : null}
                      {str(kontak.extra as Record<string, unknown> | undefined, "youtube") ? (
                        <a
                          href={str(kontak.extra as Record<string, unknown>, "youtube")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                        >
                          YouTube
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {kontak.linkUrl ? (
                    <div className="pt-4 text-center">
                      <Link href={kontak.linkUrl}>
                        <Button size="lg">{kontak.linkLabel ?? "Daftar PPDB"}</Button>
                      </Link>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              {str(kontak.extra as Record<string, unknown> | undefined, "mapsEmbedUrl") ? (
                <div className="mx-auto mt-6 max-w-xl overflow-hidden rounded-lg border border-border">
                  <iframe
                    src={str(kontak.extra as Record<string, unknown>, "mapsEmbedUrl")}
                    title="Lokasi sekolah"
                    className="h-64 w-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : null}
            </FadeInUp>
          </section>
        ) : null}
      </main>

      <LandingFooter branding={branding} />
    </div>
  );
}

function FeatureRow({ title, desc }: { title: string; desc: string }): JSX.Element {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-background p-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-primary" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
