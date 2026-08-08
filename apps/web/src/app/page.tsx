import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@openlms/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { fetchBrandingServer, type BrandingView } from "@/lib/api-client";
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
 * Section baru (R-33..R-36): sambutan-kepsek, visi-misi, program-keahlian,
 * ekstrakurikuler, prestasi, fasilitas, galeri, faq + stats strip hero.
 * Fallback default bila API offline; branding dari /app/branding.
 */

export const dynamic = "force-dynamic";

/** URL absolut /api/v1/public/landing untuk fetch server-side. */
function landingApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? API_BASE_FALLBACK).replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) return `${base}${path}`;
  return `${base}/api/v1${path}`;
}

const getBranding = cache(async (): Promise<BrandingView> => {
  try {
    return await fetchBrandingServer();
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
        cache: "no-store",
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

export default async function HomePage(): Promise<React.JSX.Element> {
  const [branding, landing] = await Promise.all([getBranding(), getLanding()]);
  const hero = findSection(landing.sections, "hero");
  const sambutan = findSection(landing.sections, "sambutan-kepsek");
  const tentang = findSection(landing.sections, "tentang");
  const visiMisi = findSection(landing.sections, "visi-misi");
  const piagam =
    findSection(landing.sections, "piagam") ?? findSection(landing.sections, "visi-misi");
  const program = findSection(landing.sections, "program-keahlian");
  const ekskul = findSection(landing.sections, "ekstrakurikuler");
  const prestasi = findSection(landing.sections, "prestasi");
  const fasilitas = findSection(landing.sections, "fasilitas");
  const galeri = findSection(landing.sections, "galeri");
  const faq = findSection(landing.sections, "faq");
  const kontak = findSection(landing.sections, "kontak");
  const berita = landing.berita.slice(0, 6);

  const heroStats = extraOf(hero, "stats");
  const tentangFeatures = extraOf(tentang, "features");
  const programs = extraOf(program, "programs");
  const ekskulItems = extraOf(ekskul, "items");
  const prestasiItems = extraOf(prestasi, "items");
  const fasilitasItems = extraOf(fasilitas, "items");
  const galeriImages = extraOf(galeri, "images");
  const faqItems = extraOf(faq, "faq");
  const misi = Array.isArray(visiMisi?.extra?.misi) ? (visiMisi.extra.misi as string[]) : [];

  return (
    <div className="min-h-screen bg-neutral-50">
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
                    <Button size="lg" className="bg-white text-brand-primary hover:bg-neutral-100">
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

        {/* Sambutan Kepala Sekolah */}
        {sambutan ? (
          <section id="sambutan" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <Badge variant="primary">Sambutan</Badge>
                <h2 className="mt-3 text-3xl font-bold text-neutral-900">{sambutan.title}</h2>
                {sambutan.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {sambutan.subtitle}
                  </p>
                ) : null}
                <p className="mt-4 whitespace-pre-line leading-relaxed text-neutral-700">
                  {sambutan.body}
                </p>
                {str(sambutan.extra, "name") ? (
                  <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
                    <p className="font-semibold text-neutral-900">{str(sambutan.extra, "name")}</p>
                    <p className="text-sm text-neutral-600">{str(sambutan.extra, "position")}</p>
                  </div>
                ) : null}
              </div>
              <Card className="border-brand-primary/20 bg-white">
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
          <section id="tentang" className="scroll-mt-20 border-t border-neutral-200 bg-white py-16">
            <FadeInUp className="mx-auto max-w-4xl px-4">
              <div className="text-center">
                <Badge variant="primary">Tentang</Badge>
                <h2 className="mt-3 text-3xl font-bold text-neutral-900">{tentang.title}</h2>
                {tentang.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {tentang.subtitle}
                  </p>
                ) : null}
              </div>
              <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-center leading-relaxed text-neutral-700">
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

        {/* Program Keahlian */}
        {program && programs.length > 0 ? (
          <section id="program-keahlian" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="text-center">
              <Badge variant="primary">Program Keahlian</Badge>
              <h2 className="mt-3 text-3xl font-bold text-neutral-900">{program.title}</h2>
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
                      <p className="text-sm text-neutral-600">{str(p, "desc")}</p>
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
            className="scroll-mt-20 border-t border-neutral-200 bg-white py-16"
          >
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <Badge variant="primary">Ekstrakurikuler</Badge>
                <h2 className="mt-3 text-3xl font-bold text-neutral-900">{ekskul.title}</h2>
                {ekskul.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {ekskul.subtitle}
                  </p>
                ) : null}
              </div>
              <StaggerContainer className="mt-8 flex flex-wrap justify-center gap-2">
                {ekskulItems.map((e) => (
                  <StaggerItem key={str(e, "title")}>
                    <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/5 px-4 py-2 text-sm font-medium text-neutral-800">
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
              <h2 className="mt-3 text-3xl font-bold text-neutral-900">{prestasi.title}</h2>
            </FadeInUp>
            <StaggerContainer className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {prestasiItems.map((p) => (
                <StaggerItem key={str(p, "title")} className="h-full">
                  <Card className="h-full">
                    <CardContent className="p-5">
                      <Badge variant="primary">{str(p, "level")}</Badge>
                      <p className="mt-3 font-semibold text-neutral-900">{str(p, "title")}</p>
                      <p className="mt-1 text-sm text-neutral-600">{str(p, "year")}</p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ) : null}

        {/* Fasilitas */}
        {fasilitas && fasilitasItems.length > 0 ? (
          <section
            id="fasilitas"
            className="scroll-mt-20 border-t border-neutral-200 bg-white py-16"
          >
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="text-center">
                <Badge variant="primary">Fasilitas</Badge>
                <h2 className="mt-3 text-3xl font-bold text-neutral-900">{fasilitas.title}</h2>
              </div>
              <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fasilitasItems.map((f) => (
                  <StaggerItem key={str(f, "title")} className="h-full">
                    <Card className="h-full">
                      <CardContent className="p-5">
                        <p className="font-semibold text-neutral-900">{str(f, "title")}</p>
                        <p className="mt-1 text-sm text-neutral-600">{str(f, "desc")}</p>
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
              <h2 className="mt-3 text-3xl font-bold text-neutral-900">{galeri.title}</h2>
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
                        <div className="flex h-40 items-center justify-center rounded-t-xl bg-neutral-100 text-4xl font-bold text-brand-primary/40">
                          {str(g, "title").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-neutral-900">{str(g, "title")}</p>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </section>
        ) : null}

        {/* Berita */}
        <section id="berita" className="scroll-mt-20 border-t border-neutral-200 bg-white py-16">
          <FadeInUp className="mx-auto flex max-w-6xl items-end justify-between gap-3 px-4">
            <div>
              <Badge variant="primary">Berita</Badge>
              <h2 className="mt-3 text-3xl font-bold text-neutral-900">Kabar Sekolah</h2>
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
                <CardContent className="p-6 text-sm text-neutral-500">
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
                            <span className="text-xs text-neutral-500">{item.category}</span>
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
              <h2 className="mt-3 text-3xl font-bold text-neutral-900">{faq.title}</h2>
              {faq.subtitle ? (
                <p className="mt-2 text-base font-medium text-brand-secondary">{faq.subtitle}</p>
              ) : null}
            </FadeInUp>
            <div className="mt-8 space-y-3">
              {faqItems.map((f) => (
                <details
                  key={str(f, "question")}
                  className="group rounded-lg border border-neutral-200 bg-white"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 font-medium text-neutral-900">
                    {str(f, "question")}
                    <span className="text-brand-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-neutral-700">
                    {str(f, "answer")}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* Kontak */}
        {kontak ? (
          <section id="kontak" className="scroll-mt-20 border-t border-neutral-200 bg-white py-16">
            <FadeInUp className="mx-auto max-w-4xl px-4">
              <div className="text-center">
                <Badge variant="primary">Kontak</Badge>
                <h2 className="mt-3 text-3xl font-bold text-neutral-900">{kontak.title}</h2>
                {kontak.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {kontak.subtitle}
                  </p>
                ) : null}
              </div>
              <Card className="mx-auto mt-8 max-w-xl border-brand-primary/20">
                <CardContent className="space-y-3 p-6">
                  <p className="whitespace-pre-line text-center leading-relaxed text-neutral-700">
                    {kontak.body}
                  </p>
                  <dl className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
                    {str(kontak.extra as Record<string, unknown> | undefined, "address") ? (
                      <div>
                        <dt className="font-semibold text-neutral-900">Alamat</dt>
                        <dd>{str(kontak.extra as Record<string, unknown>, "address")}</dd>
                      </div>
                    ) : null}
                    {str(kontak.extra as Record<string, unknown> | undefined, "phone") ? (
                      <div>
                        <dt className="font-semibold text-neutral-900">Telepon</dt>
                        <dd>{str(kontak.extra as Record<string, unknown>, "phone")}</dd>
                      </div>
                    ) : null}
                    {str(kontak.extra as Record<string, unknown> | undefined, "email") ? (
                      <div>
                        <dt className="font-semibold text-neutral-900">Email</dt>
                        <dd>{str(kontak.extra as Record<string, unknown>, "email")}</dd>
                      </div>
                    ) : null}
                    {str(kontak.extra as Record<string, unknown> | undefined, "hours") ? (
                      <div>
                        <dt className="font-semibold text-neutral-900">Jam layanan</dt>
                        <dd>{str(kontak.extra as Record<string, unknown>, "hours")}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {kontak.linkUrl ? (
                    <div className="pt-2 text-center">
                      <Link href={kontak.linkUrl}>
                        <Button size="lg">{kontak.linkLabel ?? "Daftar PPDB"}</Button>
                      </Link>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </FadeInUp>
          </section>
        ) : null}
      </main>

      <LandingFooter branding={branding} />
    </div>
  );
}

function FeatureRow({ title, desc }: { title: string; desc: string }): React.JSX.Element {
  return (
    <div className="flex gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-primary" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="text-sm text-neutral-600">{desc}</p>
      </div>
    </div>
  );
}
