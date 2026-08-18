"use client";

import { useState, type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/components/auth/auth-provider";
import { DataView, Card, CardContent, IconChart } from "@opensis/ui";
import {
  PageHeader,
  DataTable,
  type DataTableColumn,
  StatusBadge,
  type StatusTone,
  EmptyStateV3
} from "@/components/ui";
import { ExportPdfButton } from "@/components/rapor/export-pdf-button";

interface RaporTypeDetail {
  type: string;
  count: number;
  average: number | null;
}

interface RaporMapel {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  className: string;
  perType: RaporTypeDetail[];
  nilaiAkhir: number | null;
  predikat: string | null;
}

interface RaporP5Row {
  id: string;
  project_name: string;
  theme: string | null;
  score: number | null;
  deskripsi: string;
}

interface RaporView {
  student: { id: string; name: string; username: string | null };
  kelas: { id: string; name: string; gradeLevel: number } | null;
  semester: string;
  academicYear: string;
  mapels: RaporMapel[];
  p5: RaporP5Row[];
}

const SEMESTERS = ["GANJIL", "GENAP"] as const;

function nilaiTone(predikat: string | null): { status: string; tone: StatusTone } {
  if (!predikat) return { status: "BELUM DINILAI", tone: "neutral" };
  const tone: StatusTone =
    predikat === "A"
      ? "success"
      : predikat === "B"
        ? "success"
        : predikat === "C"
          ? "warning"
          : predikat === "D"
            ? "warning"
            : "danger";
  return { status: predikat, tone };
}

export default function SiswaRaporPage(): JSX.Element {
  const { user } = useAuth();
  const [semester, setSemester] = useState<"GANJIL" | "GENAP">("GANJIL");

  const list = useApi<RaporView>(
    async (signal) => {
      if (!user?.id) throw new Error("Sesi tidak tersedia");
      return api.get<RaporView>(`/rapor/${user.id}`, { query: { semester }, signal });
    },
    [user?.id, semester]
  );

  const mapelColumns: DataTableColumn<RaporMapel>[] = [
    {
      key: "subjectName",
      label: "Mata Pelajaran",
      render: (m) => <span className="font-medium text-foreground">{m.subjectName}</span>
    },
    ...(["TUGAS", "KUIS", "UJIAN", "SUMATIF"] as const).map((tipe) => ({
      key: tipe,
      label: tipe.charAt(0) + tipe.slice(1).toLowerCase(),
      render: (m: RaporMapel) => {
        const d = m.perType.find((t) => t.type === tipe);
        return <span className="tabular-nums">{d?.average ?? "-"}</span>;
      }
    })),
    {
      key: "nilaiAkhir",
      label: "Nilai Akhir",
      render: (m) => (
        <span className="font-semibold tabular-nums text-foreground">{m.nilaiAkhir ?? "-"}</span>
      )
    },
    {
      key: "predikat",
      label: "Predikat",
      render: (m) => {
        const s = nilaiTone(m.predikat);
        return <StatusBadge status={s.status} mapping={{ [s.status]: s.tone }} />;
      }
    }
  ];

  const p5Columns: DataTableColumn<RaporP5Row>[] = [
    {
      key: "project_name",
      label: "Proyek",
      render: (p) => <span className="font-medium text-foreground">{p.project_name}</span>
    },
    {
      key: "theme",
      label: "Tema",
      render: (p) => <span>{p.theme ?? "-"}</span>
    },
    {
      key: "score",
      label: "Nilai",
      render: (p) => <span className="tabular-nums">{p.score ?? "-"}</span>
    },
    {
      key: "deskripsi",
      label: "Deskripsi",
      hideBelow: "md",
      render: (p) => <span className="text-muted-foreground">{p.deskripsi}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapor"
        description="Nilai akhir per mata pelajaran beserta proyek penguatan profil pelajar Pancasila (P5)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExportPdfButton studentId={user?.id ?? ""} semester={semester} />
            <div
              className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1"
              role="group"
              aria-label="Pilih semester"
            >
              {SEMESTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSemester(s)}
                  aria-pressed={semester === s}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    semester === s
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Rapor"
      >
        {list.data ? (
          <>
            <Card>
              <CardContent className="p-5">
                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Nama</dt>
                    <dd className="font-semibold text-foreground">{list.data.student.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Kelas</dt>
                    <dd className="font-semibold text-foreground">
                      {list.data.kelas?.name ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tahun Ajaran</dt>
                    <dd className="font-semibold text-foreground">{list.data.academicYear}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <section aria-label="Nilai akhir per mata pelajaran">
              {list.data.mapels.length === 0 ? (
                <EmptyStateV3
                  icon={<IconChart className="h-5 w-5" />}
                  title="Belum ada nilai rapor"
                  desc="Nilai akhir akan dihitung setelah guru mencatat penilaian semester ini."
                />
              ) : (
                <DataTable<RaporMapel>
                  columns={mapelColumns}
                  rows={list.data.mapels}
                  keyField="subjectId"
                  emptyTitle="Belum ada nilai rapor"
                  emptyDesc="Nilai akhir akan dihitung setelah guru mencatat penilaian semester ini."
                />
              )}
            </section>

            <section aria-label="Proyek P5" className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Proyek P5</h2>
              {list.data.p5.length === 0 ? (
                <EmptyStateV3
                  icon={<IconChart className="h-5 w-5" />}
                  title="Belum ada proyek P5"
                  desc="Proyek penguatan profil pelajar Pancasila akan tampil setelah dicatat guru."
                />
              ) : (
                <DataTable<RaporP5Row>
                  columns={p5Columns}
                  rows={list.data.p5}
                  keyField="id"
                  emptyTitle="Belum ada proyek P5"
                  emptyDesc="Proyek penguatan profil pelajar Pancasila akan tampil setelah dicatat guru."
                />
              )}
            </section>
          </>
        ) : null}
      </DataView>
    </div>
  );
}
