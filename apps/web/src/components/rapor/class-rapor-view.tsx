"use client";

import { useState, type JSX } from "react";

import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, IconChart } from "@opensis/ui";
import { DataTable, type DataTableColumn, EmptyStateV3, StatusBadge } from "@/components/ui";
import { ExportPdfButton } from "./export-pdf-button";

interface ClassItem {
  id: string;
  name: string;
  grade_level?: number;
  academic_year?: { code: string };
}

interface ClassRaporStudentSubject {
  subjectCode: string;
  subjectName: string;
  nilaiAkhir: number | null;
  predikat: string | null;
}

interface ClassRaporStudent {
  studentId: string;
  studentName: string;
  subjects: ClassRaporStudentSubject[];
}

interface ClassRaporViewData {
  classId: string;
  className: string;
  semester: string;
  academicYear: string;
  students: ClassRaporStudent[];
}

const SEMESTERS = ["GANJIL", "GENAP"] as const;

/**
 * Rekap rapor per kelas + ekspor PDF per siswa — dipakai halaman
 * /guru/rapor (kelas ampu) dan /admin/rapor (seluruh kelas sekolah).
 */
export function ClassRaporView(): JSX.Element {
  const [classId, setClassId] = useState("");
  const [semester, setSemester] = useState<"GANJIL" | "GENAP">("GANJIL");

  const classes = useApi<ClassItem[]>(() => api.get("/classes"), [], {
    fallbackData: []
  });

  const rapor = useApi<ClassRaporViewData>(
    (signal) => {
      if (!classId) throw new Error("Pilih kelas terlebih dahulu");
      return api.get<ClassRaporViewData>(`/rapor/class/${classId}`, {
        query: { semester },
        signal
      });
    },
    [classId, semester],
    { enabled: classId.length > 0 }
  );

  const columns: DataTableColumn<ClassRaporStudent>[] = [
    {
      key: "studentName",
      label: "Nama Siswa",
      render: (s) => <span className="font-medium text-foreground">{s.studentName}</span>
    },
    {
      key: "subjectCount",
      label: "Jumlah Mapel",
      render: (s) => <span className="tabular-nums">{s.subjects.length}</span>
    },
    {
      key: "predikat",
      label: "Rata-rata",
      render: (s) => {
        const nilai = s.subjects
          .map((sub) => sub.nilaiAkhir)
          .filter((n): n is number => n !== null);
        const avg =
          nilai.length > 0 ? Math.round(nilai.reduce((a, b) => a + b, 0) / nilai.length) : null;
        const predikat =
          avg === null
            ? "BELUM DINILAI"
            : avg >= 90
              ? "A"
              : avg >= 80
                ? "B"
                : avg >= 70
                  ? "C"
                  : avg >= 60
                    ? "D"
                    : "E";
        return (
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{avg ?? "-"}</span>
            <StatusBadge status={predikat} />
          </div>
        );
      }
    },
    {
      key: "action",
      label: "Ekspor PDF",
      render: (s) => <ExportPdfButton studentId={s.studentId} semester={semester} />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="class-select" className="text-sm font-medium text-foreground">
            Kelas
          </label>
          <select
            id="class-select"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">-- Pilih kelas --</option>
            {(classes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.academic_year?.code ? ` (${c.academic_year.code})` : ""}
              </option>
            ))}
          </select>
        </div>
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

      <DataView status={classes.status} error={classes.error} onRetry={classes.refetch}>
        <DataView
          status={rapor.status}
          error={rapor.error}
          onRetry={rapor.refetch}
          fallbackLabel="Rekap rapor"
        >
          {!classId ? (
            <EmptyStateV3
              icon={<IconChart className="h-5 w-5" />}
              title="Pilih kelas"
              desc="Pilih kelas untuk melihat rekap rapor dan mengekspor PDF per siswa."
            />
          ) : rapor.data && rapor.data.students.length === 0 ? (
            <EmptyStateV3
              icon={<IconChart className="h-5 w-5" />}
              title="Belum ada siswa"
              desc="Tidak ada siswa aktif atau nilai pada kelas & semester ini."
            />
          ) : rapor.data ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">Kelas</dt>
                      <dd className="font-semibold text-foreground">{rapor.data.className}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Semester</dt>
                      <dd className="font-semibold text-foreground">{rapor.data.semester}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Tahun Ajaran</dt>
                      <dd className="font-semibold text-foreground">{rapor.data.academicYear}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
              <DataTable<ClassRaporStudent>
                columns={columns}
                rows={rapor.data.students}
                keyField="studentId"
                emptyTitle="Belum ada siswa"
                emptyDesc="Tidak ada siswa aktif pada kelas ini."
              />
            </>
          ) : null}
        </DataView>
      </DataView>
    </div>
  );
}
