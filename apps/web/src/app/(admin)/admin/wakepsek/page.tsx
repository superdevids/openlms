"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Tabs, TabPanel, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from "@openlms/ui";

import { formatNumber, formatPercent } from "@/lib/format";

const DEMO_ACADEMIC = [
  { id: "a1", className: "XI IPA 1", subject: "Matematika", avg: 78.4, min: 55, max: 98 },
  { id: "a2", className: "XI IPA 1", subject: "Fisika", avg: 76.1, min: 50, max: 95 },
  { id: "a3", className: "XI IPS 2", subject: "Matematika", avg: 71.8, min: 45, max: 92 }
];

const DEMO_DISCIPLINE = [
  { id: "d1", student: "Budi", className: "XI IPA 1", alpa: 4, threshold: 3 },
  { id: "d2", student: "Sari", className: "XI IPA 1", alpa: 3, threshold: 3 }
];

export default function AdminWakepsekPage(): React.JSX.Element {
  const [tab, setTab] = React.useState("akademik");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Wakil Kepala Sekolah</h1>
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
        <Card>
          <CardHeader>
            <CardTitle>Rekap Nilai per Kelas / Mapel</CardTitle>
            <CardDescription>
              Ringkasan akademik lintas kelas — klik untuk drill-down.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Mapel</TableHead>
                  <TableHead>Rata-rata</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_ACADEMIC.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.className}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell className="font-semibold">{r.avg.toFixed(1)}</TableCell>
                    <TableCell>{r.min}</TableCell>
                    <TableCell>{r.max}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="ujian" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Jadwal & Sesi Ujian</CardTitle>
            <CardDescription>
              Pengaturan sesi ujian oleh waka kurikulum; hasil & analisis butir soal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Belum ada sesi ujian terjadwal"
              description="Sesi ujian yang dibuat guru akan tampil di sini."
            />
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="disiplin" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Kedisiplinan — Alpa di atas ambang</CardTitle>
            <CardDescription>
              Highlight otomatis berdasarkan ambang alpa sekolah; CTA kirim notifikasi orang tua.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {DEMO_DISCIPLINE.length === 0 ? (
              <EmptyState title="Tidak ada siswa alpa berulang" />
            ) : (
              <ul className="space-y-2">
                {DEMO_DISCIPLINE.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2"
                  >
                    <span className="font-medium text-neutral-900">
                      {d.student} — {d.className}
                    </span>
                    <Badge variant="danger">
                      {formatNumber(d.alpa)}x alpa (ambang {d.threshold}x/bulan)
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-neutral-600">
              Kehadiran bulan ini: {formatPercent(96.2)}
            </p>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
