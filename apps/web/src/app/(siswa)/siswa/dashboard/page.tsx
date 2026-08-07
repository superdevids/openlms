"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatRelative } from "@/lib/format";
import { DEMO_EXAMS, DEMO_TASKS, DEMO_CLASSES } from "@/lib/demo";

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

export default function SiswaDashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  const firstName = user?.fullName.split(" ")[0] ?? "Siswa";

  const exams = useApi<Exam[]>(() => api.get("/exams"), [], { fallbackData: DEMO_EXAMS });
  const tasks = useApi<Task[]>(() => api.get("/assignments"), [], { fallbackData: DEMO_TASKS });
  const classes = useApi<ClassItem[]>(() => api.get("/classes"), [], {
    fallbackData: DEMO_CLASSES
  });

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
      <h1 className="text-2xl font-bold text-neutral-900">
        {greeting}, {firstName}
      </h1>

      <section aria-label="Ujian aktif">
        <DataView
          status={exams.status}
          error={exams.error}
          onRetry={exams.refetch}
          fallbackLabel="Daftar ujian"
        >
          {ongoing ? (
            <Card className="border-primary-600 bg-primary-100">
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
          <h2 className="text-lg font-semibold text-neutral-900">Tugas tenggat terdekat</h2>
          <Link href="/siswa/tugas" className="text-sm font-medium text-primary-600">
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
                    className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-neutral-900">
                        {t.title}
                      </span>
                      <span className="block text-sm text-neutral-600">
                        {t.subject} · {formatRelative(t.dueAt)}
                      </span>
                    </span>
                    <Badge variant={t.status === "TERLAMBAT" ? "danger" : "primary"}>
                      {t.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DataView>
      </section>

      <section aria-label="Kelas saya">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Kelas Saya</h2>
          <Link href="/siswa/kelas" className="text-sm font-medium text-primary-600">
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
                        <p className="text-sm text-neutral-600">{c.teacher}</p>
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
