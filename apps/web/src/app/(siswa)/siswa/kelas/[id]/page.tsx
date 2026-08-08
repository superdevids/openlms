"use client";

import { useState, type JSX } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, Tabs, TabPanel, Badge, Button, EmptyState } from "@opensis/ui";

import { formatRelative } from "@/lib/format";
import { DEMO_CLASSES, DEMO_TASKS } from "@/lib/demo";

interface Material {
  id: string;
  title: string;
  kind: "FILE" | "VIDEO" | "LINK";
  updatedAt: string;
}

export default function SiswaKelasDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [tab, setTab] = useState("materi");

  const detail = useApi<{ id: string; name: string; subject: string; teacher: string }>(
    () => api.get(`/classes/${id}`),
    [id],
    { fallbackData: DEMO_CLASSES.find((c) => c.id === id) }
  );
  const materials = useApi<Material[]>(
    () => api.get(`/materials`, { query: { class_subject_id: id } }),
    [id]
  );
  const tasks = useApi<{ id: string; title: string; dueAt: string; status: string }[]>(
    () => api.get("/assignments", { query: { class_subject_id: id } }),
    [id],
    { fallbackData: DEMO_TASKS }
  );

  const cls = detail.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/siswa/kelas" className="text-sm font-medium text-primary">
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
            { value: "kuis", label: "Kuis" },
            { value: "nilai", label: "Nilai" }
          ]}
          value={tab}
          onValueChange={setTab}
        />

        <TabPanel value="materi" activeValue={tab}>
          <DataView
            status={materials.status}
            error={materials.error}
            onRetry={materials.refetch}
            fallbackLabel="Daftar materi"
          >
            {materials.data?.length === 0 ? (
              <EmptyState
                title="Guru belum menambah materi"
                description="Materi akan tampil di sini setelah diunggah guru."
              />
            ) : (
              <ul className="space-y-2">
                {(materials.data ?? []).map((m) => (
                  <li key={m.id}>
                    <Card>
                      <CardContent className="flex min-h-14 items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {m.title}
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            {m.kind === "FILE"
                              ? "Dokumen"
                              : m.kind === "VIDEO"
                                ? "Video"
                                : "Tautan"}{" "}
                            · {formatRelative(m.updatedAt)}
                          </span>
                        </span>
                        <Link href={`/siswa/kelas/${id}`}>
                          <Button variant="outline" size="sm">
                            Buka
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </DataView>
        </TabPanel>

        <TabPanel value="tugas" activeValue={tab}>
          <DataView
            status={tasks.status}
            error={tasks.error}
            onRetry={tasks.refetch}
            fallbackLabel="Daftar tugas"
          >
            {tasks.data?.length === 0 ? (
              <EmptyState
                title="Belum ada tugas"
                description="Tugas akan muncul setelah guru membuatnya."
              />
            ) : (
              <ul className="space-y-2">
                {(tasks.data ?? []).map((t) => (
                  <li key={t.id}>
                    <Link href="/siswa/tugas" className="block">
                      <Card className="transition-colors hover:border-primary-600">
                        <CardContent className="flex min-h-14 items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {t.title}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              Tenggat {formatRelative(t.dueAt)}
                            </span>
                          </span>
                          <Badge
                            variant={
                              t.status === "TERLAMBAT"
                                ? "danger"
                                : t.status === "TERSUBMIT"
                                  ? "success"
                                  : "primary"
                            }
                          >
                            {t.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DataView>
        </TabPanel>

        <TabPanel value="kuis" activeValue={tab}>
          <EmptyState title="Kuis" description="Kuis kelas akan tampil di sini." />
        </TabPanel>

        <TabPanel value="nilai" activeValue={tab}>
          <EmptyState title="Nilai" description="Lihat rekap nilai lengkap di halaman Nilai." />
        </TabPanel>
      </DataView>
    </div>
  );
}
