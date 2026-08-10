"use client";

import { type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  useRealtimeRefetch,
  SUBMISSION_GRADED_EVENT,
  GRADE_RECORDED_EVENT
} from "@/lib/use-socket";
import { DataView, IconChart } from "@opensis/ui";

import { DEMO_GRADES } from "@/lib/demo";
import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  StatusBadge,
  type StatusTone,
  EmptyStateV3
} from "@/components/ui";

interface GradeRow {
  subject: string;
  tugas: number | null;
  kuis: number | null;
  ujian: number | null;
  rata: number | null;
}

/** Presentasi (bukan kontrak): status rata-rata per mapel — TUNTAS ≥75, CUKUP ≥60, selain itu BELUM TUNTAS. */
function gradeStatus(rata: number | null): { status: string; tone: StatusTone } {
  if (rata === null) return { status: "BELUM DINILAI", tone: "neutral" };
  if (rata >= 75) return { status: "TUNTAS", tone: "success" };
  if (rata >= 60) return { status: "CUKUP", tone: "warning" };
  return { status: "BELUM TUNTAS", tone: "danger" };
}

export default function SiswaNilaiPage(): JSX.Element {
  const list = useApi<GradeRow[]>(() => api.get("/grades"), [], { fallbackData: DEMO_GRADES });

  // Nilai dinilai/di-record → refetch REST (best-effort; REST sumber kebenaran).
  useRealtimeRefetch([SUBMISSION_GRADED_EVENT, GRADE_RECORDED_EVENT], list.refetch);

  const columns: DataTableColumn<GradeRow>[] = [
    {
      key: "subject",
      label: "Mata Pelajaran",
      render: (g) => <span className="font-medium text-foreground">{g.subject}</span>
    },
    {
      key: "tugas",
      label: "Tugas",
      render: (g) => <span className="tabular-nums">{g.tugas ?? "-"}</span>
    },
    {
      key: "kuis",
      label: "Kuis",
      render: (g) => <span className="tabular-nums">{g.kuis ?? "-"}</span>
    },
    {
      key: "ujian",
      label: "Ujian",
      hideBelow: "sm",
      render: (g) => <span className="tabular-nums">{g.ujian ?? "-"}</span>
    },
    {
      key: "rata",
      label: "Rata-rata",
      render: (g) => (
        <span className="font-semibold tabular-nums text-foreground">
          {g.rata?.toFixed(1) ?? "-"}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (g) => {
        const s = gradeStatus(g.rata);
        return <StatusBadge status={s.status} mapping={{ [s.status]: s.tone }} />;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nilai Saya"
        description="Rekap nilai tugas, kuis, dan ujian per mata pelajaran."
      />
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Rekap nilai"
      >
        {list.data?.length === 0 ? (
          <EmptyStateV3
            icon={<IconChart className="h-5 w-5" />}
            title="Belum ada nilai"
            desc="Nilai akan muncul setelah guru menilai tugas/kuis/ujian Anda."
          />
        ) : (
          <DataTable<GradeRow>
            columns={columns}
            rows={list.data ?? []}
            keyField="subject"
            emptyTitle="Belum ada nilai"
            emptyDesc="Nilai akan muncul setelah guru menilai tugas/kuis/ujian Anda."
          />
        )}
      </DataView>
    </div>
  );
}
