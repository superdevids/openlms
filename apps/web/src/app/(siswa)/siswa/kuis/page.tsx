"use client";

import { type JSX } from "react";

import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, Button, IconQuiz } from "@opensis/ui";

import { PageHeader, StatusBadge, EmptyStateV3 } from "@/components/ui";

interface Quiz {
  id: string;
  title: string;
  subject: string;
  durationSeconds: number;
  status: string;
}

interface ApiQuiz {
  id: string;
  title: string;
  status: string;
  duration_min: number;
  class_subject?: { subject?: { name?: string } | null } | null;
}

interface QuizListResponse {
  items: ApiQuiz[];
}

export default function SiswaKuisPage(): JSX.Element {
  const list = useApi<Quiz[]>(
    () =>
      api.get<QuizListResponse>("/quiz").then((r) =>
        (r.items ?? []).map((q) => ({
          id: q.id,
          title: q.title,
          subject: q.class_subject?.subject?.name ?? "",
          durationSeconds: (q.duration_min ?? 0) * 60,
          status: q.status
        }))
      ),
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kuis"
        description="Kuis harian yang diberikan guru — kerjakan dalam batas waktu yang ditentukan."
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar kuis"
      >
        {list.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconQuiz className="h-5 w-5" />}
            title="Belum ada kuis"
            desc="Kuis yang diberikan guru akan tampil di sini."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(list.data ?? []).map((q) => (
              <li key={q.id}>
                <Card className="flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary/60 hover:shadow-app-floating">
                  <StatusBadge
                    status={q.status === "ONGOING" ? "ONGOING" : "BUKA"}
                    label={q.status === "ONGOING" ? "Berlangsung" : "Terbuka"}
                    className="w-fit"
                  />
                  <p className="mt-3 text-sm font-semibold text-foreground">{q.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.subject || "—"} · Durasi {Math.round((q.durationSeconds ?? 0) / 60)} menit
                  </p>
                  <div className="mt-4 flex-1" />
                  <div className="mt-4">
                    <Link href={`/siswa/kuis/${q.id}`}>
                      <Button size="sm">Kerjakan</Button>
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </DataView>
    </div>
  );
}
