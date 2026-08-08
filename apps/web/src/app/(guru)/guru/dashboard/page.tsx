"use client";

import { type JSX } from "react";

import Link from "next/link";
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

import { formatDateTime } from "@/lib/format";
import { DEMO_CLASSES, DEMO_SUBMISSIONS } from "@/lib/demo";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Beranda Guru</h1>
        <Link href="/guru/tugas">
          <Button>Buat Tugas</Button>
        </Link>
      </div>

      <DashboardCards role="guru" cards={DEFAULT_DASHBOARD_CARDS.guru} fallbackLabel="Menu guru" />

      <section aria-label="Rekap penilaian">
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Rekap penilaian ({gradingRecap} submission)
        </h2>
        <DataView
          status={assignments.status}
          error={assignments.error}
          onRetry={assignments.refetch}
          fallbackLabel="Rekap penilaian"
        >
          {pendingGrade === 0 ? (
            <EmptyState
              title="Tidak ada submission masuk"
              description="Submission siswa akan tampil di sini saat tugas diterima."
            />
          ) : (
            <Link href="/guru/penilaian" className="block">
              <Card className="transition-colors hover:border-primary-600">
                <CardContent className="flex min-h-14 items-center justify-between">
                  <span className="text-base font-medium text-foreground">
                    {gradingRecap} submission menunggu dinilai ({pendingGrade} tugas)
                  </span>
                  <Badge variant="danger">{gradingRecap}</Badge>
                </CardContent>
              </Card>
            </Link>
          )}
        </DataView>
      </section>

      <section aria-label="Kelas saya">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Kelas Saya</h2>
          <Link href="/guru/kelas" className="text-sm font-medium text-primary">
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
            <EmptyState title="Belum ada kelas" description="Kelas di-assign oleh admin sekolah." />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(classes.data ?? []).map((c) => (
                <li key={c.id}>
                  <Link href={`/guru/kelas/${c.id}`} className="block h-full">
                    <Card className="h-full transition-colors hover:border-primary-600">
                      <CardHeader>
                        <CardTitle>{c.name}</CardTitle>
                        <CardDescription>{c.subject}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="outline" size="sm">
                          Kelola Kelas
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <section aria-label="Rekap nilai kelas">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Rekap Nilai Kelas</h2>
          <Link href="/guru/kelas" className="text-sm font-medium text-primary">
            Lihat semua kelas
          </Link>
        </div>
        <DataView
          status={recaps.status}
          error={recaps.error}
          onRetry={recaps.refetch}
          fallbackLabel="Rekap nilai kelas"
        >
          {recaps.data?.length === 0 ? (
            <EmptyState
              title="Belum ada rekap nilai"
              description="Nilai siswa akan tampil setelah guru mencatat penilaian."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(recaps.data ?? []).map((r) => (
                <li key={r.id}>
                  <Link href={`/guru/kelas/${r.classId}`} className="block">
                    <Card className="h-full transition-colors hover:border-primary-600">
                      <CardHeader>
                        <CardTitle>{r.subjectName}</CardTitle>
                        <CardDescription>{r.className}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {r.students > 0 ? `${r.students} siswa` : "Belum ada nilai"}
                        </span>
                        {r.average !== null ? (
                          <Badge variant="primary">Rata-rata {r.average}</Badge>
                        ) : (
                          <Badge variant="neutral">Belum dinilai</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <section aria-label="Ujian terjadwal">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Ujian Terjadwal</h2>
        <DataView
          status={exams.status}
          error={exams.error}
          onRetry={exams.refetch}
          fallbackLabel="Daftar ujian"
        >
          {exams.data?.length === 0 ? (
            <EmptyState
              title="Tidak ada ujian terjadwal"
              description="Ujian yang Anda buat akan tampil di sini."
            />
          ) : (
            <ul className="space-y-2">
              {(exams.data ?? []).map((e) => (
                <li key={e.id}>
                  <Link href="/guru/ujian" className="block">
                    <Card className="transition-colors hover:border-primary-600">
                      <CardContent className="flex min-h-14 items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {e.title}
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            {e.status ?? "—"}
                            {e.created_at ? ` · ${formatDateTime(e.created_at)}` : ""}
                          </span>
                        </span>
                        <Button variant="outline" size="sm">
                          Kelola
                        </Button>
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
