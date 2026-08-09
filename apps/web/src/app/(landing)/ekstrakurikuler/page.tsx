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
 * Redesign v2 (docs/landing-design-v2.md E.6): PageHero playful
 * (play-extracurricular + blob), kartu ekskul CardPlay (badge jadwal, pembina)
 * dengan aksen gradient pink/teal/amber/indigo, pengelompokan otomatis
 * "Akhir Pekan" / "Hari Sekolah", blok manfaat, dan CTA. ISR 30s, fallback
 * aman (array kosong → empty state). Token landing v2 (--surface-soft,
 * --gradient-*, --shadow-*, --playful-*) dipakai via var() — dideklarasikan
 * di globals.css oleh task token terpisah.
 *
 * Catatan: kontrak data ekskul (name, description, schedule, coachName) belum
 * menyediakan kolom kuota, sehingga kartu tidak menampilkan angka kuota.
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

/** Gradient ikon chip & strip kartu — diputar per ekskul (pink/teal/amber/indigo). */
const CARD_GRADIENTS = [
  "var(--gradient-pink)",
  "var(--gradient-teal)",
  "var(--gradient-amber)",
  "var(--gradient-indigo)"
];

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
    <div className="bg-[var(--surface-soft)]">
      {/* Hero playful */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero-soft)" }}
      >
        <img
          src="/landing/playful/play-blob-4.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 opacity-60"
        />
        <img
          src="/landing/playful/play-blob-1.svg"
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
                Wadah pengembangan bakat &amp; minat
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
                Ekstrakurikuler
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                Beragam kegiatan ekstrakurikuler untuk mengembangkan bakat, minat, dan karakter
                peserta didik di luar jam pelajaran.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/kontak">
                  <Button
                    size="lg"
                    style={{ backgroundImage: "var(--gradient-hero)" }}
                    className="rounded-full text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
                  >
                    Daftar &amp; Bergabung
                  </Button>
                </Link>
                <Link href="/ppdb">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Info PPDB
                  </Button>
                </Link>
              </div>
              {items.length > 0 ? (
                <div className="mt-10 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur">
                    {items.length} Ekskul Aktif
                  </span>
                  {pembinaCount > 0 ? (
                    <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur">
                      {pembinaCount} Pembina
                    </span>
                  ) : null}
                  {weekendItems.length > 0 ? (
                    <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur">
                      {weekendItems.length} Ekskul Akhir Pekan
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="relative">
              <img
                src="/landing/playful/play-extracurricular.svg"
                alt="Ilustrasi ekstrakurikuler: olahraga, seni, dan kegiatan kepemimpinan"
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

      {/* Daftar ekskul berkelompok */}
      {items.length > 0 ? (
        <section
          id="ekstrakurikuler"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20"
        >
          <FadeInUp className="mx-auto max-w-2xl text-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
              style={{ backgroundImage: "var(--gradient-pink)" }}
            >
              <img
                src="/landing/playful/play-spark.svg"
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
              Jadwal Latihan
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Pilih kegiatanmu</h2>
            <p className="mt-4 text-base text-muted-foreground">
              Semua kegiatan dibimbing oleh pembina berpengalaman dan terbuka untuk setiap peserta
              didik.
            </p>
          </FadeInUp>

          <div className="mt-12 space-y-12">
            {groups.map((group, gi) => {
              if (group.list.length === 0) return null;
              const GroupIcon = group.icon;
              return (
                <div key={group.title}>
                  <FadeInUp className="flex flex-wrap items-center gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
                      style={{ backgroundImage: CARD_GRADIENTS[gi % CARD_GRADIENTS.length] }}
                    >
                      <GroupIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{group.title}</h3>
                      <p className="text-sm text-muted-foreground">{group.desc}</p>
                    </div>
                    <span className="ml-auto rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                      {group.list.length} kegiatan
                    </span>
                  </FadeInUp>
                  <StaggerContainer className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {group.list.map((e, ci) => (
                      <StaggerItem key={e.id} className="h-full">
                        <EkskulCard item={e} index={ci} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <FadeInUp>
            <Card className="rounded-3xl border-dashed shadow-[var(--shadow-soft)]">
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                  style={{ backgroundImage: "var(--gradient-pink)" }}
                >
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
        <section id="manfaat" className="scroll-mt-20 bg-[var(--surface-soft-2)] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
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
                Manfaat
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Lebih dari sekadar kegiatan
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Kegiatan di luar kelas ini menjadi ruang bertumbuh: membentuk karakter, mengasah
                bakat, dan meraih prestasi.
              </p>
            </FadeInUp>
            <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-3">
              {BENEFIT_ITEMS.map((b, i) => {
                const IconComp = b.icon;
                return (
                  <StaggerItem key={b.title} className="h-full">
                    <Card className="group relative h-full overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 top-0 h-1.5"
                        style={{ backgroundImage: CARD_GRADIENTS[i % CARD_GRADIENTS.length] }}
                      />
                      <CardContent className="flex h-full flex-col items-center p-6 text-center">
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
                          style={{ backgroundImage: CARD_GRADIENTS[i % CARD_GRADIENTS.length] }}
                        >
                          <IconComp className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <h3 className="mt-4 text-lg font-bold text-foreground">{b.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {b.desc}
                        </p>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <FadeInUp>
          <div
            className="relative overflow-hidden rounded-3xl text-white shadow-[var(--shadow-lift)]"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <img
              src="/landing/playful/play-blob-2.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-40"
            />
            <img
              src="/landing/playful/play-blob-4.svg"
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
                  src="/landing/playful/play-extracurricular.svg"
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

function EkskulCard({
  item,
  index
}: {
  item: ExtracurricularPageItem;
  index: number;
}): JSX.Element {
  const IconComp = iconFor(item.name);
  const schedule = parseSchedule(item.schedule);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundImage: gradient }}
      />
      <CardContent className="relative flex h-full flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: gradient }}
          >
            <IconComp className="h-6 w-6" aria-hidden="true" />
          </span>
          {schedule.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-soft-2)] px-3 py-1 text-xs font-bold text-[var(--accent-teal-text)]">
              <IconCalendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {schedule[0].day}
              {schedule.length > 1 ? ` +${schedule.length - 1}` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
              Jadwal menyusul
            </span>
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
                    className="h-3.5 w-3.5 shrink-0 text-[var(--playful-indigo)]"
                    aria-hidden="true"
                  />
                  {s.day}
                  {s.time ? ` · ${s.time}` : ""}
                </span>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground">
              <IconCalendar
                className="h-4 w-4 shrink-0 text-[var(--playful-indigo)]"
                aria-hidden="true"
              />
              Jadwal menyusul
            </p>
          )}
          {item.coachName ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <IconUser
                className="h-4 w-4 shrink-0 text-[var(--playful-indigo)]"
                aria-hidden="true"
              />
              {item.coachName}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
