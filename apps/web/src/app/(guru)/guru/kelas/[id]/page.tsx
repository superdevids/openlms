"use client";

import { useState, type JSX } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  Tabs,
  TabPanel,
  Badge,
  Button,
  EmptyState
} from "@opensis/ui";

import { formatRelative } from "@/lib/format";
import { DEMO_CLASSES, DEMO_TASKS } from "@/lib/demo";
import { TASK_STATUS_BADGE } from "@/lib/constants";

export default function GuruKelasDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [tab, setTab] = useState("materi");

  const detail = useApi<{ id: string; name: string; subject: string }>(
    () => api.get(`/classes/${id}`),
    [id],
    {
      fallbackData: DEMO_CLASSES.find((c) => c.id === id)
    }
  );
  const tasks = useApi<{ id: string; title: string; dueAt: string; status: string }[]>(
    () => api.get("/assignments", { query: { class_subject_id: id } }),
    [id],
    { fallbackData: DEMO_TASKS }
  );
  const students = useApi<{ id: string; fullName: string }[]>(
    () => api.get(`/classes/${id}/students`),
    [id]
  );

  const cls = detail.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/guru/kelas" className="text-sm font-medium text-primary">
          &larr; Kembali ke kelas
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          {cls?.name ?? "Detail Kelas"} {cls ? `— ${cls.subject}` : ""}
        </h1>
      </div>

      <DataView
        status={detail.status}
        error={detail.error}
        onRetry={detail.refetch}
        fallbackLabel="Detail kelas"
      >
        <Tabs
          tabs={[
            { value: "materi", label: "Materi" },
            { value: "tugas", label: "Tugas" },
            { value: "absensi", label: "Absensi" },
            { value: "siswa", label: "Siswa" }
          ]}
          value={tab}
          onValueChange={setTab}
        />

        <TabPanel value="materi" activeValue={tab}>
          <EmptyState
            title="Kelola materi"
            description="Unggah materi dan dokumen untuk kelas ini."
            action={
              <Link href="/guru/materi">
                <Button>Ke Halaman Materi</Button>
              </Link>
            }
          />
        </TabPanel>

        <TabPanel value="tugas" activeValue={tab}>
          <div className="mb-3 flex justify-end">
            <Link href="/guru/tugas">
              <Button>Buat Tugas</Button>
            </Link>
          </div>
          <DataView
            status={tasks.status}
            error={tasks.error}
            onRetry={tasks.refetch}
            fallbackLabel="Daftar tugas"
          >
            {tasks.data?.length === 0 ? (
              <EmptyState
                title="Belum ada tugas"
                description="Buat tugas pertama untuk kelas ini."
              />
            ) : (
              <ul className="space-y-2">
                {(tasks.data ?? []).map((t) => (
                  <li key={t.id}>
                    <Card>
                      <CardContent className="flex min-h-14 items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {t.title}
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            Tenggat {formatRelative(t.dueAt)}
                          </span>
                        </span>
                        <Badge variant={TASK_STATUS_BADGE[t.status] ?? "primary"}>{t.status}</Badge>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </DataView>
        </TabPanel>

        <TabPanel value="absensi" activeValue={tab}>
          <EmptyState
            title="Absensi kelas"
            description="Buat sesi absensi QR untuk pertemuan hari ini."
            action={
              <Link href="/guru/absensi">
                <Button>Generate QR Absensi</Button>
              </Link>
            }
          />
        </TabPanel>

        <TabPanel value="siswa" activeValue={tab}>
          <DataView
            status={students.status}
            error={students.error}
            onRetry={students.refetch}
            fallbackLabel="Daftar siswa"
          >
            {students.data?.length === 0 ? (
              <EmptyState
                title="Belum ada siswa"
                description="Siswa akan muncul setelah admin enroll ke kelas."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {(students.data ?? []).map((s) => (
                  <li key={s.id} className="flex min-h-12 items-center px-4 py-2">
                    <span className="text-base font-medium text-foreground">{s.fullName}</span>
                  </li>
                ))}
              </ul>
            )}
          </DataView>
        </TabPanel>
      </DataView>
    </div>
  );
}
