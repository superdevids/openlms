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

interface ParentGuardian {
  id: string;
  full_name: string;
}

interface ParentChild {
  id: string;
  student: { id: string; full_name: string };
}

interface ChildGrades {
  studentId: string;
  studentName: string;
  gradesCount: number;
}

export default function OrtuNilaiPage(): JSX.Element {
  const { user } = useAuth();
  // Kontrak parent-portal NYATA: GET /parent-portal/me → children →
  // GET /parent-portal/:id/children/:studentId/overview (nilai tercatat).
  const list = useApi<ChildGrades[]>(
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
              gradesCount: number;
            }>(`/parent-portal/${parent.id}/children/${child.student.id}/overview`);
            return {
              studentId: overview.studentId,
              studentName: overview.studentName,
              gradesCount: overview.gradesCount
            };
          } catch {
            return {
              studentId: child.student.id,
              studentName: child.student.full_name,
              gradesCount: 0
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
      <h1 className="text-2xl font-bold text-foreground">Nilai Anak (read-only)</h1>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Nilai anak"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Belum ada data nilai"
            description="Hubungkan anak melalui menu portal orang tua untuk melihat ringkasan nilai."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(list.data ?? []).map((g) => (
              <Card key={g.studentId}>
                <CardHeader>
                  <CardTitle>{g.studentName}</CardTitle>
                  <CardDescription>Ringkasan nilai tercatat</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{g.gradesCount} nilai tercatat</span>
                  <Badge variant={g.gradesCount > 0 ? "primary" : "neutral"}>
                    {g.gradesCount > 0 ? "ADA DATA" : "KOSONG"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DataView>
    </div>
  );
}
