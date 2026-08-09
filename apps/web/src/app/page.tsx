import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingImage } from "@/components/landing/landing-image";
import { brandingApiUrl, type BrandingView } from "@/lib/api-client";
import { safeUrl } from "@/lib/safe-url";
import { API_TIMEOUT_MS, APP_NAME, FALLBACK_BRANDING } from "@/lib/constants";
import {
  getAchievements,
  getFacilities,
  getGallery,
  getLandingNews,
  getPpdbInfo,
  getPrograms,
  getSchoolProfile,
  getSchoolProfileExtra,
  getTestimonials
} from "@/lib/landing-pages";

/**
 * Halaman depan sekolah — PAGE MANDIRI.
 * Data diambil per-halaman via helper lib/landing-pages (GET /public/...),
 * BUKAN potongan section dari GET /public/landing.
 * ISR 30s; fallback aman (placeholder) bila API offline.
 * LandingHeader/LandingFooter dirender manual di sini karena halaman ini
 * berada di luar route group (landing) (layout root tidak memuatnya).
 */

export const revalidate = 30;

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

function formatTanggal(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}

/** Ekstrak tahun ajaran (20xx/20xx) dari periode, mis. "2026/2027". */
function extractSchoolYear(value: string | null | undefined): string | null {
  const m = value?.match(/\b(20\d{2})\/(20\d{2})\b/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return {
    title: `Beranda — ${b.appName ?? APP_NAME}`,
    description: b.tagline ?? "Website resmi sekolah."
  };
}

export default async function HomePage(): Promise<JSX.Element> {
  const [
    branding,
    profile,
    extra,
    ppdbInfo,
    berita,
    programs,
    facilities,
    achievements,
    testimonials,
    gallery
  ] = await Promise.all([
    getBranding(),
    getSchoolProfile(),
    getSchoolProfileExtra(),
    getPpdbInfo(),
    getLandingNews(),
    getPrograms(),
    getFacilities(),
    getAchievements(),
    getTestimonials(),
    getGallery()
  ]);

  const schoolName = profile.name || branding.appName;
  const ppdbYear = extractSchoolYear(ppdbInfo.periode) ?? "2026/2027";
  const ppdbLink = safeUrl(ppdbInfo.linkUrl) || "/ppdb";
  const news = berita.slice(0, 6);
  const sambutanFeatures =
    extra.tentang.features.length > 0
      ? extra.tentang.features
      : [
          { title: "Pembelajaran modern", desc: "Kurikulum aktif, kreatif, dan menyenangkan." },
          { title: "Teknologi terpadu", desc: "LMS & SIS dalam satu platform digital." },
          { title: "Karakter unggul", desc: "Pembiasaan positif dan penguatan budi pekerti." }
        ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader branding={branding} />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-primary text-white">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-secondary opacity-60" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <StaggerContainer className="max-w-2xl">
                <StaggerItem>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge variant="primary" className="bg-white/15 text-white">
                      Penerimaan Peserta Didik Baru
                    </Badge>
                    {ppdbInfo.periode ? (
                      <Badge variant="primary" className="bg-white/15 text-white">
                        Periode: {ppdbInfo.periode}
                      </Badge>
                    ) : (
                      <Badge variant="primary" className="bg-white/15 text-white">
                        Tahun Ajaran {ppdbYear}
                      </Badge>
                    )}
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                    {schoolName}
                  </h1>
                </StaggerItem>
                <StaggerItem>
                  <p className="mt-3 text-lg font-medium text-white/90">
                    {branding.tagline ?? "LMS & SIS Sekolah"}
                  </p>
                </StaggerItem>
                <StaggerItem>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/ppdb">
                      <Button
                        size="lg"
                        className="bg-card font-bold text-brand-primary shadow-lg hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                      >
                        Daftar PPDB
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

              {/* Ilustrasi lokal (same-origin, aman CSP img-src 'self') */}
              <FadeInUp className="hidden lg:block" delay={0.15}>
                <img
                  src="/landing/landing-hero-school.svg"
                  alt="Ilustrasi gedung sekolah"
                  className="mx-auto w-full max-w-md"
                  loading="lazy"
                />
              </FadeInUp>
            </div>
          </div>
        </section>

        {/* Sambutan */}
        <section id="sambutan" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <FadeInUp className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <Badge variant="primary">Sambutan</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground">{schoolName}</h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
                Selamat datang di website resmi sekolah kami. Kami berkomitmen menyelenggarakan
                pendidikan yang bermutu, berkarakter, dan relevan dengan kebutuhan zaman.
              </p>
            </div>
            <Card className="border-brand-primary/20 bg-card">
              <CardHeader>
                <CardTitle className="text-brand-secondary">Mengapa memilih kami?</CardTitle>
                <CardDescription>Nilai utama sekolah kami.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sambutanFeatures.map((f) => (
                  <FeatureRow key={f.title} title={f.title} desc={f.desc} />
                ))}
              </CardContent>
            </Card>
          </FadeInUp>
        </section>

        {/* Visi & Misi */}
        <section id="visi-misi" className="scroll-mt-20 bg-brand-secondary py-16 text-white">
          <FadeInUp className="mx-auto max-w-5xl px-4">
            <Badge variant="primary" className="bg-white/15 text-white">
              Visi &amp; Misi
            </Badge>
            <h2 className="mt-3 text-3xl font-bold">Visi &amp; Misi</h2>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {extra.visiMisi.visi ? (
                <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                    Visi
                  </p>
                  <p className="mt-2 leading-relaxed text-white/95">{extra.visiMisi.visi}</p>
                </div>
              ) : null}
              {extra.visiMisi.misi.length > 0 ? (
                <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                    Misi
                  </p>
                  <ul className="mt-2 space-y-2">
                    {extra.visiMisi.misi.map((m, i) => (
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

        {/* Kabar Sekolah */}
        <section id="berita" className="scroll-mt-20 border-t border-border bg-background py-16">
          <FadeInUp className="mx-auto flex max-w-6xl items-end justify-between gap-3 px-4">
            <div>
              <Badge variant="primary">Berita</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground">Kabar Sekolah</h2>
            </div>
            {news.length > 0 ? (
              <Link href="/berita">
                <Button variant="outline" size="sm">
                  Lihat Semua
                </Button>
              </Link>
            ) : null}
          </FadeInUp>
          {news.length === 0 ? (
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
              {news.map((item) => (
                <StaggerItem key={item.id} className="h-full">
                  <Link href={`/berita/${item.slug}`} className="block h-full">
                    <Card className="h-full transition-colors hover:border-brand-primary">
                      <LandingImage
                        src={item.coverImagePath}
                        alt={item.title}
                        className="h-40 w-full rounded-t-xl object-cover"
                      />
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

        {/* Teaser: Program Keahlian */}
        {programs.length > 0 ? (
          <section id="program-keahlian" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="flex items-end justify-between gap-3">
              <div>
                <Badge variant="primary">Program Keahlian</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">Program Keahlian</h2>
              </div>
              <Link href="/program-keahlian">
                <Button variant="outline" size="sm">
                  Lihat Semua
                </Button>
              </Link>
            </FadeInUp>
            <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {programs.slice(0, 3).map((p) => (
                <StaggerItem key={p.id} className="h-full">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>{p.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {p.desc ?? p.shortName ?? p.code}
                      </p>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ) : null}

        {/* Teaser: Fasilitas */}
        {facilities.items.length > 0 ? (
          <section
            id="fasilitas"
            className="scroll-mt-20 border-t border-border bg-background py-16"
          >
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <Badge variant="primary">Fasilitas</Badge>
                  <h2 className="mt-3 text-3xl font-bold text-foreground">
                    {facilities.title || "Fasilitas"}
                  </h2>
                </div>
                <Link href="/fasilitas">
                  <Button variant="outline" size="sm">
                    Lihat Semua
                  </Button>
                </Link>
              </div>
              <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {facilities.items.slice(0, 3).map((f) => (
                  <StaggerItem key={f.title} className="h-full">
                    <Card className="h-full">
                      <CardContent className="p-5">
                        <p className="font-semibold text-foreground">{f.title}</p>
                        {f.desc ? (
                          <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeInUp>
          </section>
        ) : null}

        {/* Teaser: Prestasi */}
        {achievements.length > 0 ? (
          <section id="prestasi" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="flex items-end justify-between gap-3">
              <div>
                <Badge variant="primary">Prestasi</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">Prestasi</h2>
              </div>
              <Link href="/prestasi">
                <Button variant="outline" size="sm">
                  Lihat Semua
                </Button>
              </Link>
            </FadeInUp>
            <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {achievements.slice(0, 4).map((a) => (
                <StaggerItem key={a.id} className="h-full">
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{a.level}</Badge>
                        {a.date ? <Badge variant="neutral">{a.date.slice(0, 4)}</Badge> : null}
                      </div>
                      <p className="mt-3 font-semibold text-foreground">{a.title}</p>
                      {a.studentName ? (
                        <p className="mt-1 text-xs text-muted-foreground">{a.studentName}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ) : null}

        {/* Teaser: Testimoni */}
        {testimonials.items.length > 0 ? (
          <section
            id="testimoni"
            className="scroll-mt-20 border-t border-border bg-background py-16"
          >
            <FadeInUp className="mx-auto max-w-6xl px-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <Badge variant="primary">Testimoni</Badge>
                  <h2 className="mt-3 text-3xl font-bold text-foreground">
                    {testimonials.title || "Testimoni"}
                  </h2>
                </div>
                <Link href="/testimoni">
                  <Button variant="outline" size="sm">
                    Lihat Semua
                  </Button>
                </Link>
              </div>
              <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {testimonials.items.slice(0, 3).map((t) => (
                  <StaggerItem key={t.name} className="h-full">
                    <Card className="h-full border-border">
                      <CardContent className="flex h-full flex-col p-5">
                        <span
                          className="text-3xl leading-none text-brand-primary"
                          aria-hidden="true"
                        >
                          &ldquo;
                        </span>
                        {t.text ? (
                          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                            {t.text}
                          </p>
                        ) : null}
                        <div className="mt-4 border-t border-border pt-3">
                          <p className="font-semibold text-foreground">{t.name}</p>
                          {t.role ? (
                            <p className="text-sm text-muted-foreground">{t.role}</p>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeInUp>
          </section>
        ) : null}

        {/* Teaser: Galeri */}
        {gallery.images.length > 0 ? (
          <section id="galeri" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <FadeInUp className="flex items-end justify-between gap-3">
              <div>
                <Badge variant="primary">Galeri</Badge>
                <h2 className="mt-3 text-3xl font-bold text-foreground">
                  {gallery.title || "Galeri"}
                </h2>
              </div>
              <Link href="/galeri">
                <Button variant="outline" size="sm">
                  Lihat Semua
                </Button>
              </Link>
            </FadeInUp>
            <StaggerContainer className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gallery.images.slice(0, 4).map((g) => (
                <StaggerItem key={g.src} className="h-full">
                  <Card className="h-full">
                    <LandingImage
                      src={g.src}
                      alt={g.title}
                      className="h-40 w-full rounded-t-xl object-cover"
                    />
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-foreground">{g.title}</p>
                      {g.category || g.date ? (
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          {g.category ? (
                            <span className="text-xs text-brand-secondary">{g.category}</span>
                          ) : null}
                          {g.date ? (
                            <span className="text-xs text-muted-foreground">
                              {formatTanggal(g.date)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ) : null}

        {/* PPDB CTA */}
        <section id="ppdb-cta" className="scroll-mt-20 border-t border-border bg-background py-16">
          <FadeInUp className="mx-auto max-w-6xl px-4">
            <div className="overflow-hidden rounded-2xl bg-brand-primary text-white">
              <div className="relative p-8 sm:p-12">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <Badge variant="primary" className="bg-white/15 text-white">
                    PPDB
                  </Badge>
                  <h2 className="mt-3 text-3xl font-bold">PPDB {ppdbYear}</h2>
                  <p className="mt-3 max-w-2xl text-white/90">
                    Bergabunglah bersama {schoolName}. Pendaftaran dilakukan secara daring, gratis,
                    dan transparan melalui portal PPDB resmi.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/90">
                    {ppdbInfo.periode ? (
                      <span className="rounded-full bg-white/10 px-3 py-1.5">
                        Periode: {ppdbInfo.periode}
                      </span>
                    ) : null}
                    {ppdbInfo.kuota ? (
                      <span className="rounded-full bg-white/10 px-3 py-1.5">
                        Kuota: {ppdbInfo.kuota}
                      </span>
                    ) : null}
                  </div>
                  {ppdbInfo.jalur.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ppdbInfo.jalur.map((j) => (
                        <span
                          key={j}
                          className="rounded-full border border-white/40 px-3 py-1 text-sm"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {ppdbInfo.info.length > 0 ? (
                    <dl className="mt-6 grid gap-3 text-sm text-white/90 sm:grid-cols-3">
                      {ppdbInfo.info.map((inf) => (
                        <div key={inf.label} className="rounded-lg bg-white/10 p-3">
                          <dt className="text-white/70">{inf.label}</dt>
                          <dd className="mt-0.5 font-semibold text-white">{inf.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={ppdbLink}>
                      <Button
                        size="lg"
                        className="bg-card font-bold text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                      >
                        Daftar Sekarang
                      </Button>
                    </Link>
                    <Link href="/ppdb/status">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white/60 bg-transparent text-white hover:bg-white/10"
                      >
                        Cek Status Pendaftaran
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </FadeInUp>
        </section>
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
