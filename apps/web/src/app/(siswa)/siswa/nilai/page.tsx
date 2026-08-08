"use client";

import { type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  useRealtimeRefetch,
  SUBMISSION_GRADED_EVENT,
  GRADE_RECORDED_EVENT
} from "@/lib/use-socket";
import {
  DataView,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState
} from "@opensis/ui";

import { DEMO_GRADES } from "@/lib/demo";

// Definisi kolom tabel — header dirender lewat KOLOM.map() agar konsisten.
const GRADE_KOLOM: { key: string; label: string }[] = [
  { key: "mapel", label: "Mata Pelajaran" },
  { key: "tugas", label: "Tugas" },
  { key: "kuis", label: "Kuis" },
  { key: "ujian", label: "Ujian" },
  { key: "rata", label: "Rata-rata" }
];

interface GradeRow {
  subject: string;
  tugas: number | null;
  kuis: number | null;
  ujian: number | null;
  rata: number | null;
}

export default function SiswaNilaiPage(): JSX.Element {
  const list = useApi<GradeRow[]>(() => api.get("/grades"), [], { fallbackData: DEMO_GRADES });

  // Nilai dinilai/di-record → refetch REST (best-effort; REST sumber kebenaran).
  useRealtimeRefetch([SUBMISSION_GRADED_EVENT, GRADE_RECORDED_EVENT], list.refetch);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Nilai Saya</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Rekap nilai"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada nilai"
            description="Nilai akan muncul setelah guru menilai tugas/kuis/ujian Anda."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Rekap Nilai</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {GRADE_KOLOM.map((k) => (
                      <TableHead key={k.key}>{k.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(list.data ?? []).map((g) => (
                    <TableRow key={g.subject}>
                      <TableCell className="font-medium">{g.subject}</TableCell>
                      <TableCell>{g.tugas ?? "-"}</TableCell>
                      <TableCell>{g.kuis ?? "-"}</TableCell>
                      <TableCell>{g.ujian ?? "-"}</TableCell>
                      <TableCell className="font-semibold">{g.rata?.toFixed(1) ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </DataView>
    </div>
  );
}
