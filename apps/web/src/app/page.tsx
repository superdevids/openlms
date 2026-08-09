import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX, type ReactNode } from "react";
import { Badge, Button, Card, CardContent } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingImage } from "@/components/landing/landing-image";
import { AchievementBadge } from "@/components/landing/prestasi-grid";
import { brandingApiUrl, type BrandingView } from "@/lib/api-client";
import { safeUrl } from "@/lib/safe-url";
import { API_TIMEOUT_MS, APP_NAME, FALLBACK_BRANDING } from "@/lib/constants";
import {
  getAchievements,
  getContact,
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
 * Halaman depan sekolah — PAGE MANDIRI (redesign landing v2, E.1).
 * Data diambil per-halaman via helper lib/landing-pages (GET /public/...),
 * BUKAN potongan section dari GET /public/landing.
 * ISR 30s; fallback aman (placeholder) bila API offline.
 * LandingHeader/LandingFooter dirender manual di sini karena halaman ini
 * berada di luar route group (landing) (layout root tidak memuatnya).
 * Token landing v2 (--surface-soft, --gradient-*, --playful-*, --shadow-*)
 * dideklarasikan di globals.css oleh blok "Landing v2 tokens".
 */

export const revalidate = 30;

/** Gradien teks terang untuk judul di atas hero gelap (kontras AA). */
const HERO_TITLE_GRADIENT = "linear-gradient(135deg,#e0e7ff 0%,#a5b4fc 45%,#67e8f9 100%)";

const STRIP_GRADIENTS = [
  "var(--gradient-indigo)",
  "var(--gradient-pink)",
  "var(--gradient-teal)",
  "var(--gradient-amber)"
];

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

/** Badge eyebrow playful (D.2) — gradient pill dengan ikon SVG kecil. */
function Eyebrow({
  children,
  icon = "/landing/playful/play-spark.svg",
  gradient = "var(--gradient-indigo)",
  light = false
}: {
  children: ReactNode;
  icon?: string;
  gradient?: string;
  light?: boolean;
}): JSX.Element {
  return (
    <span
      className={
        light
          ? "inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
          : "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
      }
      style={light ? undefined : { backgroundImage: gradient }}
    >
      <img src={icon} alt="" aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/** Heading section tengah (D.2): eyebrow + H2 + deskripsi. */
function SectionHeading({
  eyebrow,
  title,
  description,
  gradient = "var(--gradient-indigo)"
}: {
  eyebrow: string;
  title: string;
  description?: string;
  gradient?: string;
}): JSX.Element {
  return (
    <FadeInUp className="mx-auto max-w-2xl text-center">
      <Eyebrow gradient={gradient}>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base text-muted-foreground">{description}</p> : null}
    </FadeInUp>
  );
}

/** Kartu playful (D.3): strip gradient atas + icon chip + tautan. */
function CardPlay({
  icon,
  title,
  description,
  href,
  strip = "var(--gradient-indigo)",
  chip = "var(--gradient-indigo)"
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  strip?: string;
  chip?: string;
}): JSX.Element {
  return (
    <Card className="group relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundImage: strip }}
      />
      <CardContent className="flex h-full flex-col p-6">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: chip }}
        >
          <img src={icon} alt="" aria-hidden="true" className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-primary transition-all hover:gap-2"
        >
          Selengkapnya <span aria-hidden="true">→</span>
        </Link>
      </CardContent>
    </Card>
  );
}

/** Kartu info kontak kecil untuk strip penutup. */
function ContactCard({ title, value }: { title: string; value: string }): JSX.Element {
  return (
    <Card className="h-full rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <CardContent className="flex h-full flex-col p-5">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          style={{ backgroundImage: "var(--gradient-indigo)" }}
        >
          <img
            src="/landing/playful/play-contact.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6"
          />
        </span>
        <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{value}</p>
      </CardContent>
    </Card>
  );
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
    gallery,
    contact
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
    getGallery(),
    getContact()
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
  const hasContact = Boolean(contact.address || contact.phone || contact.email || contact.hours);

  const stats = [
    { value: programs.length > 0 ? `${programs.length}+` : "10+", label: "Program Keahlian" },
    {
      value: facilities.items.length > 0 ? `${facilities.items.length}+` : "20+",
      label: "Fasilitas Belajar"
    },
    {
      value: achievements.length > 0 ? `${achievements.length}+` : "50+",
      label: "Prestasi Diraih"
    },
    { value: news.length > 0 ? `${news.length}+` : "30+", label: "Berita Sekolah" }
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-soft)]">
      <LandingHeader branding={branding} />

      <main id="main">
        {/* ================= PageHero — varian gelap (gradient hero) ================= */}
        <section
          className="relative overflow-hidden text-white"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        >
          <img
            src="/landing/playful/play-blob-2.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 opacity-60"
          />
          <img
            src="/landing/playful/play-blob-4.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 opacity-40"
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
            className="pointer-events-none absolute bottom-12 left-8 h-24 w-24 opacity-[0.12]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <StaggerContainer className="max-w-2xl">
              <StaggerItem>
                <div className="flex flex-wrap gap-2">
                  <Eyebrow light icon="/landing/playful/play-star.svg">
                    Penerimaan Peserta Didik Baru
                  </Eyebrow>
                  <Eyebrow light>Periode: {ppdbYear}</Eyebrow>
                </div>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: HERO_TITLE_GRADIENT }}
                  >
                    {schoolName}
                  </span>
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-4 max-w-xl text-base text-white/90 md:text-lg">
                  {branding.tagline ?? "LMS & SIS Sekolah"} — belajar yang cerdas, hangat, dan
                  menyenangkan untuk setiap peserta didik.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/ppdb">
                    <Button
                      size="lg"
                      className="rounded-full bg-white font-bold text-brand-primary shadow-[var(--shadow-soft)] transition-all duration-300 hover:bg-white/90 hover:shadow-[var(--shadow-lift)]"
                    >
                      Daftar PPDB
                    </Button>
                  </Link>
                  <Link href="/berita">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                    >
                      Lihat Berita
                    </Button>
                  </Link>
                </div>
              </StaggerItem>
            </StaggerContainer>

            {/* Ilustrasi lokal (same-origin, aman CSP img-src 'self') */}
            <FadeInUp delay={0.15} className="relative">
              <img
                src="/landing/playful/play-hero-school.svg"
                alt="Ilustrasi gedung sekolah dengan suasana ceria"
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
            </FadeInUp>
          </div>
        </section>

        {/* ================= StatStrip — varian terang ================= */}
        <section className="border-b border-border bg-[var(--surface-soft-2)]">
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

        {/* ================= Sambutan ================= */}
        <section id="sambutan" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <FadeInUp className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Eyebrow>Sambutan</Eyebrow>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Selamat datang di <span className="text-gradient-brand">{schoolName}</span>
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Kami berkomitmen menyelenggarakan pendidikan yang bermutu, berkarakter, dan relevan
                dengan kebutuhan zaman — memadukan pembelajaran modern, teknologi terpadu, dan
                penguatan budi pekerti setiap hari.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/tentang">
                  <Button
                    size="lg"
                    className="rounded-full text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
                    style={{ backgroundImage: "var(--gradient-hero)" }}
                  >
                    Kenali Sekolah Kami
                  </Button>
                </Link>
                <Link href="/program-keahlian">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Lihat Program
                  </Button>
                </Link>
              </div>
            </div>
            <StaggerContainer className="grid gap-4 sm:grid-cols-1">
              {sambutanFeatures.map((f, i) => (
                <StaggerItem key={f.title} className="h-full">
                  <Card className="group relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-1.5"
                      style={{ backgroundImage: STRIP_GRADIENTS[i % STRIP_GRADIENTS.length] }}
                    />
                    <CardContent className="flex items-start gap-4 p-6">
                      <span
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
                        style={{
                          backgroundImage: STRIP_GRADIENTS[i % STRIP_GRADIENTS.length]
                        }}
                      >
                        <img
                          src="/landing/playful/play-check.svg"
                          alt=""
                          aria-hidden="true"
                          className="h-6 w-6"
                        />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground">{f.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {f.desc}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </FadeInUp>
        </section>

        {/* ================= Visi & Misi ================= */}
        <section id="visi-misi" className="scroll-mt-20 bg-[var(--surface-soft-2)] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Visi & Misi"
              title="Arah Pendidikan Kami"
              description="Nilai yang kami pegang untuk mencetak generasi cerdas, berkarakter, dan siap menghadapi tantangan zaman."
            />
            <StaggerContainer className="mt-10 grid gap-5 lg:grid-cols-2">
              <StaggerItem className="h-full">
                <Card className="relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ backgroundImage: "var(--gradient-indigo)" }}
                  />
                  <CardContent className="flex h-full flex-col p-6">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
                      style={{ backgroundImage: "var(--gradient-indigo)" }}
                    >
                      <img
                        src="/landing/playful/play-star.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6"
                      />
                    </span>
                    <p className="mt-4 text-sm font-bold uppercase tracking-wide text-brand-primary">
                      Visi
                    </p>
                    <p className="mt-2 text-lg font-medium leading-relaxed text-foreground">
                      {extra.visiMisi.visi ??
                        "Terwujudnya peserta didik yang beriman, bertakwa, cerdas, terampil, mandiri, dan berwawasan lingkungan."}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
              <StaggerItem className="h-full">
                <Card className="relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ backgroundImage: "var(--gradient-teal)" }}
                  />
                  <CardContent className="flex h-full flex-col p-6">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
                      style={{ backgroundImage: "var(--gradient-teal)" }}
                    >
                      <img
                        src="/landing/playful/play-check.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6"
                      />
                    </span>
                    <p className="mt-4 text-sm font-bold uppercase tracking-wide text-brand-primary">
                      Misi
                    </p>
                    <ul className="mt-2 space-y-2">
                      {(extra.visiMisi.misi.length > 0
                        ? extra.visiMisi.misi
                        : [
                            "Menyelenggarakan pembelajaran aktif, kreatif, dan menyenangkan.",
                            "Menumbuhkan budaya literasi dan numerasi.",
                            "Membangun karakter peserta didik melalui pembiasaan positif.",
                            "Mengembangkan bakat dan minat peserta didik."
                          ]
                      ).map((m, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          <span className="font-bold text-brand-primary">{i + 1}.</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </section>

        {/* ================= Kabar Sekolah ================= */}
        <section id="berita" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <FadeInUp className="flex items-end justify-between gap-3">
            <div>
              <Eyebrow>Berita</Eyebrow>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Kabar Sekolah</h2>
            </div>
            {news.length > 0 ? (
              <Link href="/berita">
                <Button variant="outline" size="sm" className="rounded-full">
                  Lihat Semua
                </Button>
              </Link>
            ) : null}
          </FadeInUp>
          {news.length === 0 ? (
            <FadeInUp className="mt-8">
              <Card className="rounded-[1.5rem] border-dashed shadow-[var(--shadow-soft)]">
                <CardContent className="p-8 text-sm text-muted-foreground">
                  Belum ada berita. Operator sekolah dapat menambahkan berita melalui menu Landing
                  Page di aplikasi.
                </CardContent>
              </Card>
            </FadeInUp>
          ) : (
            <StaggerContainer className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((item) => (
                <StaggerItem key={item.id} className="h-full">
                  <Link href={`/berita/${item.slug}`} className="block h-full">
                    <Card className="group h-full overflow-hidden rounded-[1.5rem] shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                      <LandingImage
                        src={item.coverImagePath}
                        alt={item.title}
                        className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="neutral">{formatTanggal(item.publishedAt)}</Badge>
                          {item.category ? (
                            <span className="text-xs text-muted-foreground">{item.category}</span>
                          ) : null}
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-lg font-bold text-foreground">
                          {item.title}
                        </h3>
                        {item.excerpt ? (
                          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                            {item.excerpt}
                          </p>
                        ) : null}
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-primary transition-all group-hover:gap-2">
                          Baca selengkapnya <span aria-hidden="true">→</span>
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </section>

        {/* ================= Teaser: Program Keahlian ================= */}
        {programs.length > 0 ? (
          <section
            id="program-keahlian"
            className="scroll-mt-20 border-t border-border bg-[var(--surface-soft-2)] py-16 md:py-20"
          >
            <div className="mx-auto max-w-6xl px-4">
              <SectionHeading
                eyebrow="Program Keahlian"
                title="Siapkan Karier Sejak Sekolah"
                description="Program keahlian yang selaras dengan kebutuhan dunia industri dan dunia kerja."
              />
              <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {programs.slice(0, 3).map((p, i) => (
                  <StaggerItem key={p.id} className="h-full">
                    <CardPlay
                      icon="/landing/playful/play-program.svg"
                      title={p.name}
                      description={p.desc ?? p.shortName ?? p.code}
                      href="/program-keahlian"
                      strip={STRIP_GRADIENTS[i % STRIP_GRADIENTS.length]}
                      chip={STRIP_GRADIENTS[i % STRIP_GRADIENTS.length]}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
              <div className="mt-10 text-center">
                <Link href="/program-keahlian">
                  <Button variant="outline" size="lg" className="rounded-full">
                    Lihat Semua Program
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ================= Teaser: Fasilitas ================= */}
        {facilities.items.length > 0 ? (
          <section id="fasilitas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
            <SectionHeading
              eyebrow="Fasilitas"
              title={facilities.title || "Fasilitas Sekolah"}
              description="Sarana belajar yang nyaman dan mendukung proses pembelajaran yang berkualitas."
            />
            <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {facilities.items.slice(0, 3).map((f, i) => (
                <StaggerItem key={f.title} className="h-full">
                  <CardPlay
                    icon="/landing/playful/play-facility.svg"
                    title={f.title}
                    description={f.desc ?? "Fasilitas pendukung kegiatan belajar mengajar."}
                    href="/fasilitas"
                    strip={STRIP_GRADIENTS[(i + 1) % STRIP_GRADIENTS.length]}
                    chip={STRIP_GRADIENTS[(i + 1) % STRIP_GRADIENTS.length]}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
            <div className="mt-10 text-center">
              <Link href="/fasilitas">
                <Button variant="outline" size="lg" className="rounded-full">
                  Lihat Semua Fasilitas
                </Button>
              </Link>
            </div>
          </section>
        ) : null}

        {/* ================= Teaser: Prestasi ================= */}
        {achievements.length > 0 ? (
          <section
            id="prestasi"
            className="scroll-mt-20 border-t border-border bg-[var(--surface-soft-2)] py-16 md:py-20"
          >
            <div className="mx-auto max-w-6xl px-4">
              <SectionHeading
                eyebrow="Prestasi"
                title="Kebanggaan Warga Sekolah"
                description="Capaian juara peserta didik dan guru dari tingkat kabupaten hingga internasional."
              />
              <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {achievements.slice(0, 4).map((a) => (
                  <StaggerItem key={a.id} className="h-full">
                    <Card className="group relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-1.5"
                        style={{ backgroundImage: "var(--gradient-amber)" }}
                      />
                      <CardContent className="flex h-full flex-col p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <AchievementBadge level={a.level || "Umum"} />
                          {a.date ? <Badge variant="neutral">{a.date.slice(0, 4)}</Badge> : null}
                        </div>
                        <h3 className="mt-3 line-clamp-2 text-lg font-bold text-foreground">
                          {a.title}
                        </h3>
                        {a.studentName ? (
                          <p className="mt-1 text-xs text-muted-foreground">{a.studentName}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>
              <div className="mt-10 text-center">
                <Link href="/prestasi">
                  <Button variant="outline" size="lg" className="rounded-full">
                    Lihat Semua Prestasi
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ================= Teaser: Testimoni ================= */}
        {testimonials.items.length > 0 ? (
          <section id="testimoni" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
            <SectionHeading
              eyebrow="Testimoni"
              title={testimonials.title || "Apa Kata Mereka"}
              description="Pengalaman nyata dari orang tua, siswa, dan alumni sekolah."
            />
            <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.items.slice(0, 3).map((t) => (
                <StaggerItem key={t.name} className="h-full">
                  <figure className="flex h-full flex-col rounded-[1.5rem] bg-card p-6 shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1" role="img" aria-label="Rating 5 dari 5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <img
                            key={i}
                            src="/landing/playful/play-star.svg"
                            alt=""
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        ))}
                      </div>
                      <img
                        src="/landing/playful/play-testimonial.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-8 opacity-70"
                      />
                    </div>
                    <blockquote className="mt-4 flex-1 text-base italic leading-relaxed text-foreground">
                      &ldquo;{t.text || "Belum ada keterangan."}&rdquo;
                    </blockquote>
                    <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundImage: "var(--gradient-indigo)" }}
                        aria-hidden="true"
                      >
                        {t.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase() ?? "")
                          .join("") || "?"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{t.name}</p>
                        {t.role ? (
                          <p className="truncate text-xs text-muted-foreground">{t.role}</p>
                        ) : null}
                      </div>
                    </figcaption>
                  </figure>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        ) : null}

        {/* ================= Teaser: Galeri ================= */}
        {gallery.images.length > 0 ? (
          <section
            id="galeri"
            className="scroll-mt-20 border-t border-border bg-[var(--surface-soft-2)] py-16 md:py-20"
          >
            <div className="mx-auto max-w-6xl px-4">
              <SectionHeading
                eyebrow="Galeri"
                title={gallery.title || "Galeri Sekolah"}
                description="Momen kegiatan, lomba, dan keseharian belajar di sekolah."
              />
              <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {gallery.images.slice(0, 4).map((g) => (
                  <StaggerItem key={g.src} className="h-full">
                    <figure className="group relative overflow-hidden rounded-[1.5rem] shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
                      <LandingImage
                        src={g.src}
                        alt={g.title}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <p className="text-sm font-bold text-white">{g.title}</p>
                        {g.category ? <p className="text-xs text-white/85">{g.category}</p> : null}
                      </figcaption>
                    </figure>
                  </StaggerItem>
                ))}
              </StaggerContainer>
              <div className="mt-10 text-center">
                <Link href="/galeri">
                  <Button variant="outline" size="lg" className="rounded-full">
                    Lihat Semua Galeri
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {/* ================= PPDB CTA ================= */}
        <section id="ppdb-cta" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <FadeInUp>
            <div
              className="relative overflow-hidden rounded-[1.5rem] text-white shadow-[var(--shadow-lift)]"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              <img
                src="/landing/playful/play-blob-3.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-40"
              />
              <img
                src="/landing/playful/play-blob-1.svg"
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
                  <Eyebrow light icon="/landing/playful/play-star.svg">
                    PPDB {ppdbYear}
                  </Eyebrow>
                  <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                    Bergabunglah bersama {schoolName}
                  </h2>
                  <p className="mt-3 max-w-xl text-white/90">
                    Pendaftaran dilakukan secara daring, gratis, dan transparan melalui portal PPDB
                    resmi.
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
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={ppdbLink}>
                      <Button
                        size="lg"
                        className="rounded-full bg-white font-bold text-brand-primary shadow-[var(--shadow-soft)] transition-all duration-300 hover:bg-white/90 hover:shadow-[var(--shadow-lift)]"
                      >
                        Daftar Sekarang
                      </Button>
                    </Link>
                    <Link href="/ppdb/status">
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                      >
                        Cek Status Pendaftaran
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <img
                    src="/landing/playful/play-ppdb.svg"
                    alt="Ilustrasi pendaftaran peserta didik baru"
                    role="img"
                    className="mx-auto w-full max-w-sm"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </FadeInUp>
        </section>

        {/* ================= Kontak strip ================= */}
        <section
          id="kontak"
          className="scroll-mt-20 border-t border-border bg-[var(--surface-soft-2)] py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Hubungi Kami"
              title="Kami Siap Membantu"
              description="Punya pertanyaan tentang sekolah, PPDB, atau program? Jangan ragu menghubungi kami."
            />
            {hasContact ? (
              <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {contact.address ? (
                  <StaggerItem className="h-full">
                    <ContactCard title="Alamat" value={contact.address} />
                  </StaggerItem>
                ) : null}
                {contact.phone ? (
                  <StaggerItem className="h-full">
                    <ContactCard title="Telepon" value={contact.phone} />
                  </StaggerItem>
                ) : null}
                {contact.email ? (
                  <StaggerItem className="h-full">
                    <ContactCard title="Email" value={contact.email} />
                  </StaggerItem>
                ) : null}
                {contact.hours ? (
                  <StaggerItem className="h-full">
                    <ContactCard title="Jam Layanan" value={contact.hours} />
                  </StaggerItem>
                ) : null}
              </StaggerContainer>
            ) : (
              <FadeInUp className="mx-auto mt-10 max-w-xl text-center">
                <img
                  src="/landing/playful/play-contact.svg"
                  alt=""
                  aria-hidden="true"
                  className="mx-auto h-16 w-20 opacity-80"
                />
                <p className="mt-4 text-base font-semibold text-foreground">
                  Informasi kontak akan segera hadir
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kunjungi halaman kontak untuk detail alamat, telepon, dan jam layanan.
                </p>
              </FadeInUp>
            )}
            <div className="mt-10 text-center">
              <Link href="/kontak">
                <Button
                  size="lg"
                  className="rounded-full text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                >
                  Lihat Halaman Kontak
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter branding={branding} />
    </div>
  );
}
