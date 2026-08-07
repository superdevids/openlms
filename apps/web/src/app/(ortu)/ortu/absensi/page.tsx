"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { DEMO_ATTENDANCE } from "@/lib/demo";

export default function OrtuAbsensiPage(): React.JSX.Element {
  const list = useApi<{ date: string; subject: string; status: string }[]>(
    () => api.get("/parent/students").then(() => []),
    [],
    { fallbackData: DEMO_ATTENDANCE }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Absensi Anak</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Absensi anak"
      >
        {list.data?.length === 0 ? (
          <EmptyState title="Belum ada riwayat absensi" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Kehadiran (read-only)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(list.data ?? []).map((r, i) => (
                    <TableRow key={`${r.date}-${i}`}>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell>{r.subject}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "HADIR"
                              ? "success"
                              : r.status === "TERLAMBAT"
                                ? "warning"
                                : r.status === "ALPA"
                                  ? "danger"
                                  : "info"
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
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
