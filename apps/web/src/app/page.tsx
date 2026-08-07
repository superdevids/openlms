import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchBrandingServer, type BrandingView } from "@/lib/api-client";

/**
 * Halaman depan sekolah — konten dari GET /public/landing (API).
 * Fallback default bila API offline; branding dari /app/branding (app_name + tagline).
 */

export const dynamic = "force-dynamic";

interface LandingSection {
  slug: string;
  title: string;
  subtitle: string | null;
  body: string;
  imagePath: string | null;
  sectionOrder: number;
}

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImagePath: string | null;
  author: string | null;
  publishedAt: string | null;
}

interface LandingPageData {
  sections: LandingSection[];
  berita: NewsItem[];
  beritaTotal: number;
}

/** URL absolut /api/v1/public/landing untuk fetch server-side. */
function landingApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001").replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) return `${base}${path}`;
  return `${base}/api/v1${path}`;
}

const FALLBACK_LANDING: LandingPageData = {
  sections: [
    {
      slug: "hero",
      title: "Selamat Datang",
      subtitle: "Sekolah unggulan dengan teknologi digital",
      body: "Sistem Informasi Sekolah (SIS) dan Learning Management System (LMS) terpadu untuk mendukung pembelajaran, administrasi, dan pelayanan sekolah yang modern, transparan, dan akuntabel.",
      imagePath: null,
      sectionOrder: 0
    },
    {
      slug: "tentang",
      title: "Tentang Kami",
      subtitle: "Profil singkat sekolah",
      body: "Kami adalah sekolah yang berkomitmen mencetak generasi cerdas, berkarakter, dan siap menghadapi tantangan zaman. Kurikulum kami mengintegrasikan penguasaan ilmu pengetahuan, penguatan karakter, dan kecakapan digital agar setiap peserta didik berkembang optimal.",
      imagePath: null,
      sectionOrder: 10
    },
    {
      slug: "piagam",
      title: "Visi, Misi & Piagam Sekolah",
      subtitle: "Arah dan komitmen kami",
      body: "Visi:\nTerwujudnya peserta didik yang beriman, bertakwa, cerdas, terampil, mandiri, dan berwawasan lingkungan.\n\nMisi:\n1. Menyelenggarakan pembelajaran aktif, kreatif, dan menyenangkan.\n2. Menumbuhkan budaya literasi dan numerasi.\n3. Membangun karakter peserta didik melalui pembiasaan positif.\n4. Mengembangkan bakat dan minat peserta didik.\n5. Mewujudkan lingkungan sekolah yang sehat, hijau, dan ramah anak.",
      imagePath: null,
      sectionOrder: 20
    },
    {
      slug: "kontak",
      title: "Hubungi Kami",
      subtitle: "Informasi kontak sekolah",
      body: "Alamat: Jl. Pendidikan No. 1\nTelepon: 021-0000000\nEmail: info@openlms.local\nJam layanan: Senin–Jumat, 07.00–15.00 WIB",
      imagePath: null,
      sectionOrder: 40
    }
  ],
  berita: [],
  beritaTotal: 0
};

const getBranding = cache(async (): Promise<BrandingView> => {
  try {
    return await fetchBrandingServer();
  } catch {
    return {
      appName: "openlms",
      tagline: "LMS & SIS Sekolah",
      logoUrl: null,
      faviconUrl: null,
      colors: { primary: "#2563eb", secondary: "#1d4ed8", accent: "#0ea5e9" },
      radius: null,
      configVersion: 1
    };
  }
});

const getLanding = cache(async (): Promise<LandingPageData> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
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

function LandingHeader({ branding }: { branding: BrandingView }): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-lg font-bold text-white">
            {branding.appName.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-lg font-bold text-brand-secondary">{branding.appName}</span>
        </Link>
        <nav aria-label="Navigasi landing" className="hidden items-center gap-5 md:flex">
          <Link
            href="/#tentang"
            className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
          >
            Tentang
          </Link>
          <Link
            href="/#piagam"
            className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
          >
            Piagam
          </Link>
          <Link
            href="/berita"
            className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
          >
            Berita
          </Link>
          <Link
            href="/#kontak"
            className="text-sm font-medium text-neutral-700 hover:text-brand-primary"
          >
            Kontak
          </Link>
        </nav>
        <Link href="/login">
          <Button size="sm">Masuk</Button>
        </Link>
      </div>
    </header>
  );
}

function LandingFooter({ branding }: { branding: BrandingView }): React.JSX.Element {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-base font-semibold text-brand-secondary">{branding.appName}</p>
            <p className="text-sm text-neutral-600">
              LMS & SIS Sekolah — platform digital terpadu.
            </p>
          </div>
          <div className="flex gap-5 text-sm text-neutral-600">
            <Link href="/login" className="hover:text-brand-primary">
              Masuk
            </Link>
            <Link href="/berita" className="hover:text-brand-primary">
              Berita
            </Link>
          </div>
        </div>
        <p className="mt-6 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
          © {new Date().getFullYear()} {branding.appName}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return {
    title: b.appName ? `${b.appName} — Website Resmi Sekolah` : "openlms — Website Resmi Sekolah",
    description: b.tagline ?? "LMS & SIS Sekolah"
  };
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const [branding, landing] = await Promise.all([getBranding(), getLanding()]);
  const hero = findSection(landing.sections, "hero");
  const tentang = findSection(landing.sections, "tentang");
  const piagam =
    findSection(landing.sections, "piagam") ?? findSection(landing.sections, "visi-misi");
  const kontak = findSection(landing.sections, "kontak");
  const berita = landing.berita.slice(0, 6);

  return (
    <div className="min-h-screen bg-neutral-50">
      <LandingHeader branding={branding} />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-brand-primary text-white">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <div className="max-w-2xl">
              {hero?.subtitle ? (
                <Badge variant="primary" className="mb-4 bg-white/15 text-white">
                  {hero.subtitle}
                </Badge>
              ) : null}
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                {branding.appName}
              </h1>
              <p className="mt-3 text-lg font-medium text-white/90">
                {branding.tagline ?? hero?.title ?? "LMS & SIS Sekolah"}
              </p>
              {hero?.body ? (
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85">{hero.body}</p>
              ) : null}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login">
                  <Button size="lg" className="bg-white text-brand-primary hover:bg-neutral-100">
                    Masuk ke Aplikasi
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
            </div>
          </div>
        </section>

        {/* Tentang */}
        {tentang ? (
          <section id="tentang" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <Badge variant="primary">Tentang</Badge>
                <h2 className="mt-3 text-3xl font-bold text-neutral-900">{tentang.title}</h2>
                {tentang.subtitle ? (
                  <p className="mt-2 text-base font-medium text-brand-secondary">
                    {tentang.subtitle}
                  </p>
                ) : null}
                <p className="mt-4 whitespace-pre-line leading-relaxed text-neutral-700">
                  {tentang.body}
                </p>
              </div>
              <Card className="border-brand-primary/20 bg-white">
                <CardHeader>
                  <CardTitle className="text-brand-secondary">Mengapa memilih kami?</CardTitle>
                  <CardDescription>Nilai utama sekolah kami.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FeatureRow
                    title="Pembelajaran modern"
                    desc="Kurikulum aktif, kreatif, dan menyenangkan."
                  />
                  <FeatureRow
                    title="Teknologi terpadu"
                    desc="LMS & SIS dalam satu platform digital."
                  />
                  <FeatureRow
                    title="Karakter unggul"
                    desc="Pembiasaan positif dan penguatan budi pekerti."
                  />
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {/* Piagam / Visi Misi */}
        {piagam ? (
          <section id="piagam" className="scroll-mt-20 bg-brand-secondary py-16 text-white">
            <div className="mx-auto max-w-4xl px-4">
              <Badge variant="primary" className="bg-white/15 text-white">
                Piagam
              </Badge>
              <h2 className="mt-3 text-3xl font-bold">{piagam.title}</h2>
              {piagam.subtitle ? (
                <p className="mt-2 text-base font-medium text-white/85">{piagam.subtitle}</p>
              ) : null}
              <div className="mt-6 rounded-2xl bg-white/10 p-6 backdrop-blur sm:p-8">
                <p className="whitespace-pre-line leading-relaxed text-white/95">{piagam.body}</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Berita */}
        <section id="berita" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <div className="flex items-end justify-between gap-3">
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
          </div>
          {berita.length === 0 ? (
            <Card className="mt-8">
              <CardContent className="p-6 text-sm text-neutral-500">
                Belum ada berita. Operator sekolah dapat menambahkan berita melalui menu Landing
                Page di aplikasi.
              </CardContent>
            </Card>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {berita.map((item) => (
                <Link key={item.id} href={`/berita/${item.slug}`} className="block">
                  <Card className="h-full transition-colors hover:border-brand-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="neutral">{formatTanggal(item.publishedAt)}</Badge>
                        {item.author ? (
                          <span className="text-xs text-neutral-500">{item.author}</span>
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
              ))}
            </div>
          )}
        </section>

        {/* Kontak */}
        {kontak ? (
          <section id="kontak" className="scroll-mt-20 border-t border-neutral-200 bg-white py-16">
            <div className="mx-auto max-w-4xl px-4">
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
                <CardContent className="p-6">
                  <p className="whitespace-pre-line text-center leading-relaxed text-neutral-700">
                    {kontak.body}
                  </p>
                </CardContent>
              </Card>
            </div>
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
