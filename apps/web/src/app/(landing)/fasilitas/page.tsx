import type { Metadata } from "next";
import type { JSX } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  IconAcademic,
  IconBook,
  IconCamera,
  IconChart,
  IconCheck,
  IconDatabase,
  IconRefresh,
  IconSettings,
  IconWallet,
  type IconProps
} from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { getFacilities, type FacilityItem } from "@/lib/landing-pages";
import { APP_NAME } from "@/lib/constants";

/**
 * Fasilitas — GET /public/facilities (publik, per-halaman) via helper
 * lib/landing-pages.ts. Grid sarana dengan ikon besar + hover premium,
 * blok fasilitas unggulan, dan alasan memilih fasilitas sekolah. ISR 30s,
 * fallback aman (items kosong → empty state).
 */

export const revalidate = 30;

function str(record: FacilityItem | null | undefined, key: "title" | "desc" | "icon"): string {
  const v = record?.[key];
  return typeof v === "string" ? v : "";
}

/** Peta ikon dari nilai `icon` di data fasilitas (fallback IconBook). */
const ICON_MAP: Record<string, (props: IconProps) => JSX.Element> = {
  database: IconDatabase,
  book: IconBook,
  settings: IconSettings,
  chart: IconChart,
  wallet: IconWallet,
  refresh: IconRefresh,
  camera: IconCamera
};

function iconFor(name: string): (props: IconProps) => JSX.Element {
  return ICON_MAP[name] ?? IconBook;
}

/** Catatan ringan untuk fasilitas unggulan — hanya dipakai saat judul cocok. */
const HIGHLIGHT_NOTE: Record<string, string> = {
  "Laboratorium Komputer": "Praktik jaringan, pemrograman, dan uji kompetensi dalam satu ruang.",
  "Studio Multimedia": "Produksi konten, podcast, dan animasi dengan perangkat standar industri.",
  "Bengkel Praktik Otomotif": "Area praktik dengan standar bengkel industri untuk TKR dan TSM."
};

const HIGHLIGHT_TITLES = ["Laboratorium Komputer", "Studio Multimedia", "Bengkel Praktik Otomotif"];

const REASON_ITEMS: Array<{
  title: string;
  desc: string;
  icon: (props: IconProps) => JSX.Element;
}> = [
  {
    title: "Nyaman untuk belajar",
    desc: "Ruang bersih, aman, dan mendukung fokus.",
    icon: IconAcademic
  },
  {
    title: "Teknologi terpadu",
    desc: "Internet dan perangkat digital di area utama.",
    icon: IconDatabase
  },
  {
    title: "Standar industri",
    desc: "Peralatan praktik mengikuti kebutuhan DUDI.",
    icon: IconCheck
  },
  { title: "Akses mudah", desc: "Fasilitas dapat digunakan semua peserta didik.", icon: IconWallet }
];

export async function generateMetadata(): Promise<Metadata> {
  const facilities = await getFacilities();
  return {
    title: `${facilities.title || "Fasilitas"} — ${APP_NAME}`,
    description: "Sarana dan prasarana pendukung pembelajaran."
  };
}

export default async function FasilitasPage(): Promise<JSX.Element> {
  const facilities = await getFacilities();
  const items = facilities.items;

  const chips: string[] = [`${items.length} Fasilitas`];
  if (items.some((f) => str(f, "title").toLowerCase().includes("wifi"))) chips.push("Area WiFi");
  if (items.some((f) => /lab|bengkel/i.test(str(f, "title")))) chips.push("Lab & Bengkel");

  const highlighted = HIGHLIGHT_TITLES.map((t) => items.find((f) => str(f, "title") === t)).filter(
    (f): f is FacilityItem => Boolean(f)
  );
  const unggulan = highlighted.length >= 2 ? highlighted : items.slice(0, 3);

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
                  <span className="text-white">{facilities.title || "Fasilitas"}</span>
                </nav>
              </StaggerItem>
              <StaggerItem>
                <Badge variant="primary" className="mt-4 bg-white/15 text-white">
                  Sarana &amp; prasarana pendukung
                </Badge>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
                  {facilities.title || "Fasilitas Sekolah"}
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
                  Fasilitas belajar yang memadai untuk mendukung proses pembelajaran yang nyaman dan
                  berkualitas.
                </p>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/kontak">
                    <Button
                      size="lg"
                      className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                    >
                      Jadwalkan Kunjungan
                    </Button>
                  </Link>
                  <Link href="/ppdb">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/60 bg-transparent text-white hover:bg-white/10"
                    >
                      Daftar PPDB
                    </Button>
                  </Link>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-10 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
          <FadeInUp className="relative">
            <img
              src="/landing/landing-fac-hero.svg"
              alt="Ilustrasi fasilitas sekolah: gedung, lapangan, dan lingkungan hijau"
              className="mx-auto w-full max-w-sm drop-shadow-2xl lg:max-w-md"
              loading="eager"
            />
          </FadeInUp>
        </div>
      </section>

      {/* Grid fasilitas */}
      {items.length > 0 ? (
        <section id="fasilitas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
          <FadeInUp>
            <Badge variant="primary">Sarana &amp; Prasarana</Badge>
            <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Semua kebutuhan belajar tersedia
            </h2>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              Fasilitas dirancang agar setiap peserta didik nyaman belajar, berlatih, dan
              mengembangkan diri sepanjang hari di sekolah.
            </p>
          </FadeInUp>
          <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((f) => {
              const IconComp = iconFor(str(f, "icon"));
              return (
                <StaggerItem key={str(f, "title")} className="h-full">
                  <Card className="group h-full border-border transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-xl">
                    <CardContent className="flex h-full flex-col p-6">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-800 transition-transform duration-300 group-hover:scale-110">
                        <IconComp className="h-7 w-7" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-lg font-bold text-foreground">{str(f, "title")}</h3>
                      {str(f, "desc") ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {str(f, "desc")}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
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
                  Data fasilitas belum tersedia
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Operator sekolah dapat mengisinya melalui menu Landing Page di aplikasi. Silakan
                  kembali lagi nanti.
                </p>
              </CardContent>
            </Card>
          </FadeInUp>
        </section>
      )}

      {/* Fasilitas unggulan */}
      {unggulan.length > 0 ? (
        <section
          id="unggulan"
          className="scroll-mt-20 border-t border-border bg-card py-16 sm:py-20"
        >
          <FadeInUp className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <Badge variant="primary">Fasilitas Unggulan</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                Andalan kami untuk praktik
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                Tiga fasilitas yang paling sering digunakan untuk kegiatan praktik dan produksi.
              </p>
            </div>
            <StaggerContainer className="mt-10 grid gap-5 lg:grid-cols-3">
              {unggulan.map((f) => {
                const title = str(f, "title");
                const IconComp = iconFor(str(f, "icon"));
                const note = HIGHLIGHT_NOTE[title] ?? str(f, "desc");
                return (
                  <StaggerItem key={title} className="h-full">
                    <Card className="group h-full border-border transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-xl">
                      <CardContent className="flex h-full flex-col gap-4 p-6 sm:flex-row sm:items-start">
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary transition-transform duration-300 group-hover:scale-110">
                          <IconComp className="h-8 w-8" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-foreground">{title}</h3>
                            <Badge variant="primary">Unggulan</Badge>
                          </div>
                          {note ? (
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {note}
                            </p>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </FadeInUp>
        </section>
      ) : null}

      {/* Kenapa fasilitas kami */}
      <section id="kenapa" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
        <FadeInUp>
          <Badge variant="primary">Kenapa Fasilitas Kami</Badge>
          <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
            Belajar jadi lebih nyaman
          </h2>
        </FadeInUp>
        <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASON_ITEMS.map((r) => {
            const IconComp = r.icon;
            return (
              <StaggerItem key={r.title} className="h-full">
                <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-xl">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
                    <IconComp className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">{r.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* CTA */}
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20">
        <FadeInUp className="relative overflow-hidden rounded-3xl bg-brand-primary text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-accent opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <Badge variant="primary" className="bg-white/15 text-white">
                Kunjungan Sekolah
              </Badge>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Rasakan pengalaman belajarnya</h2>
              <p className="mt-3 max-w-xl text-white/90">
                Hubungi kami untuk menjadwalkan kunjungan sekolah atau bertanya seputar PPDB dan
                fasilitas yang tersedia.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/kontak">
                  <Button
                    size="lg"
                    className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                  >
                    Hubungi Kami
                  </Button>
                </Link>
                <Link href="/ppdb">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/60 bg-transparent text-white hover:bg-white/10"
                  >
                    Daftar PPDB
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <img
                src="/landing/landing-fac-hero.svg"
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
