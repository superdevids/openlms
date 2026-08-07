"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface Quiz {
  id: string;
  title: string;
  subject: string;
  durationSeconds: number;
  status: string;
}

export default function SiswaKuisPage(): React.JSX.Element {
  const list = useApi<Quiz[]>(() => api.get("/quizzes"), []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Kuis</h1>
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
