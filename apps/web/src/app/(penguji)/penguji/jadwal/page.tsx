"use client";

import { type JSX } from "react";

import Link from "next/link";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  EmptyState,
  Skeleton,
  IconCalendar
} from "@opensis/ui";

interface RubricItem {
  id: string;
  criterion: string;
  max_score: number;
  score: number | null;
}

interface CompetencyTest {
  id: string;
  title: string;
  competency_standard: string;
  scheduled_at: string | null;
  status: string;
  final_score: number | null;
  student: { id: string; full_name: string } | null;
  rubric_items: RubricItem[];
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "Jadwal belum ditetapkan";
  try {
    return new Date(value).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

export default function PengujiJadwalPage(): JSX.Element {
  const list = useApi<CompetencyTest[]>(
    (signal) => api.get<CompetencyTest[]>("/smk/competency-tests/by-examiner", { signal }),
    [],
    { enabled: !DEMO_MODE }
  );

  const tests = DEMO_MODE && list.status !== "success" ? [] : (list.data ?? []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Jadwal UKK</h1>

      {list.status === "loading" ? (
        <Skeleton className="h-48 w-full" />
      ) : list.status === "error" ? (
        <Alert variant="danger" className="text-sm">
          {list.error?.message ?? "Gagal memuat jadwal UKK."}
        </Alert>
      ) : tests.length === 0 ? (
        <EmptyState
          title="Belum ada UKK ditugaskan"
          description="Jadwal UKK yang ditugaskan ke Anda akan tampil di sini."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{test.title}</CardTitle>
                  <Badge variant={test.status === "SCHEDULED" ? "warning" : "success"}>
                    {test.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <IconCalendar className="h-4 w-4" />
                  {fmtDate(test.scheduled_at)}
                </p>
                <p className="font-medium text-foreground">{test.student?.full_name ?? "Siswa"}</p>
                <p className="text-muted-foreground">{test.competency_standard}</p>
                <p className="text-xs text-muted-foreground">
                  {test.rubric_items.length} rubrik ·{" "}
                  {test.final_score !== null ? `skor akhir ${test.final_score}` : "belum dinilai"}
                </p>
                <Link
                  href="/penguji/dashboard"
                  className="inline-block text-sm font-medium text-primary underline"
                >
                  Buka penilaian →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
