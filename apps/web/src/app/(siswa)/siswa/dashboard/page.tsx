"use client";

import { type JSX } from "react";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  EmptyState
} from "@opensis/ui";

import { formatDateTime, formatRelative } from "@/lib/format";
import { DEMO_EXAMS, DEMO_TASKS, DEMO_CLASSES } from "@/lib/demo";
import { TASK_STATUS_BADGE } from "@/lib/constants";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";
import { dayName, mapScheduleEntry, todayDayOfWeek, type ScheduleEntryView } from "@/lib/schedule";

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

  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
        ? "Selamat siang"
        : hour < 18
          ? "Selamat sore"
          : "Selamat malam";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">
        {greeting}, {firstName}
      </h1>

      <DashboardCards
        role="siswa"
        cards={DEFAULT_DASHBOARD_CARDS.siswa}
        fallbackLabel="Menu siswa"
      />

      <section aria-label="Jadwal hari ini">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Jadwal Hari Ini ({dayName(today)})
          </h2>
          <Link href="/siswa/kalender" className="text-sm font-medium text-primary">
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
            <EmptyState
              title="Tidak ada jadwal hari ini"
              description="Jadwal pelajaran Anda akan tampil di sini."
            />
          ) : (
            <ul className="space-y-2">
              {todayEntries.map((e) => (
                <li key={e.id}>
                  <div className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-foreground">
                        {e.subject}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        Jam ke-{e.periods}
                        {e.className ? ` · ${e.className}` : ""}
                        {e.room ? ` · ${e.room}` : ""}
                      </span>
                    </span>
                    <Badge variant="primary">Jam {e.periods.split("–")[0]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <section aria-label="Ujian aktif">
        <DataView
          status={exams.status}
          error={exams.error}
          onRetry={exams.refetch}
          fallbackLabel="Daftar ujian"
        >
          {ongoing ? (
            <Card className="border-primary-600 bg-primary-100 dark:bg-primary-100/20 dark:text-primary-foreground">
              <CardHeader>
                <Badge variant="primary" className="w-fit">
                  Ujian aktif
                </Badge>
                <CardTitle>{ongoing.title}</CardTitle>
                <CardDescription>
                  {ongoing.subject} · {ongoing.className} · {formatDateTime(ongoing.startsAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link href={`/siswa/ujian/${ongoing.id}`}>
                  <Button>Masuk Sesi</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="Tidak ada ujian aktif"
              description="Ujian terjadwal akan tampil di sini saat sesi dibuka."
            />
          )}
        </DataView>
      </section>

      <section aria-label="Tugas tenggat terdekat">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Tugas tenggat terdekat</h2>
          <Link href="/siswa/tugas" className="text-sm font-medium text-primary">
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
            <EmptyState
              title="Tidak ada tugas mendatang"
              description="Anda bebas dari tugas untuk saat ini."
            />
          ) : (
            <ul className="space-y-2">
              {upcomingTasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href="/siswa/tugas"
                    className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-foreground">
                        {t.title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {t.subject} · {formatRelative(t.dueAt)}
                      </span>
                    </span>
                    <Badge variant={TASK_STATUS_BADGE[t.status] ?? "primary"}>{t.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <section aria-label="Kelas saya">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Kelas Saya</h2>
          <Link href="/siswa/kelas" className="text-sm font-medium text-primary">
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
            <EmptyState
              title="Belum ada kelas"
              description="Kelas akan muncul setelah admin menambahkan Anda."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(classes.data ?? []).slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/siswa/kelas/${c.id}`} className="block">
                    <Card className="h-full transition-colors hover:border-primary-600">
                      <CardHeader>
                        <CardTitle>{c.name}</CardTitle>
                        <CardDescription>{c.subject}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{c.teacher}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>
    </div>
  );
}
