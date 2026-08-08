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
  Badge,
  Button,
  EmptyState
} from "@opensis/ui";

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
      <h1 className="text-2xl font-bold text-foreground">Kuis</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Daftar kuis"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada kuis"
            description="Kuis yang diberikan guru akan tampil di sini."
          />
        ) : (
          <ul className="space-y-2">
            {(list.data ?? []).map((q) => (
              <li key={q.id}>
                <Card>
                  <CardHeader>
                    <Badge
                      variant={q.status === "ONGOING" ? "success" : "primary"}
                      className="w-fit"
                    >
                      {q.status === "ONGOING" ? "Berlangsung" : "Terbuka"}
                    </Badge>
                    <CardTitle>{q.title}</CardTitle>
                    <CardDescription>
                      {q.subject} · Durasi {Math.round((q.durationSeconds ?? 0) / 60)} menit
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/siswa/kuis/${q.id}`}>
                      <Button>Kerjakan</Button>
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </DataView>
    </div>
  );
}
