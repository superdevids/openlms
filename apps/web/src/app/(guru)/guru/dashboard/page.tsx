"use client";

import * as React from "react";
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
} from "@openlms/ui";

import { formatDateTime } from "@/lib/format";
import { DEMO_CLASSES, DEMO_SUBMISSIONS } from "@/lib/demo";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";

interface ExamSchedule {
  id: string;
  title: string;
  startsAt: string;
}

interface Assignment {
  id: string;
  title: string;
  status: string;
  dueAt: string;
  _count?: { submissions: number };
}

export default function GuruDashboardPage(): React.JSX.Element {
  const classes = useApi<{ id: string; name: string; subject: string }[]>(
    () => api.get("/classes"),
    [],
    { fallbackData: DEMO_CLASSES }
  );
  const exams = useApi<ExamSchedule[]>(() => api.get("/exams"), [], {
    fallbackData: []
  });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Beranda Guru</h1>
        <Link href="/guru/tugas">
          <Button>Buat Tugas</Button>
        </Link>
      </div>

      <DashboardCards role="guru" cards={DEFAULT_DASHBOARD_CARDS.guru} fallbackLabel="Menu guru" />

      <section aria-label="Rekap penilaian">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">
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
                  <span className="text-base font-medium text-neutral-900">
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
          <h2 className="text-lg font-semibold text-neutral-900">Kelas Saya</h2>
          <Link href="/guru/kelas" className="text-sm font-medium text-primary-600">
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

      <section aria-label="Ujian terjadwal">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">Ujian Terjadwal</h2>
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
                          <span className="block truncate font-medium text-neutral-900">
                            {e.title}
                          </span>
                          <span className="block text-sm text-neutral-600">
                            {formatDateTime(e.startsAt)}
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
