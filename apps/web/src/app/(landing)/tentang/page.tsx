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
import { brandingApiUrl, type BrandingView } from "@/lib/api-client";
import { API_TIMEOUT_MS, APP_NAME, FALLBACK_BRANDING } from "@/lib/constants";
import {
  getContact,
  getSchoolProfile,
  getSchoolProfileExtra,
  getSchoolStructure
} from "@/lib/landing-pages";

/**
 * Halaman Tentang Sekolah — PAGE MANDIRI, SATU halaman berisi tiga bagian
 * (anchor): #tentang-sekolah (features + piagam), #visi-misi, #struktur.
 * Data via helper lib/landing-pages (GET /public/school-profile,
 * /public/school-profile-extra, /public/school-structure, /public/contact),
 * BUKAN potongan section dari GET /public/landing. ISR 30s; fallback aman
 * bila API offline. Header/footer otomatis dari layout (landing).
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
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{schoolName}</h1>
              <p className="mt-2 max-w-xl leading-relaxed text-white/90">
                {branding.tagline ?? "Profil singkat sekolah kami."}
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
                <Link href="#visi-misi">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/60 bg-transparent text-white hover:bg-white/10"
                  >
                    Visi &amp; Misi
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
          { href: "#visi-misi", label: "Visi & Misi" },
          { href: "#struktur", label: "Struktur Organisasi" }
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
              {extra.tentang.title || "Tentang Sekolah"}
            </h2>
          </div>
          <p className="mx-auto mt-6 max-w-3xl whitespace-pre-line text-center leading-relaxed text-muted-foreground">
            {tentangBody}
          </p>
        </FadeInUp>

        {extra.tentang.features.length > 0 ? (
          <StaggerContainer className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {extra.tentang.features.map((f) => (
              <StaggerItem key={f.title} className="h-full">
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent text-lg font-bold text-white">
                        {f.title.slice(0, 1).toUpperCase()}
                      </span>
                      <p className="font-semibold text-foreground">{f.title}</p>
                    </div>
                    {f.desc ? (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
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
              <CardTitle>Piagam &amp; Akreditasi</CardTitle>
              <CardDescription>Landasan pendirian &amp; akreditasi</CardDescription>
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

          {/* Profil singkat */}
          <Card>
            <CardHeader>
              <CardTitle>Profil Singkat</CardTitle>
              <CardDescription>Identitas sekolah</CardDescription>
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
        </div>
      </section>

      {/* ================= B. Visi & Misi ================= */}
      <section id="visi-misi" className="scroll-mt-20 pt-14">
        <FadeInUp className="text-center">
          <Badge variant="primary">Visi &amp; Misi</Badge>
          <h2 className="mt-3 text-3xl font-bold text-foreground">Visi &amp; Misi</h2>
        </FadeInUp>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Visi</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {extra.visiMisi.visi ??
                "Terwujudnya peserta didik yang beriman, bertakwa, cerdas, terampil, mandiri, dan berwawasan lingkungan."}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Misi</p>
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
                <li key={i} className="flex gap-2 text-muted-foreground">
                  <span className="font-bold text-brand-primary">{i + 1}.</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ================= C. Struktur Organisasi ================= */}
      <section id="struktur" className="scroll-mt-20 pt-14">
        <FadeInUp className="text-center">
          <Badge variant="primary">Struktur Organisasi</Badge>
          <h2 className="mt-3 text-3xl font-bold text-foreground">
            {structure.title || "Struktur Organisasi"}
          </h2>
        </FadeInUp>

        {structure.groups.length === 0 ? (
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
            {structure.groups.map((g) => (
              <div key={g.title}>
                <h3 className="mb-4 text-xl font-bold text-foreground">{g.title}</h3>
                <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {g.items.map((m, i) => (
                    <StaggerItem key={i} className="h-full">
                      <Card className="h-full">
                        <CardContent className="flex flex-col items-center p-5 text-center">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-lg font-bold text-brand-primary">
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

      {/* ================= Kontak ringkas ================= */}
      {contact.address || contact.phone || contact.email || contact.hours ? (
        <section className="mt-14 rounded-2xl border border-border bg-card p-6">
          <FadeInUp className="text-center">
            <Badge variant="primary">Hubungi Kami</Badge>
            <h2 className="mt-3 text-2xl font-bold text-foreground">Informasi Kontak</h2>
          </FadeInUp>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contact.address ? (
              <Card>
                <CardContent className="p-5 text-sm">
                  <p className="font-semibold text-foreground">Alamat</p>
                  <p className="mt-1 text-muted-foreground">{contact.address}</p>
                </CardContent>
              </Card>
            ) : null}
            {contact.phone ? (
              <Card>
                <CardContent className="p-5 text-sm">
                  <p className="font-semibold text-foreground">Telepon</p>
                  <p className="mt-1 text-muted-foreground">{contact.phone}</p>
                </CardContent>
              </Card>
            ) : null}
            {contact.email ? (
              <Card>
                <CardContent className="p-5 text-sm">
                  <p className="font-semibold text-foreground">Email</p>
                  <p className="mt-1 break-all text-muted-foreground">{contact.email}</p>
                </CardContent>
              </Card>
            ) : null}
            {contact.hours ? (
              <Card>
                <CardContent className="p-5 text-sm">
                  <p className="font-semibold text-foreground">Jam layanan</p>
                  <p className="mt-1 text-muted-foreground">{contact.hours}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
          <div className="mt-6 text-center">
            <Link href="/kontak">
              <Button size="lg">Lihat Halaman Kontak</Button>
            </Link>
          </div>
        </section>
      ) : null}

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
