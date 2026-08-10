"use client";

import { type JSX } from "react";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, IconBook, IconChevronRight } from "@opensis/ui";

import { DEMO_CLASSES } from "@/lib/demo";
import { PageHeader, EmptyStateV3 } from "@/components/ui";

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  progress?: number;
}

export default function SiswaKelasPage(): JSX.Element {
  const list = useApi<ClassItem[]>(() => api.get("/classes"), [], { fallbackData: DEMO_CLASSES });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelas Saya"
        description="Rombongan belajar yang aktif — buka kelas untuk melihat materi, tugas, kuis, dan nilai."
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar kelas"
      >
        {list.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconBook className="h-5 w-5" />}
            title="Belum ada kelas"
            desc="Kelas akan muncul setelah admin menambahkan Anda ke rombongan belajar."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(list.data ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/siswa/kelas/${c.id}`} className="group block h-full">
                  <Card className="flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary/60 hover:shadow-app-floating">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{c.subject}</p>
                      </div>
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                        aria-hidden="true"
                      >
                        <IconBook className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">Guru: {c.teacher}</p>
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        Buka
                        <IconChevronRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataView>
    </div>
  );
}
