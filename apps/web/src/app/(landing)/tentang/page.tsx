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
import { ContactForm } from "@/components/landing/contact-form";
import { brandingApiUrl, type BrandingView } from "@/lib/api-client";
import { safeUrl } from "@/lib/safe-url";
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
 * Halaman Tentang Sekolah — SATU halaman berisi tiga bagian (anchor):
 *   1. Tentang Sekolah   (#tentang-sekolah): intro + section `tentang`
 *      (features grid) + `piagam` (NPSN/akreditasi/SK) + profil singkat.
 *   2. Struktur Organisasi (#struktur): section `struktur-organisasi`
 *      (extra.groups — tiap grup: judul + kartu personil).
 *   3. Hubungi Kami      (#kontak): section `kontak` (telepon/email/alamat/
 *      jam/sosmed) + peta (mapsEmbedUrl via safeUrl) + form kontak DEMO
 *      (statis, tidak mengirim API) + CTA WhatsApp.
 * Konten dari GET /public/landing (API) — ISR 30s, fallback FALLBACK_LANDING
 * bila API offline. Berbagi LandingHeader/LandingFooter via layout (landing).
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

/** Inisial nama (maks 2 huruf) untuk avatar personil. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return {
    title: `Tentang Sekolah — ${b.appName ?? APP_NAME}`,
    description: b.tagline ?? "Profil, struktur organisasi, dan kontak sekolah."
  };
}

export default async function TentangPage(): Promise<JSX.Element> {
  const [branding, landing] = await Promise.all([getBranding(), getLanding()]);
  const tentang = findSection(landing.sections, "tentang");
  const piagam = findSection(landing.sections, "piagam");
  const struktur = findSection(landing.sections, "struktur-organisasi");
  const kontak = findSection(landing.sections, "kontak");

  const tentangFeatures = extraOf(tentang, "features");
  const strukturGroups = extraOf(struktur, "groups");

  const piagamNpsn = str(piagam?.extra, "npsn");
  const piagamAkreditasi = str(piagam?.extra, "akreditasi");
  const piagamSk = str(piagam?.extra, "sk");

  const kontakPhone = str(kontak?.extra, "phone");
  const kontakEmail = str(kontak?.extra, "email");
  const kontakAddress = str(kontak?.extra, "address");
  const kontakHours = str(kontak?.extra, "hours");
  const kontakWhatsapp = str(kontak?.extra, "whatsapp").replace(/[^0-9]/g, "");
  const kontakInstagram = safeUrl(str(kontak?.extra, "instagram"));
  const kontakFacebook = safeUrl(str(kontak?.extra, "facebook"));
  const kontakYoutube = safeUrl(str(kontak?.extra, "youtube"));
  const kontakMapsEmbed = safeUrl(str(kontak?.extra, "mapsEmbedUrl"));

  const piagamBody = piagam?.body?.trim() ? piagam.body : "";
  const tentangBody = tentang?.body?.trim() ? tentang.body : "";
  const strukturBody = struktur?.body?.trim() ? struktur.body : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero band */}
      <FadeInUp>
        <div className="relative overflow-hidden rounded-2xl bg-brand-primary text-white">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-accent opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-secondary opacity-60" />
          <div className="relative grid items-center gap-6 p-8 sm:p-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <Badge variant="primary" className="bg-white/15 text-white">
                Tentang Sekolah
              </Badge>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{branding.appName}</h1>
              <p className="mt-2 max-w-xl leading-relaxed text-white/90">
                {tentangBody || branding.tagline || "Profil singkat sekolah kami."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="#tentang-sekolah">
                  <Button
                    size="lg"
                    className="bg-card font-bold text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                  >
                    Tentang Kami
                  </Button>
                </Link>
                <Link href="#struktur">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/60 bg-transparent text-white hover:bg-white/10"
                  >
                    Struktur Organisasi
                  </Button>
                </Link>
                <Link href="#kontak">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/60 bg-transparent text-white hover:bg-white/10"
                  >
                    Hubungi Kami
                  </Button>
                </Link>
              </div>
            </div>
            {/* Ilustrasi lokal (same-origin, aman CSP img-src 'self') */}
            <img
              src="/landing/landing-about-hero.svg"
              alt="Ilustrasi gedung sekolah"
              className="mx-auto hidden w-full max-w-sm lg:block"
              loading="lazy"
            />
          </div>
        </div>
      </FadeInUp>

      {/* Navigasi anchor cepat */}
      <nav aria-label="Navigasi halaman tentang" className="mt-8 flex flex-wrap gap-2">
        {[
          { href: "#tentang-sekolah", label: "Profil & Piagam" },
          { href: "#struktur", label: "Struktur Organisasi" },
          { href: "#kontak", label: "Hubungi Kami" }
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* ================= A. Tentang Sekolah ================= */}
      <section id="tentang-sekolah" className="scroll-mt-20 pt-14">
        <FadeInUp>
          <div className="text-center">
            <Badge variant="primary">Profil</Badge>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              {tentang?.title ?? "Tentang Sekolah"}
            </h2>
            {tentang?.subtitle ? (
              <p className="mt-2 text-base font-medium text-brand-secondary">{tentang.subtitle}</p>
            ) : null}
          </div>
          {tentangBody ? (
            <p className="mx-auto mt-6 max-w-3xl whitespace-pre-line text-center leading-relaxed text-muted-foreground">
              {tentangBody}
            </p>
          ) : null}
        </FadeInUp>

        {tentangFeatures.length > 0 ? (
          <StaggerContainer className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tentangFeatures.map((f) => (
              <StaggerItem key={str(f, "title")} className="h-full">
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent text-lg font-bold text-white">
                        {str(f, "title").slice(0, 1).toUpperCase()}
                      </span>
                      <p className="font-semibold text-foreground">{str(f, "title")}</p>
                    </div>
                    {str(f, "desc") ? (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {str(f, "desc")}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        ) : null}

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {/* Piagam (NPSN / akreditasi / SK) */}
          <Card className="border-brand-primary/20">
            <CardHeader>
              <CardTitle>{piagam?.title ?? "Piagam & Akreditasi"}</CardTitle>
              <CardDescription>
                {piagam?.subtitle ?? "Landasan pendirian & akreditasi"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {piagamBody ||
                  "NPSN, status akreditasi, dan SK pendirian sekolah tercantum pada piagam resmi."}
              </p>
              {piagamNpsn || piagamAkreditasi || piagamSk ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {piagamNpsn ? <Badge variant="neutral">NPSN: {piagamNpsn}</Badge> : null}
                  {piagamAkreditasi ? (
                    <Badge variant="success">Akreditasi: {piagamAkreditasi}</Badge>
                  ) : null}
                  {piagamSk ? <Badge variant="neutral">{piagamSk}</Badge> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Profil singkat */}
          <Card>
            <CardHeader>
              <CardTitle>Profil Singkat</CardTitle>
              <CardDescription>Identitas sekolah</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">Nama Sekolah</p>
                <p className="mt-0.5 text-muted-foreground">{branding.appName}</p>
              </div>
              {branding.tagline ? (
                <div>
                  <p className="font-semibold text-foreground">Tagline</p>
                  <p className="mt-0.5 text-muted-foreground">{branding.tagline}</p>
                </div>
              ) : null}
              {strukturBody ? (
                <div>
                  <p className="font-semibold text-foreground">Organisasi</p>
                  <p className="mt-0.5 leading-relaxed text-muted-foreground">{strukturBody}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ================= B. Struktur Organisasi ================= */}
      <section id="struktur" className="scroll-mt-20 pt-14">
        <FadeInUp className="text-center">
          <Badge variant="primary">Struktur Organisasi</Badge>
          <h2 className="mt-3 text-3xl font-bold text-foreground">
            {struktur?.title ?? "Struktur Organisasi"}
          </h2>
          {struktur?.subtitle ? (
            <p className="mt-2 text-base font-medium text-brand-secondary">{struktur.subtitle}</p>
          ) : null}
        </FadeInUp>

        {strukturGroups.length === 0 ? (
          <FadeInUp className="mt-8">
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Data struktur organisasi belum tersedia. Operator sekolah dapat mengisinya melalui
                menu Landing Page di aplikasi.
              </CardContent>
            </Card>
          </FadeInUp>
        ) : (
          <div className="mt-10 space-y-10">
            {strukturGroups.map((g) => {
              const members = Array.isArray(g["items"])
                ? (g["items"] as Array<Record<string, unknown>>)
                : [];
              return (
                <div key={str(g, "title")}>
                  <h3 className="mb-4 text-xl font-bold text-foreground">{str(g, "title")}</h3>
                  <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {members.map((m, i) => (
                      <StaggerItem key={i} className="h-full">
                        <Card className="h-full">
                          <CardContent className="flex flex-col items-center p-5 text-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-lg font-bold text-brand-primary">
                              {initials(str(m, "name"))}
                            </span>
                            <p className="mt-3 font-semibold text-foreground">{str(m, "name")}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {str(m, "position")}
                            </p>
                          </CardContent>
                        </Card>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= C. Hubungi Kami ================= */}
      <section id="kontak" className="scroll-mt-20 pt-14">
        <FadeInUp className="text-center">
          <Badge variant="primary">Hubungi Kami</Badge>
          <h2 className="mt-3 text-3xl font-bold text-foreground">
            {kontak?.title ?? "Hubungi Kami"}
          </h2>
          {kontak?.subtitle ? (
            <p className="mt-2 text-base font-medium text-brand-secondary">{kontak.subtitle}</p>
          ) : null}
        </FadeInUp>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* Info kontak + peta */}
          <FadeInUp>
            <Card className="h-full border-brand-primary/20">
              <CardHeader>
                <CardTitle>Informasi Kontak</CardTitle>
                <CardDescription>Alamat, jam layanan, dan kanal sosial media</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <dl className="grid gap-3 text-muted-foreground sm:grid-cols-2">
                  {kontakAddress ? (
                    <div>
                      <dt className="font-semibold text-foreground">Alamat</dt>
                      <dd className="mt-0.5">{kontakAddress}</dd>
                    </div>
                  ) : null}
                  {kontakPhone ? (
                    <div>
                      <dt className="font-semibold text-foreground">Telepon</dt>
                      <dd className="mt-0.5">{kontakPhone}</dd>
                    </div>
                  ) : null}
                  {kontakEmail ? (
                    <div>
                      <dt className="font-semibold text-foreground">Email</dt>
                      <dd className="mt-0.5 break-all">{kontakEmail}</dd>
                    </div>
                  ) : null}
                  {kontakHours ? (
                    <div>
                      <dt className="font-semibold text-foreground">Jam layanan</dt>
                      <dd className="mt-0.5">{kontakHours}</dd>
                    </div>
                  ) : null}
                </dl>
                {kontakWhatsapp || kontakInstagram || kontakFacebook || kontakYoutube ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {kontakWhatsapp ? (
                      <a
                        href={`https://wa.me/${kontakWhatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {kontakInstagram ? (
                      <a
                        href={kontakInstagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        Instagram
                      </a>
                    ) : null}
                    {kontakFacebook ? (
                      <a
                        href={kontakFacebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        Facebook
                      </a>
                    ) : null}
                    {kontakYoutube ? (
                      <a
                        href={kontakYoutube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        YouTube
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {kontakWhatsapp ? (
                  <div className="pt-2">
                    <a
                      href={`https://wa.me/${kontakWhatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="success">Chat WhatsApp</Button>
                    </a>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {kontakMapsEmbed ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <iframe
                  src={kontakMapsEmbed}
                  title="Lokasi sekolah"
                  className="h-64 w-full border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}
          </FadeInUp>

          {/* Form kontak demo (statis, tidak mengirim API) */}
          <FadeInUp delay={0.1}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Kirim Pesan</CardTitle>
                <CardDescription>
                  Formulir contoh (demo) — data tidak dikirim ke server.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </FadeInUp>
        </div>
      </section>

      <div className="mt-12">
        <Link href="/">
          <Button variant="outline" size="sm">
            ← Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
