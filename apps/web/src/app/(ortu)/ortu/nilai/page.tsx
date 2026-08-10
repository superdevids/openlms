"use client";

import { type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, IconChart } from "@opensis/ui";
import { useAuth } from "@/components/auth/auth-provider";

import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  StatusBadge,
  EmptyStateV3
} from "@/components/ui";

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

  const columns: DataTableColumn<ChildGrades>[] = [
    {
      key: "studentName",
      label: "Anak",
      render: (g) => <span className="font-medium text-foreground">{g.studentName}</span>
    },
    {
      key: "gradesCount",
      label: "Nilai Tercatat",
      render: (g) => <span className="tabular-nums">{g.gradesCount}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (g) => (
        <StatusBadge
          status={g.gradesCount > 0 ? "ADA_DATA" : "KOSONG"}
          mapping={{ ADA_DATA: "success", KOSONG: "neutral" }}
          label={g.gradesCount > 0 ? "ADA DATA" : "KOSONG"}
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nilai Anak"
        description="Ringkasan nilai tercatat anak Anda (read-only)."
        meta={<StatusBadge status="INFO" label="READ-ONLY" />}
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Nilai anak"
      >
        {list.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconChart className="h-5 w-5" />}
            title="Belum ada data nilai"
            desc="Hubungkan anak melalui menu portal orang tua untuk melihat ringkasan nilai."
          />
        ) : (
          <DataTable<ChildGrades>
            columns={columns}
            rows={list.data ?? []}
            keyField="studentId"
            emptyTitle="Belum ada data nilai"
            emptyDesc="Hubungkan anak melalui menu portal orang tua untuk melihat ringkasan nilai."
          />
        )}
      </DataView>
    </div>
  );
}
