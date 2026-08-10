"use client";

import { useState, type JSX } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabPanel,
  IconExam,
  IconAlert
} from "@opensis/ui";

import { formatNumber, formatPercent } from "@/lib/format";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  EmptyStateV3,
  type DataTableColumn
} from "@/components/ui";

const DEMO_ACADEMIC = [
  { id: "a1", className: "XI IPA 1", subject: "Matematika", avg: 78.4, min: 55, max: 98 },
  { id: "a2", className: "XI IPA 1", subject: "Fisika", avg: 76.1, min: 50, max: 95 },
  { id: "a3", className: "XI IPS 2", subject: "Matematika", avg: 71.8, min: 45, max: 92 }
];

const DEMO_DISCIPLINE = [
  { id: "d1", student: "Budi", className: "XI IPA 1", alpa: 4, threshold: 3 },
  { id: "d2", student: "Sari", className: "XI IPA 1", alpa: 3, threshold: 3 }
];

const ACADEMIC_COLUMNS: DataTableColumn<(typeof DEMO_ACADEMIC)[number]>[] = [
  {
    key: "className",
    label: "Kelas",
    render: (r) => <span className="font-medium">{r.className}</span>
  },
  { key: "subject", label: "Mapel" },
  {
    key: "avg",
    label: "Rata-rata",
    className: "tabular-nums",
    render: (r) => <span className="font-semibold">{r.avg.toFixed(1)}</span>
  },
  { key: "min", label: "Min", className: "tabular-nums" },
  { key: "max", label: "Max", className: "tabular-nums" }
];

export default function AdminWakepsekPage(): JSX.Element {
  const [tab, setTab] = useState("akademik");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wakil Kepala Sekolah"
        description="Rekap akademik, jadwal ujian, dan kedisiplinan lintas kelas."
      />
      <Tabs
        tabs={[
          { value: "akademik", label: "Akademik" },
          { value: "ujian", label: "Ujian" },
          { value: "disiplin", label: "Kedisiplinan" }
        ]}
        value={tab}
        onValueChange={setTab}
      />

      <TabPanel value="akademik" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Rekap Nilai per Kelas / Mapel</CardTitle>
            <CardDescription>
              Ringkasan akademik lintas kelas — klik untuk drill-down.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={ACADEMIC_COLUMNS}
              rows={DEMO_ACADEMIC}
              keyField="id"
              maxHeight="none"
            />
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="ujian" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Jadwal & Sesi Ujian</CardTitle>
            <CardDescription>
              Pengaturan sesi ujian oleh waka kurikulum; hasil & analisis butir soal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyStateV3
              icon={<IconExam />}
              title="Belum ada sesi ujian terjadwal"
              desc="Sesi ujian yang dibuat guru akan tampil di sini."
            />
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="disiplin" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Kedisiplinan — Alpa di atas ambang</CardTitle>
            <CardDescription>
              Highlight otomatis berdasarkan ambang alpa sekolah; CTA kirim notifikasi orang tua.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {DEMO_DISCIPLINE.length === 0 ? (
              <EmptyStateV3
                icon={<IconAlert />}
                title="Tidak ada siswa alpa berulang"
                desc="Semua siswa berada di bawah ambang alpa bulan ini."
              />
            ) : (
              <ul className="space-y-2">
                {DEMO_DISCIPLINE.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <span className="font-medium text-foreground">
                      {d.student} — {d.className}
                    </span>
                    <StatusBadge
                      status="ALPA"
                      label={`${formatNumber(d.alpa)}x alpa (ambang ${d.threshold}x/bulan)`}
                    />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Kehadiran bulan ini: {formatPercent(96.2)}
            </p>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
