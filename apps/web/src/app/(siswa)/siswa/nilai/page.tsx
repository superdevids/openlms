"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DEMO_GRADES } from "@/lib/demo";

interface GradeRow {
  subject: string;
  tugas: number | null;
  kuis: number | null;
  ujian: number | null;
  rata: number | null;
}

export default function SiswaNilaiPage(): React.JSX.Element {
  const list = useApi<GradeRow[]>(() => api.get("/grades"), [], { fallbackData: DEMO_GRADES });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Nilai Saya</h1>
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
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Tugas</TableHead>
                    <TableHead>Kuis</TableHead>
                    <TableHead>Ujian</TableHead>
                    <TableHead>Rata-rata</TableHead>
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
