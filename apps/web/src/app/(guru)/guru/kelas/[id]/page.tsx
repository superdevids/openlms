"use client";

import { useState, type JSX } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  Tabs,
  TabPanel,
  Badge,
  Button,
  IconBook,
  IconQr,
  IconFile
} from "@opensis/ui";

import { formatRelative } from "@/lib/format";
import { DEMO_CLASSES, DEMO_TASKS } from "@/lib/demo";
import { PageHeader, EmptyStateV3, DataTable, StatusBadge } from "@/components/ui";

interface TaskRow {
  id: string;
  title: string;
  dueAt: string;
  status: string;
}

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
  const tasks = useApi<TaskRow[]>(
    () => api.get("/assignments", { query: { class_subject_id: id } }),
    [id],
    { fallbackData: DEMO_TASKS as unknown as TaskRow[] }
  );
  const students = useApi<{ id: string; fullName: string }[]>(
    () => api.get(`/classes/${id}/students`),
    [id]
  );

  const cls = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={cls?.name ?? "Detail Kelas"}
        description={
          cls ? `${cls.subject} — kelola materi, tugas, absensi, dan siswa kelas ini.` : undefined
        }
        backHref="/guru/kelas"
      />

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
          <EmptyStateV3
            icon={<IconFile className="h-5 w-5" />}
            title="Kelola materi"
            desc="Unggah materi dan dokumen untuk kelas ini."
            action={
              <Link href="/guru/materi">
                <Button size="sm">Ke Halaman Materi</Button>
              </Link>
            }
          />
        </TabPanel>

        <TabPanel value="tugas" activeValue={tab}>
          <div className="mb-3 flex justify-end">
            <Link href="/guru/tugas">
              <Button size="sm">Buat Tugas</Button>
            </Link>
          </div>
          <DataView
            status={tasks.status}
            error={tasks.error}
            onRetry={tasks.refetch}
            fallbackLabel="Daftar tugas"
          >
            <DataTable
              keyField="id"
              columns={[
                {
                  key: "title",
                  label: "Judul",
                  render: (t) => <span className="font-medium text-foreground">{t.title}</span>
                },
                {
                  key: "dueAt",
                  label: "Tenggat",
                  render: (t) => (
                    <span className="text-muted-foreground">{formatRelative(t.dueAt)}</span>
                  )
                },
                {
                  key: "status",
                  label: "Status",
                  render: (t) => (
                    <StatusBadge
                      status={t.status}
                      mapping={{ BUKA: "success", DINILAI: "success", TERSUBMIT: "info" }}
                    />
                  )
                }
              ]}
              rows={tasks.data ?? []}
              emptyTitle="Belum ada tugas"
              emptyDesc="Buat tugas pertama untuk kelas ini."
              emptyAction={
                <Link href="/guru/tugas">
                  <Button size="sm">Buat Tugas</Button>
                </Link>
              }
            />
          </DataView>
        </TabPanel>

        <TabPanel value="absensi" activeValue={tab}>
          <EmptyStateV3
            icon={<IconQr className="h-5 w-5" />}
            title="Absensi kelas"
            desc="Buat sesi absensi QR untuk pertemuan hari ini."
            action={
              <Link href="/guru/absensi">
                <Button size="sm">Generate QR Absensi</Button>
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
              <EmptyStateV3
                icon={<IconBook className="h-5 w-5" />}
                title="Belum ada siswa"
                desc="Siswa akan muncul setelah admin enroll ke kelas."
              />
            ) : (
              <Card className="overflow-hidden rounded-lg border-border bg-app-surface shadow-app-card">
                <ul className="divide-y divide-border">
                  {(students.data ?? []).map((s) => (
                    <li
                      key={s.id}
                      className="flex min-h-12 items-center justify-between gap-3 px-4 py-2"
                    >
                      <span className="text-sm font-medium text-foreground">{s.fullName}</span>
                      <Badge variant="neutral" className="text-xs">
                        Siswa
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </DataView>
        </TabPanel>
      </DataView>
    </div>
  );
}
