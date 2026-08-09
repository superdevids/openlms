import type { Metadata } from "next";
import Link from "next/link";
import { cache, type JSX, type ReactNode } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { brandingApiUrl, type BrandingView } from "@/lib/api-client";
import { API_TIMEOUT_MS, APP_NAME, FALLBACK_BRANDING } from "@/lib/constants";
import {
  getContact,
  getSchoolProfile,
  getSchoolProfileExtra,
  getSchoolStructure
} from "@/lib/landing-pages";

/**
 * Halaman Tentang Sekolah — PAGE MANDIRI (redesign landing v2, E.2).
 * SATU halaman berisi tiga bagian (anchor): #tentang-sekolah
 * (features + piagam), #visi-misi, #struktur.
 * Data via helper lib/landing-pages (GET /public/school-profile,
 * /public/school-profile-extra, /public/school-structure, /public/contact),
 * BUKAN potongan section dari GET /public/landing. ISR 30s; fallback aman
 * bila API offline. Header/footer otomatis dari layout (landing).
 * Token landing v2 (--surface-soft, --gradient-*, --playful-*, --shadow-*)
 * dideklarasikan di globals.css oleh blok "Landing v2 tokens".
 */

export const revalidate = 30;

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

/** Inisial nama (maks 2 huruf) untuk avatar personil. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Badge eyebrow playful (D.2) — gradient pill dengan ikon SVG kecil. */
function Eyebrow({
  children,
  icon = "/landing/playful/play-spark.svg",
  gradient = "var(--gradient-indigo)"
}: {
  children: ReactNode;
  icon?: string;
  gradient?: string;
}): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
      style={{ backgroundImage: gradient }}
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

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return {
    title: `Tentang Sekolah — ${b.appName ?? APP_NAME}`,
    description: b.tagline ?? "Profil, visi misi, dan struktur organisasi sekolah."
  };
}

export default async function TentangPage(): Promise<JSX.Element> {
  const [branding, profile, extra, structure, contact] = await Promise.all([
    getBranding(),
    getSchoolProfile(),
    getSchoolProfileExtra(),
    getSchoolStructure(),
    getContact()
  ]);

  const schoolName = profile.name || branding.appName;
  const tentangBody =
    "Kami adalah sekolah yang berkomitmen mencetak generasi cerdas, berkarakter, dan siap menghadapi tantangan zaman.";
  const piagamBody = extra.piagam.trim()
    ? extra.piagam
    : "NPSN, status akreditasi, dan SK pendirian sekolah tercantum pada piagam resmi.";

  return (
    <div className="bg-[var(--surface-soft)]">
      {/* ================= PageHero — varian terang (gradient-hero-soft) ================= */}
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
          src="/landing/playful/play-blob-4.svg"
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
                Profil Sekolah
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
                {schoolName}
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                {branding.tagline ?? "Profil singkat sekolah kami."}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="#tentang-sekolah">
                  <Button
                    size="lg"
                    className="rounded-full text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
                    style={{ backgroundImage: "var(--gradient-hero)" }}
                  >
                    Tentang Kami
                  </Button>
                </Link>
                <Link href="#visi-misi">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Visi &amp; Misi
                  </Button>
                </Link>
                <Link href="#struktur">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Struktur Organisasi
                  </Button>
                </Link>
              </div>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="relative">
              <img
                src="/landing/playful/play-about.svg"
                alt="Ilustrasi profil sekolah: gedung, siswa, dan suasana belajar"
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

      {/* Navigasi anchor cepat */}
      <nav
        aria-label="Navigasi halaman tentang"
        className="mx-auto mt-8 flex max-w-6xl flex-wrap gap-2 px-4"
      >
        {[
          { href: "#tentang-sekolah", label: "Profil & Piagam" },
          { href: "#visi-misi", label: "Visi & Misi" },
          { href: "#struktur", label: "Struktur Organisasi" }
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] transition-all hover:border-brand-primary hover:text-brand-primary"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* ================= A. Tentang Sekolah ================= */}
      <section id="tentang-sekolah" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-14">
        <SectionHeading
          eyebrow="Profil"
          title={extra.tentang.title || "Tentang Sekolah"}
          description={tentangBody}
        />

        {extra.tentang.features.length > 0 ? (
          <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {extra.tentang.features.map((f, i) => (
              <StaggerItem key={f.title} className="h-full">
                <Card className="group relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ backgroundImage: STRIP_GRADIENTS[i % STRIP_GRADIENTS.length] }}
                  />
                  <CardContent className="flex h-full flex-col p-6">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundImage: STRIP_GRADIENTS[i % STRIP_GRADIENTS.length] }}
                    >
                      <img
                        src="/landing/playful/play-check.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6"
                      />
                    </span>
                    <h3 className="mt-4 text-xl font-bold text-foreground">{f.title}</h3>
                    {f.desc ? (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        ) : null}

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {/* Piagam (NPSN / akreditasi / SK) */}
          <FadeInUp>
            <Card className="relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ backgroundImage: "var(--gradient-indigo)" }}
              />
              <CardHeader>
                <CardTitle>Piagam &amp; Akreditasi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                  {piagamBody}
                </p>
                {profile.npsn || profile.nss || profile.schoolType ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.npsn ? <Badge variant="neutral">NPSN: {profile.npsn}</Badge> : null}
                    {profile.nss ? <Badge variant="neutral">NSS: {profile.nss}</Badge> : null}
                    {profile.schoolType ? (
                      <Badge variant="success">{profile.schoolType}</Badge>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </FadeInUp>

          {/* Profil singkat */}
          <FadeInUp delay={0.1}>
            <Card className="relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ backgroundImage: "var(--gradient-teal)" }}
              />
              <CardHeader>
                <CardTitle>Profil Singkat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-foreground">Nama Sekolah</p>
                  <p className="mt-0.5 text-muted-foreground">{schoolName}</p>
                </div>
                {profile.npsn ? (
                  <div>
                    <p className="font-semibold text-foreground">NPSN</p>
                    <p className="mt-0.5 text-muted-foreground">{profile.npsn}</p>
                  </div>
                ) : null}
                {profile.nss ? (
                  <div>
                    <p className="font-semibold text-foreground">NSS</p>
                    <p className="mt-0.5 text-muted-foreground">{profile.nss}</p>
                  </div>
                ) : null}
                {profile.schoolType ? (
                  <div>
                    <p className="font-semibold text-foreground">Jenjang</p>
                    <p className="mt-0.5 text-muted-foreground">{profile.schoolType}</p>
                  </div>
                ) : null}
                {profile.address ? (
                  <div>
                    <p className="font-semibold text-foreground">Alamat</p>
                    <p className="mt-0.5 text-muted-foreground">{profile.address}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </FadeInUp>
        </div>
      </section>

      {/* ================= B. Visi & Misi ================= */}
      <section
        id="visi-misi"
        className="mt-16 scroll-mt-20 border-t border-border bg-[var(--surface-soft-2)] py-16 md:py-20"
      >
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

      {/* ================= C. Struktur Organisasi ================= */}
      <section id="struktur" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
        <SectionHeading
          eyebrow="Struktur Organisasi"
          title={structure.title || "Struktur Organisasi"}
          description="Pengurus dan personil yang menjalankan roda organisasi sekolah."
        />

        {structure.groups.length === 0 ? (
          <FadeInUp className="mt-10">
            <Card className="rounded-[1.5rem] border-dashed shadow-[var(--shadow-soft)]">
              <CardContent className="p-8 text-sm text-muted-foreground">
                Data struktur organisasi belum tersedia. Operator sekolah dapat mengisinya melalui
                menu Landing Page di aplikasi.
              </CardContent>
            </Card>
          </FadeInUp>
        ) : (
          <div className="mt-10 space-y-10">
            {structure.groups.map((g, gi) => (
              <div key={g.title}>
                <FadeInUp>
                  <h3 className="mb-4 inline-flex items-center gap-2 text-xl font-bold text-foreground">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                      style={{ backgroundImage: STRIP_GRADIENTS[gi % STRIP_GRADIENTS.length] }}
                      aria-hidden="true"
                    >
                      <img
                        src="/landing/playful/play-star.svg"
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    </span>
                    {g.title}
                  </h3>
                </FadeInUp>
                <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {g.items.map((m, i) => (
                    <StaggerItem key={i} className="h-full">
                      <Card className="group relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                        <div
                          aria-hidden="true"
                          className="absolute inset-x-0 top-0 h-1.5"
                          style={{
                            backgroundImage: STRIP_GRADIENTS[(gi + i) % STRIP_GRADIENTS.length]
                          }}
                        />
                        <CardContent className="flex flex-col items-center p-6 text-center">
                          <span
                            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-105"
                            style={{
                              backgroundImage: STRIP_GRADIENTS[(gi + i) % STRIP_GRADIENTS.length]
                            }}
                            aria-hidden="true"
                          >
                            {initials(m.name)}
                          </span>
                          <p className="mt-3 font-semibold text-foreground">{m.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{m.position}</p>
                        </CardContent>
                      </Card>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= Strip kontak + CTA ================= */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <FadeInUp>
          <div
            className="relative overflow-hidden rounded-[1.5rem] text-white shadow-[var(--shadow-lift)]"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <img
              src="/landing/playful/play-blob-2.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-40"
            />
            <img
              src="/landing/playful/play-blob-3.svg"
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
                <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  <img
                    src="/landing/playful/play-star.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  />
                  Hubungi Kami
                </span>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                  Kenal lebih dekat dengan sekolah kami
                </h2>
                <p className="mt-3 max-w-xl text-white/90">
                  {contact.address ? contact.address : "Punya pertanyaan tentang sekolah?"} — tim
                  kami siap membantu.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/kontak">
                    <Button
                      size="lg"
                      className="rounded-full bg-white font-bold text-brand-primary shadow-[var(--shadow-soft)] transition-all duration-300 hover:bg-white/90 hover:shadow-[var(--shadow-lift)]"
                    >
                      Lihat Halaman Kontak
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
              <div className="hidden lg:block">
                <img
                  src="/landing/playful/play-contact.svg"
                  alt="Ilustrasi kontak sekolah"
                  role="img"
                  className="mx-auto w-full max-w-sm"
                  loading="lazy"
                />
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
