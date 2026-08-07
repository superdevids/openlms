"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, EmptyState } from "@openlms/ui";

import { formatDateTime } from "@/lib/format";
import { DEMO_CLASSES, DEMO_SUBMISSIONS } from "@/lib/demo";

interface ExamSchedule {
  id: string;
  title: string;
  startsAt: string;
}

export default function GuruDashboardPage(): React.JSX.Element {
  const classes = useApi<{ id: string; name: string; subject: string }[]>(
    () => api.get("/classes"),
    [],
    { fallbackData: DEMO_CLASSES }
  );
  const exams = useApi<ExamSchedule[]>(() => api.get("/exams"), [], {
    fallbackData: [
      {
        id: "exm_1",
        title: "PTS Matematika",
        startsAt: new Date(Date.now() + 86400000).toISOString()
      }
    ]
  });
  const grading = useApi<{ id: string; student: string; score: number | null }[]>(
    () => api.get("/assignments"),
    [],
    { fallbackData: DEMO_SUBMISSIONS }
  );
  const pendingGrade = (grading.data ?? []).filter((s) => s.score === null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Beranda Guru</h1>
        <Link href="/guru/tugas">
          <Button>Buat Tugas</Button>
        </Link>
      </div>

      <section aria-label="Perlu dinilai">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">
          Perlu dinilai ({pendingGrade})
        </h2>
        <DataView
          status={grading.status}
          error={grading.error}
          onRetry={grading.refetch}
          fallbackLabel="Antrean penilaian"
        >
          {pendingGrade === 0 ? (
            <EmptyState
              title="Tidak ada yang perlu dinilai"
              description="Semua submission sudah dinilai."
            />
          ) : (
            <Link href="/guru/penilaian" className="block">
              <Card className="transition-colors hover:border-primary-600">
                <CardContent className="flex min-h-14 items-center justify-between">
                  <span className="text-base font-medium text-neutral-900">
                    {pendingGrade} submission menunggu dinilai
                  </span>
                  <Badge variant="danger">{pendingGrade}</Badge>
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
