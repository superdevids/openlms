"use client";

import { type JSX } from "react";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  IconBook,
  IconChart,
  IconChevronRight,
  IconExam,
  IconGrade
} from "@opensis/ui";

import { formatDateTime } from "@/lib/format";
import { DEMO_CLASSES, DEMO_SUBMISSIONS } from "@/lib/demo";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";
import {
  PageHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  DataTable,
  EmptyStateV3
} from "@/components/ui";

interface ClassSubjectItem {
  id: string;
  class: { id: string; name: string };
  subject: { id: string; code: string; name: string };
}

interface ClassSubjectRecap {
  classSubject: { id: string; className: string; subjectName: string };
  semester: string | null;
  students: Array<{ studentId: string; recap: { average?: number | null } }>;
}

interface ClassSubjectRecapView {
  id: string;
  classId: string;
  className: string;
  subjectName: string;
  average: number | null;
  students: number;
}

interface ExamSchedule {
  id: string;
  title: string;
  status?: string;
  created_at?: string;
}

interface Assignment {
  id: string;
  title: string;
  status: string;
  dueAt: string;
  _count?: { submissions: number };
}

export default function GuruDashboardPage(): JSX.Element {
  const classes = useApi<{ id: string; name: string; subject: string }[]>(
    () => api.get("/classes"),
    [],
    { fallbackData: DEMO_CLASSES }
  );
  const exams = useApi<ExamSchedule[]>(
    async () => {
      const res = await api.get<{ items: ExamSchedule[]; total: number }>("/exam");
      return res.items ?? [];
    },
    [],
    { fallbackData: [] }
  );
  // Kontrak R-08: Assignment TIDAK punya field score — yang perlu dinilai adalah
  // submission. Rekap grading memakai jumlah submission per assignment (real).
  const assignments = useApi<Assignment[]>(() => api.get<Assignment[]>("/assignments"), [], {
    fallbackData: DEMO_SUBMISSIONS as unknown as Assignment[]
  });
  const gradingRecap = (assignments.data ?? []).reduce(
    (sum, a) => sum + (a._count?.submissions ?? 0),
    0
  );
  const pendingGrade = (assignments.data ?? []).filter(
    (a) => a._count && a._count.submissions > 0
  ).length;
  const pendingAssignments = (assignments.data ?? []).filter(
    (a) => a._count && a._count.submissions > 0
  );

  // Rekap nilai kelas (read-only) — GET /class-subjects (GURU: mapel yang
  // diampu) + GET /grades/recap/class-subject/:id untuk 3 mapel pertama.
  const recaps = useApi<ClassSubjectRecapView[]>(async () => {
    const subjects = await api.get<ClassSubjectItem[]>("/class-subjects");
    const top = subjects.slice(0, 3);
    const results = await Promise.all(
      top.map(async (cs): Promise<ClassSubjectRecapView> => {
        try {
          const recap = await api.get<ClassSubjectRecap>(`/grades/recap/class-subject/${cs.id}`);
          const scores = recap.students
            .map((s) => s.recap.average)
            .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
          const average =
            scores.length > 0
              ? Math.round((scores.reduce((sum, v) => sum + v, 0) / scores.length) * 10) / 10
              : null;
          return {
            id: cs.id,
            classId: cs.class.id,
            className: cs.class.name,
            subjectName: cs.subject.name,
            average,
            students: recap.students.length
          };
        } catch {
          return {
            id: cs.id,
            classId: cs.class.id,
            className: cs.class.name,
            subjectName: cs.subject.name,
            average: null,
            students: 0
          };
        }
      })
    );
    return results;
  }, []);

  const averages = (recaps.data ?? []).map((r) => r.average).filter((v): v is number => v !== null);
  const latestAverage =
    averages.length > 0
      ? Math.round((averages.reduce((sum, v) => sum + v, 0) / averages.length) * 10) / 10
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Beranda Guru"
        description="Pantau kelas, penilaian, dan jadwal ujian dalam satu workspace."
        actions={
          <>
            <Link href="/guru/materi">
              <Button variant="outline" size="sm">
                Buat Materi
              </Button>
            </Link>
            <Link href="/guru/tugas">
              <Button size="sm">Buat Tugas</Button>
            </Link>
          </>
        }
      />

      <StatGrid>
        <StatCard
          label="Perlu dinilai"
          value={String(gradingRecap)}
          icon={<IconGrade className="h-5 w-5" />}
          tone={gradingRecap > 0 ? "danger" : "success"}
          hint={pendingGrade > 0 ? `${pendingGrade} tugas menunggu` : "Antrean bersih"}
          href="/guru/penilaian"
        />
        <StatCard
          label="Kelas diampu"
          value={String(classes.data?.length ?? 0)}
          icon={<IconBook className="h-5 w-5" />}
          tone="brand"
          hint="Mapel yang Anda ampu"
          href="/guru/kelas"
        />
        <StatCard
          label="Ujian terjadwal"
          value={String(exams.data?.length ?? 0)}
          icon={<IconExam className="h-5 w-5" />}
          tone="info"
          hint="Jadwal & sesi ujian"
          href="/guru/ujian"
        />
        <StatCard
          label="Rata-rata nilai"
          value={latestAverage !== null ? String(latestAverage) : "—"}
          icon={<IconChart className="h-5 w-5" />}
          tone="success"
          hint="Rekap kelas terbaru"
          href="/guru/kelas"
        />
      </StatGrid>

      <DashboardCards role="guru" cards={DEFAULT_DASHBOARD_CARDS.guru} fallbackLabel="Menu guru" />

      <section aria-labelledby="pending-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="pending-heading" className="text-base font-semibold tracking-tight">
            Perlu dinilai
          </h2>
          {pendingGrade > 0 ? (
            <Link
              href="/guru/penilaian"
              className="touch-target flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline"
            >
              Buka penilaian
              <IconChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        <DataView
          status={assignments.status}
          error={assignments.error}
          onRetry={assignments.refetch}
          fallbackLabel="Rekap penilaian"
        >
          {pendingGrade === 0 ? (
            <EmptyStateV3
              icon={<IconGrade className="h-5 w-5" />}
              title="Tidak ada submission menunggu"
              desc="Submission siswa akan tampil di sini saat tugas diterima."
            />
          ) : (
            <ul className="space-y-3">
              {pendingAssignments.map((a) => (
                <li key={a.id}>
                  <Card className="rounded-lg border-border bg-app-surface shadow-app-card transition-colors hover:border-primary/40">
                    <CardContent className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {a.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {a._count?.submissions ?? 0} submission · status {a.status}
                        </span>
                      </span>
                      <StatusBadge
                        status="NEEDS_GRADING"
                        mapping={{ NEEDS_GRADING: "danger" }}
                        label={`${a._count?.submissions ?? 0} perlu dinilai`}
                      />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <section aria-labelledby="classes-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="classes-heading" className="text-base font-semibold tracking-tight">
            Kelas Saya
          </h2>
          <Link
            href="/guru/kelas"
            className="touch-target flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline"
          >
            Lihat semua
            <IconChevronRight className="h-4 w-4" aria-hidden="true" />
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
              icon={<IconBook className="h-5 w-5" />}
              title="Belum ada kelas"
              desc="Kelas di-assign oleh admin sekolah."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(classes.data ?? []).map((c) => (
                <li key={c.id}>
                  <Link href={`/guru/kelas/${c.id}`} className="group block h-full">
                    <Card className="flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-floating">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-sm font-semibold">{c.name}</CardTitle>
                          <CardDescription className="mt-0.5 truncate text-xs text-muted-foreground">
                            {c.subject}
                          </CardDescription>
                        </div>
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                          aria-hidden="true"
                        >
                          <IconBook className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                        <span>Kelola Kelas</span>
                        <IconChevronRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <section aria-labelledby="recap-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recap-heading" className="text-base font-semibold tracking-tight">
            Rekap Nilai Kelas
          </h2>
          <Link
            href="/guru/kelas"
            className="touch-target flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline"
          >
            Lihat semua kelas
            <IconChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <DataView
          status={recaps.status}
          error={recaps.error}
          onRetry={recaps.refetch}
          fallbackLabel="Rekap nilai kelas"
        >
          {recaps.data?.length === 0 ? (
            <EmptyStateV3
              icon={<IconChart className="h-5 w-5" />}
              title="Belum ada rekap nilai"
              desc="Nilai siswa akan tampil setelah guru mencatat penilaian."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(recaps.data ?? []).map((r) => (
                <li key={r.id}>
                  <Link href={`/guru/kelas/${r.classId}`} className="block h-full">
                    <Card className="h-full rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-colors hover:border-primary/40">
                      <CardHeader className="p-0">
                        <CardTitle className="text-sm font-semibold">{r.subjectName}</CardTitle>
                        <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                          {r.className}
                        </CardDescription>
                      </CardHeader>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          {r.students > 0 ? `${r.students} siswa` : "Belum ada nilai"}
                        </span>
                        {r.average !== null ? (
                          <StatusBadge
                            status="DONE"
                            label={`Rata-rata ${r.average}`}
                            className="text-xs"
                          />
                        ) : (
                          <StatusBadge status="DRAFT" label="Belum dinilai" className="text-xs" />
                        )}
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <section aria-labelledby="exams-heading">
        <h2 id="exams-heading" className="mb-3 text-base font-semibold tracking-tight">
          Ujian Terjadwal
        </h2>
        <DataView
          status={exams.status}
          error={exams.error}
          onRetry={exams.refetch}
          fallbackLabel="Daftar ujian"
        >
          <DataTable
            keyField="id"
            columns={[
              {
                key: "title",
                label: "Judul",
                render: (e) => <span className="font-medium text-foreground">{e.title}</span>
              },
              {
                key: "status",
                label: "Status",
                render: (e) => (
                  <StatusBadge status={e.status ?? "SCHEDULED"} mapping={{ ENDED: "success" }} />
                )
              },
              {
                key: "created_at",
                label: "Waktu",
                hideBelow: "md",
                render: (e) =>
                  e.created_at ? (
                    <span className="text-muted-foreground">{formatDateTime(e.created_at)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
              },
              {
                key: "action",
                label: "",
                className: "text-right",
                render: () => (
                  <Link href="/guru/ujian">
                    <Button variant="outline" size="sm">
                      Kelola
                    </Button>
                  </Link>
                )
              }
            ]}
            rows={exams.data ?? []}
            emptyTitle="Tidak ada ujian terjadwal"
            emptyDesc="Ujian yang Anda buat akan tampil di sini."
            emptyAction={
              <Link href="/guru/ujian">
                <Button size="sm">Buat Ujian</Button>
              </Link>
            }
          />
        </DataView>
      </section>
    </div>
  );
}
