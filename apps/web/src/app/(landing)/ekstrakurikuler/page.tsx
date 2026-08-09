import type { Metadata } from "next";
import type { JSX } from "react";
import { cache } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  IconBook,
  IconCalendar,
  IconCamera,
  IconChart,
  IconCheck,
  IconFlag,
  IconGrade,
  IconRocket,
  IconUser,
  type IconProps
} from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import {
  API_BASE_FALLBACK,
  API_TIMEOUT_MS,
  APP_NAME,
  FALLBACK_LANDING,
  type LandingPageData,
  type LandingSection
} from "@/lib/constants";

/**
 * Ekstrakurikuler — GET /public/landing (publik), section "ekstrakurikuler".
 * Kartu ekskul dengan badge jadwal + pembina + kuota, dikelompokkan ke
 * "Akhir Pekan" dan "Hari Sekolah" berdasarkan jadwal. ISR 30s.
 */

export const revalidate = 30;

/** URL absolut /api/v1/public/landing untuk fetch server-side. */
function landingApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? API_BASE_FALLBACK).replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) return `${base}${path}`;
  return `${base}/api/v1${path}`;
}

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

/** Peta ikon dari nilai `icon` di data landing (fallback IconBook). */
const ICON_MAP: Record<string, (props: IconProps) => JSX.Element> = {
  flag: IconFlag,
  chart: IconChart,
  rocket: IconRocket,
  camera: IconCamera,
  grade: IconGrade,
  book: IconBook
};

function iconFor(name: string): (props: IconProps) => JSX.Element {
  return ICON_MAP[name] ?? IconBook;
}

function isWeekend(schedule: string): boolean {
  return /sabtu|minggu/i.test(schedule);
}

const BENEFIT_ITEMS: Array<{
  title: string;
  desc: string;
  icon: (props: IconProps) => JSX.Element;
}> = [
  { title: "Bangun karakter", desc: "Kepemimpinan, disiplin, dan kerja sama tim.", icon: IconFlag },
  { title: "Asah bakat", desc: "Kembangkan minat di bidang yang kamu sukai.", icon: IconRocket },
  {
    title: "Raih prestasi",
    desc: "Ikut lomba hingga tingkat kabupaten dan nasional.",
    icon: IconGrade
  }
];

export async function generateMetadata(): Promise<Metadata> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "ekstrakurikuler");
  return {
    title: `${section?.title ?? "Ekstrakurikuler"} — ${APP_NAME}`,
    description: section?.subtitle ?? "Wadah pengembangan bakat dan minat peserta didik."
  };
}

export default async function EkstrakurikulerPage(): Promise<JSX.Element> {
  const landing = await getLanding();
  const section = findSection(landing.sections, "ekstrakurikuler");
  const items = extraOf(section, "items");

  const weekendItems = items.filter((e) => isWeekend(str(e, "schedule")));
  const weekdayItems = items.filter((e) => !isWeekend(str(e, "schedule")));
  const pembinaCount = new Set(items.map((e) => str(e, "pembina")).filter(Boolean)).size;

  const groups: Array<{
    title: string;
    desc: string;
    icon: (props: IconProps) => JSX.Element;
    list: Array<Record<string, unknown>>;
  }> = [
    {
      title: "Akhir Pekan",
      desc: "Latihan rutin setiap Sabtu dan Minggu pagi.",
      icon: IconFlag,
      list: weekendItems
    },
    {
      title: "Hari Sekolah",
      desc: "Latihan sore di hari belajar (Senin–Jumat).",
      icon: IconCalendar,
      list: weekdayItems
    }
  ];

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
                  <span className="text-white">{section?.title ?? "Ekstrakurikuler"}</span>
                </nav>
              </StaggerItem>
              <StaggerItem>
                {section?.subtitle ? (
                  <Badge variant="primary" className="mt-4 bg-white/15 text-white">
                    {section.subtitle}
                  </Badge>
                ) : null}
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
                  {section?.title ?? "Ekstrakurikuler"}
                </h1>
              </StaggerItem>
              {section?.body ? (
                <StaggerItem>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
                    {section.body}
                  </p>
                </StaggerItem>
              ) : null}
              <StaggerItem>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/kontak">
                    <Button
                      size="lg"
                      className="bg-card text-brand-primary hover:bg-muted dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
                    >
                      Daftar &amp; Bergabung
                    </Button>
                  </Link>
                  <Link href="/ppdb">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/60 bg-transparent text-white hover:bg-white/10"
                    >
                      Info PPDB
                    </Button>
                  </Link>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="mt-10 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
                    {items.length} Ekskul Aktif
                  </span>
                  {pembinaCount > 0 ? (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
                      {pembinaCount} Pembina
                    </span>
                  ) : null}
                  {weekendItems.length > 0 ? (
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
                      {weekendItems.length} Ekskul Akhir Pekan
                    </span>
                  ) : null}
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
          <FadeInUp className="relative">
            <img
              src="/landing/landing-eks-hero.svg"
              alt="Ilustrasi ekstrakurikuler: olahraga, seni, dan kegiatan kepemimpinan"
              className="mx-auto w-full max-w-sm drop-shadow-2xl lg:max-w-md"
              loading="eager"
            />
          </FadeInUp>
        </div>
      </section>

      {/* Daftar ekskul berkelompok */}
      {items.length > 0 ? (
        <section
          id="ekstrakurikuler"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20"
        >
          <FadeInUp>
            <Badge variant="primary">Jadwal Latihan</Badge>
            <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
              Pilih kegiatanmu
            </h2>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              Semua kegiatan dibimbing oleh pembina berpengalaman dan terbuka untuk setiap peserta
              didik sesuai kuota yang tersedia.
            </p>
          </FadeInUp>

          <div className="mt-12 space-y-12">
            {groups.map((group) => {
              if (group.list.length === 0) return null;
              const GroupIcon = group.icon;
              return (
                <div key={group.title}>
                  <FadeInUp className="flex flex-wrap items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
                      <GroupIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{group.title}</h3>
                      <p className="text-sm text-muted-foreground">{group.desc}</p>
                    </div>
                    <Badge variant="neutral" className="ml-auto">
                      {group.list.length} kegiatan
                    </Badge>
                  </FadeInUp>
                  <StaggerContainer className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {group.list.map((e) => (
                      <StaggerItem key={str(e, "title")} className="h-full">
                        <EkskulCard item={e} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Kenapa ikut ekskul */}
      {BENEFIT_ITEMS.length > 0 ? (
        <section
          id="manfaat"
          className="scroll-mt-20 border-t border-border bg-card py-16 sm:py-20"
        >
          <FadeInUp className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <Badge variant="primary">Manfaat</Badge>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
                Lebih dari sekadar kegiatan
              </h2>
            </div>
            <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-3">
              {BENEFIT_ITEMS.map((b) => {
                const IconComp = b.icon;
                return (
                  <StaggerItem key={b.title} className="h-full">
                    <div className="h-full rounded-2xl border border-border bg-background p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-xl">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-800">
                        <IconComp className="h-7 w-7" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-lg font-bold text-foreground">{b.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </FadeInUp>
        </section>
      ) : null}

      {/* CTA */}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <FadeInUp className="relative overflow-hidden rounded-3xl bg-brand-primary text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-accent opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <Badge variant="primary" className="bg-white/15 text-white">
                Bergabung
              </Badge>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Temukan minatmu di sini</h2>
              <p className="mt-3 max-w-xl text-white/90">
                Hubungi sekolah untuk info pendaftaran ekskul dan kuota setiap kegiatan, atau
                langsung daftar melalui portal PPDB.
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
                src="/landing/landing-eks-hero.svg"
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

function EkskulCard({ item }: { item: Record<string, unknown> }): JSX.Element {
  const title = str(item, "title");
  const IconComp = iconFor(str(item, "icon"));
  const schedule = str(item, "schedule");
  const pembina = str(item, "pembina");
  const kuota = str(item, "kuota");

  return (
    <Card className="group flex h-full flex-col border-border transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-xl">
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800 transition-transform duration-300 group-hover:scale-110">
            <IconComp className="h-6 w-6" aria-hidden="true" />
          </span>
          {schedule ? (
            <Badge variant="info" className="max-w-[55%] whitespace-normal text-left leading-snug">
              {schedule}
            </Badge>
          ) : null}
        </div>
        <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {str(item, "desc")}
        </p>
        <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
          {schedule ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <IconCalendar className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              {schedule}
            </p>
          ) : null}
          {pembina ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <IconUser className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              {pembina}
            </p>
          ) : null}
          {kuota ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <IconCheck className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              Kuota: {kuota}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
