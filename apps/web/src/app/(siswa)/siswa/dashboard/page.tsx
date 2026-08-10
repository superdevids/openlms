"use client";

import { type JSX } from "react";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  Button,
  IconAlert,
  IconBook,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconExam,
  IconGrade,
  IconQr
} from "@opensis/ui";

import { formatRelative } from "@/lib/format";
import { DEMO_EXAMS, DEMO_TASKS, DEMO_CLASSES, DEMO_GRADES } from "@/lib/demo";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";
import { dayName, mapScheduleEntry, todayDayOfWeek, type ScheduleEntryView } from "@/lib/schedule";
import {
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  EmptyStateV3,
  type StatusTone
} from "@/components/ui";

interface Exam {
  id: string;
  title: string;
  subject: string;
  className: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  subject: string;
  dueAt: string;
  status: string;
}

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  teacher: string;
}

interface GradeRow {
  subject: string;
  rata: number | null;
}

interface AttendanceSummary {
  total: number;
  alpa: number;
  kehadiranPercent: number;
}

interface RawScheduleEntry {
  id: string;
  day_of_week: number;
  start_period: number;
  end_period: number;
  room?: string | null;
  class?: { id: string; name: string } | null;
  subject?: { id: string; code: string; name: string } | null;
  teacher?: { id: string; full_name: string } | null;
}

// Tone status tugas (presentasi v3): BUKA = perlu dikerjakan, TERSUBMIT = sukses, TERLAMBAT = bahaya.
const TASK_TONE: Record<string, StatusTone> = {
  BUKA: "warning",
  TERSUBMIT: "success",
  TERLAMBAT: "danger"
};

export default function SiswaDashboardPage(): JSX.Element {
  const { user } = useAuth();
  const firstName = user?.fullName.split(" ")[0] ?? "Siswa";

  const exams = useApi<Exam[]>(() => api.get("/exam/list-for-student"), [], {
    fallbackData: DEMO_EXAMS
  });
  const tasks = useApi<Task[]>(() => api.get("/assignments"), [], { fallbackData: DEMO_TASKS });
  const classes = useApi<ClassItem[]>(() => api.get("/classes"), [], {
    fallbackData: DEMO_CLASSES
  });
  const grades = useApi<GradeRow[]>(() => api.get("/grades"), [], {
    fallbackData: DEMO_GRADES as GradeRow[]
  });
  const attendance = useApi<{ summary: AttendanceSummary }>(
    () => api.get("/attendance/rekap"),
    [],
    {
      fallbackData: { summary: { total: 0, alpa: 0, kehadiranPercent: 100 } }
    }
  );
  // "Jadwal hari ini" — read-only dari GET /schedules (filter day_of_week hari ini).
  const todaySchedule = useApi<ScheduleEntryView[]>(async () => {
    const rows = await api.get<RawScheduleEntry[]>("/schedules");
    return rows.map(mapScheduleEntry);
  }, []);
  const today = todayDayOfWeek();
  const todayEntries = (todaySchedule.data ?? [])
    .filter((s) => s.dayOfWeek === today)
    .sort((a, b) => a.periods.localeCompare(b.periods))
    .slice(0, 4);

  const ongoing = (exams.data ?? []).find((e) => e.status === "ONGOING");
  const upcomingTasks = (tasks.data ?? [])
    .filter((t) => t.status === "BUKA")
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 3);

  // Hero tenggat: tugas pertama yang jatuh tempo ≤ 24 jam (AP3 — solutif).
  const urgent = upcomingTasks.find(
    (t) => new Date(t.dueAt).getTime() - Date.now() <= 24 * 60 * 60 * 1000
  );

  // KPI dari data yang sudah dimuat (tanpa kontrak API baru).
  const openTaskCount = (tasks.data ?? []).filter((t) => t.status === "BUKA").length;
  const gradeRows = grades.data ?? [];
  const gradeAvg =
    gradeRows.length > 0
      ? gradeRows.reduce((sum, g) => sum + (g.rata ?? 0), 0) / gradeRows.length
      : null;
  const att = attendance.data?.summary;
  const attPct = att && att.total > 0 ? Math.round(att.kehadiranPercent) : null;
  const scheduledExams = (exams.data ?? []).filter(
    (e) => e.status === "ONGOING" || e.status === "SCHEDULED"
  ).length;

  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
        ? "Selamat siang"
        : hour < 18
          ? "Selamat sore"
          : "Selamat malam";

  const description = [
    openTaskCount > 0 ? `${openTaskCount} tugas menunggu dikerjakan` : "tidak ada tugas tertunda",
    ongoing ? "1 ujian sedang berlangsung" : "tidak ada ujian berlangsung"
  ].join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={description}
        actions={
          <Link href="/siswa/kalender">
            <Button variant="outline">
              <IconCalendar className="h-4 w-4" aria-hidden="true" />
              Buka Kalender
            </Button>
          </Link>
        }
      />

      {/* Hero tenggat — solutif #1 */}
      <DataView
        status={tasks.status}
        error={tasks.error}
        onRetry={tasks.refetch}
        fallbackLabel="Daftar tugas"
      >
        {tasks.data ? (
          urgent ? (
            <Card className="rounded-lg border-status-danger-border bg-status-danger-bg/60 p-5 shadow-app-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-status-danger-bg text-status-danger-fg">
                    <IconAlert className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Tenggat hari ini</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {urgent.title} · {urgent.subject} · {formatRelative(urgent.dueAt)}
                    </p>
                  </div>
                </div>
                <Link href="/siswa/tugas">
                  <Button size="sm">Kerjakan →</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="rounded-lg border-status-success-border bg-status-success-bg/60 p-5 shadow-app-card">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-status-success-bg text-status-success-fg">
                  <IconCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Semua tugas aman</p>
                  <p className="text-xs text-muted-foreground">
                    Tidak ada tugas yang mendekati tenggat dalam 24 jam.
                  </p>
                </div>
              </div>
            </Card>
          )
        ) : null}
      </DataView>

      {/* KPI */}
      <StatGrid>
        <StatCard
          label="Tugas belum dikerjakan"
          value={tasks.data ? String(openTaskCount) : "-"}
          icon={<IconClipboard className="h-5 w-5" aria-hidden="true" />}
          tone="warning"
          hint={tasks.data ? "perlu dikerjakan" : "memuat data"}
          href="/siswa/tugas"
        />
        <StatCard
          label="Rata-rata nilai"
          value={gradeAvg === null ? "-" : gradeAvg.toFixed(1)}
          icon={<IconGrade className="h-5 w-5" aria-hidden="true" />}
          tone="brand"
          hint={grades.data ? `${gradeRows.length} mapel dinilai` : "memuat data"}
          href="/siswa/nilai"
        />
        <StatCard
          label="Kehadiran bulan ini"
          value={attPct === null ? "-" : `${attPct}%`}
          icon={<IconQr className="h-5 w-5" aria-hidden="true" />}
          tone={attPct !== null && attPct < 80 ? "danger" : "success"}
          hint={
            att
              ? `alpa ${att.alpa} dari ${att.total} absensi`
              : att === undefined
                ? "memuat data"
                : "belum ada absensi"
          }
          href="/siswa/absensi"
        />
        <StatCard
          label="Ujian aktif / terjadwal"
          value={exams.data ? String(scheduledExams) : "-"}
          icon={<IconExam className="h-5 w-5" aria-hidden="true" />}
          tone="info"
          hint={exams.data ? "jadwal ujian" : "memuat data"}
          href="/siswa/ujian"
        />
      </StatGrid>

      {/* Jadwal Hari Ini */}
      <section aria-labelledby="siswa-jadwal-hari-ini">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="siswa-jadwal-hari-ini"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Jadwal Hari Ini ({dayName(today)})
          </h2>
          <Link href="/siswa/kalender" className="text-sm font-medium text-primary hover:underline">
            Lihat kalender
          </Link>
        </div>
        <DataView
          status={todaySchedule.status}
          error={todaySchedule.error}
          onRetry={todaySchedule.refetch}
          fallbackLabel="Jadwal hari ini"
        >
          {todayEntries.length === 0 ? (
            <EmptyStateV3
              compact
              title="Tidak ada jadwal hari ini"
              desc="Jadwal pelajaran Anda akan tampil di sini."
            />
          ) : (
            <ul className="space-y-2">
              {todayEntries.map((e) => (
                <li key={e.id}>
                  <div className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border bg-app-surface px-4 py-3 shadow-app-card transition-colors hover:border-brand-primary/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {e.subject}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Jam ke-{e.periods}
                        {e.className ? ` · ${e.className}` : ""}
                        {e.room ? ` · ${e.room}` : ""}
                      </span>
                    </span>
                    <StatusBadge
                      status="JAM"
                      label={`Jam ke-${e.periods.split("–")[0]}`}
                      className="shrink-0"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      {/* Ujian Aktif */}
      <section aria-labelledby="siswa-ujian-aktif">
        <div className="mb-3">
          <h2
            id="siswa-ujian-aktif"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Ujian Aktif
          </h2>
        </div>
        <DataView
          status={exams.status}
          error={exams.error}
          onRetry={exams.refetch}
          fallbackLabel="Daftar ujian"
        >
          {ongoing ? (
            <Card className="rounded-lg border-status-info-border bg-status-info-bg/60 p-5 shadow-app-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <StatusBadge status="ONGOING" label="Ujian berlangsung" className="mb-2" />
                  <p className="text-base font-semibold text-foreground">{ongoing.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ongoing.subject} · {ongoing.className} · {formatRelative(ongoing.startsAt)}
                  </p>
                </div>
                <Link href={`/siswa/ujian/${ongoing.id}`}>
                  <Button size="sm">Masuk Sesi</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <EmptyStateV3
              compact
              title="Tidak ada ujian aktif"
              desc="Ujian terjadwal akan tampil di sini saat sesi dibuka."
            />
          )}
        </DataView>
      </section>

      {/* Tugas Tenggat */}
      <section aria-labelledby="siswa-tugas-tenggat">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="siswa-tugas-tenggat"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Tugas Tenggat Terdekat
          </h2>
          <Link href="/siswa/tugas" className="text-sm font-medium text-primary hover:underline">
            Lihat semua
          </Link>
        </div>
        <DataView
          status={tasks.status}
          error={tasks.error}
          onRetry={tasks.refetch}
          fallbackLabel="Daftar tugas"
        >
          {upcomingTasks.length === 0 ? (
            <EmptyStateV3
              compact
              title="Tidak ada tugas mendatang"
              desc="Anda bebas dari tugas untuk saat ini."
            />
          ) : (
            <ul className="space-y-2">
              {upcomingTasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href="/siswa/tugas"
                    className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border bg-app-surface px-4 py-3 shadow-app-card transition-colors hover:border-brand-primary/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {t.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t.subject} · {formatRelative(t.dueAt)}
                      </span>
                    </span>
                    <StatusBadge status={t.status} mapping={TASK_TONE} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      {/* Kelas Saya */}
      <section aria-labelledby="siswa-kelas">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="siswa-kelas" className="text-base font-semibold tracking-tight text-foreground">
            Kelas Saya
          </h2>
          <Link href="/siswa/kelas" className="text-sm font-medium text-primary hover:underline">
            Lihat semua
          </Link>
        </div>
        <DataView
          status={classes.status}
          error={classes.error}
          onRetry={classes.refetch}
          fallbackLabel="Daftar kelas"
        >
          {classes.data?.length === 0 ? (
            <EmptyStateV3
              compact
              title="Belum ada kelas"
              desc="Kelas akan muncul setelah admin menambahkan Anda."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(classes.data ?? []).slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/siswa/kelas/${c.id}`} className="block h-full">
                    <Card className="flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary/60 hover:shadow-app-floating">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {c.name}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {c.subject}
                          </span>
                        </span>
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                          aria-hidden="true"
                        >
                          <IconBook className="h-5 w-5" />
                        </span>
                      </div>
                      <p className="mt-4 text-xs text-muted-foreground">Guru: {c.teacher}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <DashboardCards
        role="siswa"
        cards={DEFAULT_DASHBOARD_CARDS.siswa}
        fallbackLabel="Menu siswa"
      />
    </div>
  );
}
