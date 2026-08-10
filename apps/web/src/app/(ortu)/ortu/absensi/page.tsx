"use client";

import { type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, IconQr } from "@opensis/ui";
import { useAuth } from "@/components/auth/auth-provider";

import { formatPercent } from "@/lib/format";
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

  const columns: DataTableColumn<ChildAttendance>[] = [
    {
      key: "studentName",
      label: "Anak",
      render: (r) => <span className="font-medium text-foreground">{r.studentName}</span>
    },
    {
      key: "total",
      label: "Total Absensi",
      render: (r) => <span className="tabular-nums">{r.total}</span>
    },
    {
      key: "alpa",
      label: "Alpa",
      render: (r) => <StatusBadge status={r.alpa > 0 ? "ALPA" : "HADIR"} label={String(r.alpa)} />
    },
    {
      key: "pct",
      label: "% Kehadiran",
      render: (r) => {
        const pct = r.total > 0 ? ((r.total - r.alpa) / r.total) * 100 : null;
        if (pct === null) {
          return <StatusBadge status="KOSONG" label="-" />;
        }
        const tone = pct >= 90 ? "success" : pct >= 75 ? "warning" : "danger";
        return (
          <StatusBadge
            status={tone.toUpperCase()}
            mapping={{ SUCCESS: "success", WARNING: "warning", DANGER: "danger" }}
            label={formatPercent(pct)}
          />
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi Anak"
        description="Ringkasan kehadiran anak Anda (read-only)."
        meta={<StatusBadge status="INFO" label="READ-ONLY" />}
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Absensi anak"
      >
        {list.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconQr className="h-5 w-5" />}
            title="Belum ada data absensi"
            desc="Hubungkan anak melalui menu portal orang tua untuk melihat ringkasan kehadiran."
          />
        ) : (
          <DataTable<ChildAttendance>
            columns={columns}
            rows={list.data ?? []}
            keyField="studentId"
            emptyTitle="Belum ada data absensi"
            emptyDesc="Hubungkan anak melalui menu portal orang tua untuk melihat ringkasan kehadiran."
          />
        )}
      </DataView>
    </div>
  );
}
