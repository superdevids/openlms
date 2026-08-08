"use client";

import { type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  EmptyState,
  Badge
} from "@opensis/ui";
import { useAuth } from "@/components/auth/auth-provider";

import { formatPercent } from "@/lib/format";

interface ParentGuardian {
  id: string;
  full_name: string;
}

interface ParentChild {
  id: string;
  student: { id: string; full_name: string };
}

interface ChildAttendance {
  studentId: string;
  studentName: string;
  total: number;
  alpa: number;
}

export default function OrtuAbsensiPage(): JSX.Element {
  const { user } = useAuth();
  // Kontrak parent-portal NYATA: GET /parent-portal/me → children →
  // GET /parent-portal/:id/children/:studentId/overview (ringkasan kehadiran).
  const list = useApi<ChildAttendance[]>(
    async () => {
      const parent = await api.get<ParentGuardian | null>("/parent-portal/me");
      if (!parent) return [];
      const children = await api.get<ParentChild[]>(`/parent-portal/${parent.id}/children`);
      const rows = await Promise.all(
        children.map(async (child) => {
          try {
            const overview = await api.get<{
              studentId: string;
              studentName: string;
              attendance: { total: number; alpa: number };
            }>(`/parent-portal/${parent.id}/children/${child.student.id}/overview`);
            return {
              studentId: overview.studentId,
              studentName: overview.studentName,
              total: overview.attendance.total,
              alpa: overview.attendance.alpa
            };
          } catch {
            return {
              studentId: child.student.id,
              studentName: child.student.full_name,
              total: 0,
              alpa: 0
            };
          }
        })
      );
      return rows;
    },
    [],
    { enabled: !!(user && user.roles.includes("WALI_MURID")) }
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Absensi Anak (read-only)</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Absensi anak"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada data absensi"
            description="Hubungkan anak melalui menu portal orang tua untuk melihat ringkasan kehadiran."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(list.data ?? []).map((r) => {
              const pct = r.total > 0 ? ((r.total - r.alpa) / r.total) * 100 : null;
              return (
                <Card key={r.studentId}>
                  <CardHeader>
                    <CardTitle>{r.studentName}</CardTitle>
                    <CardDescription>Ringkasan kehadiran</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {r.total} absensi · {r.alpa} alpa
                    </span>
                    <Badge variant={pct === null || pct >= 90 ? "success" : "warning"}>
                      {pct === null ? "-" : formatPercent(pct)}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DataView>
    </div>
  );
}
