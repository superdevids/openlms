import type { Metadata } from "next";
import type { JSX } from "react";
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
  IconFlag,
  IconGrade,
  IconRocket,
  IconUser,
  type IconProps
} from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { getExtracurriculars, type ExtracurricularPageItem } from "@/lib/landing-pages";
import { APP_NAME } from "@/lib/constants";

/**
 * Ekstrakurikuler — GET /public/extracurriculars (publik, per-halaman).
 * Data nyata dari tabel Extracurricular (seed). Kartu ekskul dengan badge
 * jadwal (array {day, time}) + pembina, dikelompokkan ke "Akhir Pekan" dan
 * "Hari Sekolah" berdasarkan jadwal. ISR 30s, fallback aman (array kosong →
 * empty state "Data sedang disiapkan") bila tabel belum di-seed / API mati.
 * Fetch via helper lib/landing-pages.ts (getExtracurriculars) — satu sumber
 * fetch + timeout agar tidak menggantung saat build.
 */

export const revalidate = 30;

interface ScheduleEntry {
  day: string;
  time: string;
}

/** Parse schedule JSON ({ day, time }[]) dengan aman — non-array → []. */
function parseSchedule(schedule: unknown): ScheduleEntry[] {
  if (!Array.isArray(schedule)) return [];
  return schedule.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const rec = entry as Record<string, unknown>;
    const day = typeof rec.day === "string" ? rec.day : "";
    const time = typeof rec.time === "string" ? rec.time : "";
    if (!day && !time) return [];
    return [{ day, time }];
  });
}

function isWeekend(entries: ScheduleEntry[]): boolean {
  return entries.some((e) => /sabtu|minggu/i.test(e.day));
}

/** Peta ikon per nama ekskul (data API tidak membawa icon). Fallback IconBook. */
const ICON_BY_NAME: Record<string, (props: IconProps) => JSX.Element> = {
  Pramuka: IconFlag,
  Paskibra: IconFlag,
  Futsal: IconChart,
  Basket: IconChart,
  Robotik: IconRocket,
  "Seni Tari": IconCamera,
  "Paduan Suara": IconGrade,
  "English Club": IconBook,
  Rohis: IconBook,
  PMR: IconGrade
};

function iconFor(name: string): (props: IconProps) => JSX.Element {
  return ICON_BY_NAME[name] ?? IconBook;
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

export const metadata: Metadata = {
  title: `Ekstrakurikuler — ${APP_NAME}`,
  description: "Wadah pengembangan bakat dan minat peserta didik."
};

export default async function EkstrakurikulerPage(): Promise<JSX.Element> {
  const items = await getExtracurriculars();

  const weekendItems = items.filter((e) => isWeekend(parseSchedule(e.schedule)));
  const weekdayItems = items.filter((e) => !isWeekend(parseSchedule(e.schedule)));
  const pembinaCount = new Set(items.map((e) => e.coachName).filter(Boolean)).size;

  const groups: Array<{
    title: string;
    desc: string;
    icon: (props: IconProps) => JSX.Element;
    list: ExtracurricularPageItem[];
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
                  <span className="text-white">Ekstrakurikuler</span>
                </nav>
              </StaggerItem>
              <StaggerItem>
                <Badge variant="primary" className="mt-4 bg-white/15 text-white">
                  Wadah pengembangan bakat &amp; minat
                </Badge>
              </StaggerItem>
              <StaggerItem>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
                  Ekstrakurikuler
                </h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
                  Beragam kegiatan ekstrakurikuler untuk mengembangkan bakat, minat, dan karakter
                  peserta didik di luar jam pelajaran.
                </p>
              </StaggerItem>
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
              didik.
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
                      <StaggerItem key={e.id} className="h-full">
                        <EkskulCard item={e} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <FadeInUp>
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-800">
                  <IconBook className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="text-base font-semibold text-foreground">Data sedang disiapkan</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Daftar ekstrakurikuler belum tersedia. Operator sekolah dapat menambahkannya
                  melalui menu kesiswaan di aplikasi. Silakan kembali lagi nanti.
                </p>
              </CardContent>
            </Card>
          </FadeInUp>
        </section>
      )}

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

function EkskulCard({ item }: { item: ExtracurricularPageItem }): JSX.Element {
  const IconComp = iconFor(item.name);
  const schedule = parseSchedule(item.schedule);

  return (
    <Card className="group flex h-full flex-col border-border transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary hover:shadow-xl">
      <CardContent className="flex h-full flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800 transition-transform duration-300 group-hover:scale-110">
            <IconComp className="h-6 w-6" aria-hidden="true" />
          </span>
          {schedule.length > 0 ? (
            <Badge variant="info" className="max-w-[55%] whitespace-normal text-left leading-snug">
              {schedule[0].day}
              {schedule.length > 1 ? ` +${schedule.length - 1}` : ""}
            </Badge>
          ) : (
            <Badge variant="neutral">Jadwal menyusul</Badge>
          )}
        </div>
        <h3 className="mt-4 text-lg font-bold text-foreground">{item.name}</h3>
        {item.description ? (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
          {schedule.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {schedule.map((s) => (
                <span
                  key={`${s.day}-${s.time}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  <IconCalendar
                    className="h-3.5 w-3.5 shrink-0 text-brand-primary"
                    aria-hidden="true"
                  />
                  {s.day}
                  {s.time ? ` · ${s.time}` : ""}
                </span>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground">
              <IconCalendar className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              Jadwal menyusul
            </p>
          )}
          {item.coachName ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <IconUser className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
              {item.coachName}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
