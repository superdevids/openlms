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
 * lib/landing-pages.ts. Redesign v2 (docs/landing-design-v2.md E.5):
 * PageHero playful (play-facility + blob), grid CardPlay ikon besar + hover
 * lift, blok "Fasilitas Unggulan", "Kenapa Fasilitas Kami", dan CTA kunjungan.
 * ISR 30s, fallback aman (items kosong → empty state). Token landing v2
 * (--surface-soft, --gradient-*, --shadow-*, --playful-*) dipakai via var() —
 * dideklarasikan di globals.css oleh task token terpisah.
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

/** Gradient aksen strip atas kartu — diputar per kartu (LP3: maks 2 aksen/blok). */
const STRIP_GRADIENTS = [
  "var(--gradient-indigo)",
  "var(--gradient-pink)",
  "var(--gradient-teal)",
  "var(--gradient-amber)"
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
    <div className="bg-[var(--surface-soft)]">
      {/* Hero playful */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero-soft)" }}
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
                Sarana &amp; prasarana pendukung
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
                {facilities.title || "Fasilitas Sekolah"}
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                Fasilitas belajar yang memadai untuk mendukung proses pembelajaran yang nyaman dan
                berkualitas.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/kontak">
                  <Button
                    size="lg"
                    style={{ backgroundImage: "var(--gradient-hero)" }}
                    className="rounded-full text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
                  >
                    Jadwalkan Kunjungan
                  </Button>
                </Link>
                <Link href="/ppdb">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Daftar PPDB
                  </Button>
                </Link>
              </div>
              {items.length > 0 ? (
                <div className="mt-10 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="relative">
              <img
                src="/landing/playful/play-facility.svg"
                alt="Ilustrasi fasilitas sekolah: gedung, lapangan, dan lingkungan hijau"
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

      {/* Grid fasilitas */}
      {items.length > 0 ? (
        <section id="fasilitas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
          <FadeInUp className="mx-auto max-w-2xl text-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
              style={{ backgroundImage: "var(--gradient-indigo)" }}
            >
              <img
                src="/landing/playful/play-spark.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
              Sarana &amp; Prasarana
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Semua kebutuhan belajar tersedia
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Fasilitas dirancang agar setiap peserta didik nyaman belajar, berlatih, dan
              mengembangkan diri sepanjang hari di sekolah.
            </p>
          </FadeInUp>
          <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((f, i) => {
              const IconComp = iconFor(str(f, "icon"));
              return (
                <StaggerItem key={str(f, "title")} className="h-full">
                  <Card className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-1.5"
                      style={{ backgroundImage: STRIP_GRADIENTS[i % STRIP_GRADIENTS.length] }}
                    />
                    <CardContent className="relative flex h-full flex-col p-6">
                      <span
                        className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-105"
                        style={{ backgroundImage: "var(--gradient-indigo)" }}
                      >
                        <IconComp className="h-8 w-8" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-lg font-bold text-foreground">{str(f, "title")}</h3>
                      {str(f, "desc") ? (
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
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
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <FadeInUp>
            <Card className="rounded-3xl border-dashed shadow-[var(--shadow-soft)]">
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                  style={{ backgroundImage: "var(--gradient-indigo)" }}
                >
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
        <section id="unggulan" className="scroll-mt-20 bg-[var(--surface-soft-2)] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <FadeInUp className="mx-auto max-w-2xl text-center">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
                style={{ backgroundImage: "var(--gradient-teal)" }}
              >
                <img
                  src="/landing/playful/play-spark.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                Fasilitas Unggulan
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Andalan kami untuk praktik
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Tiga fasilitas yang paling sering digunakan untuk kegiatan praktik dan produksi.
              </p>
            </FadeInUp>
            <StaggerContainer className="mt-10 grid gap-5 lg:grid-cols-3">
              {unggulan.map((f) => {
                const title = str(f, "title");
                const IconComp = iconFor(str(f, "icon"));
                const note = HIGHLIGHT_NOTE[title] ?? str(f, "desc");
                return (
                  <StaggerItem key={title} className="h-full">
                    <Card className="group relative h-full overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-1.5"
                        style={{ backgroundImage: "var(--gradient-teal)" }}
                      />
                      <CardContent className="flex h-full flex-col gap-4 p-6 sm:flex-row sm:items-start">
                        <span
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: "var(--gradient-teal)" }}
                        >
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
          </div>
        </section>
      ) : null}

      {/* Kenapa fasilitas kami */}
      <section id="kenapa" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
        <FadeInUp className="mx-auto max-w-2xl text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
            style={{ backgroundImage: "var(--gradient-indigo)" }}
          >
            <img
              src="/landing/playful/play-spark.svg"
              alt=""
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />
            Kenapa Fasilitas Kami
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Belajar jadi lebih nyaman
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Fasilitas sekolah dirancang dengan standar yang membuat kegiatan belajar terasa ringan
            dan menyenangkan.
          </p>
        </FadeInUp>
        <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASON_ITEMS.map((r, i) => {
            const IconComp = r.icon;
            return (
              <StaggerItem key={r.title} className="h-full">
                <Card className="group relative h-full overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ backgroundImage: STRIP_GRADIENTS[i % STRIP_GRADIENTS.length] }}
                  />
                  <CardContent className="flex h-full flex-col p-6">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
                      style={{ backgroundImage: "var(--gradient-indigo)" }}
                    >
                      <IconComp className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-bold text-foreground">{r.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </section>

      {/* CTA kunjungan */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <FadeInUp>
          <div
            className="relative overflow-hidden rounded-3xl text-white shadow-[var(--shadow-lift)]"
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
                <Badge variant="primary" className="bg-white/15 text-white">
                  Kunjungan Sekolah
                </Badge>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                  Rasakan pengalaman belajarnya
                </h2>
                <p className="mt-3 max-w-xl text-white/90">
                  Hubungi kami untuk menjadwalkan kunjungan sekolah atau bertanya seputar PPDB dan
                  fasilitas yang tersedia.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/kontak">
                    <Button
                      size="lg"
                      className="rounded-full bg-white text-brand-primary hover:bg-white/90"
                    >
                      Hubungi Kami
                    </Button>
                  </Link>
                  <Link href="/ppdb">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/60 bg-transparent text-white hover:bg-white/10"
                    >
                      Daftar PPDB
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <img
                  src="/landing/playful/play-facility.svg"
                  alt=""
                  aria-hidden="true"
                  className="mx-auto w-full max-w-sm"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </FadeInUp>
      </section>
    </div>
  );
}
