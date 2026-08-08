"use client";

import * as React from "react";
import { ChangeLogTable } from "@/components/audit/change-log-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabPanel,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Alert
} from "@openlms/ui";

import { formatPercent, formatRupiah } from "@/lib/format";

const DEMO_PAYROLL = [
  { id: "p1", staff: "Budi Santoso", role: "Guru", takeHome: 4200000, status: "TERKIRIM" },
  { id: "p2", staff: "Sari Wulandari", role: "Guru", takeHome: 3900000, status: "PENDING" },
  { id: "p3", staff: "Dewi Lestari", role: "TU", takeHome: 3300000, status: "TERKIRIM" }
];

export default function AdminKepsekPage(): React.JSX.Element {
  const [tab, setTab] = React.useState("kpi");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Dashboard Eksekutif</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Siswa Aktif" value="1,204" hint="48 rombel" />
        <Kpi label="Kehadiran Hari Ini" value={formatPercent(95.8)} hint="tren 6 bulan" />
        <Kpi label="Rata-rata Nilai" value="78.4" hint="per angkatan" />
        <Kpi label="Tunggakan SPP" value="12%" hint="read-only" />
      </div>

      <Tabs
        tabs={[
          { value: "kpi", label: "Ringkasan" },
          { value: "payroll", label: "Rekap Payroll" },
          { value: "audit", label: "Audit" }
        ]}
        value={tab}
        onValueChange={setTab}
      />

      <TabPanel value="kpi" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Perlu Perhatian</CardTitle>
            <CardDescription>
              Daftar digenerate dari aturan (nilai turun, alpa naik) — data, bukan opini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center justify-between rounded-md border border-warning-700 bg-warning-100 px-3 py-2">
                <span className="font-medium text-warning-700">
                  Kelas XII IPS 2 — nilai turun 6%
                </span>
                <Badge variant="warning">perhatian</Badge>
              </li>
              <li className="flex items-center justify-between rounded-md border border-danger-600 bg-danger-100 px-3 py-2">
                <span className="font-medium text-danger-700">
                  Alpa naik di XI IPA 3 (Budi, Sari)
                </span>
                <Badge variant="danger">alpa</Badge>
              </li>
            </ul>
          </CardContent>
        </Card>
        <Alert variant="info" className="mt-4 text-sm">
          Tren kehadiran & nilai akan dirender sebagai chart saat backend menyediakan data agregat
          (GET /reports/finance, /grades).
        </Alert>
      </TabPanel>

      <TabPanel value="payroll" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Rekap Payroll</CardTitle>
            <CardDescription>
              Modul payroll (GELOMBANG 2, default OFF) — rekap read-only untuk kepsek.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staf</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Take Home</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_PAYROLL.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.staff}</TableCell>
                    <TableCell>{p.role}</TableCell>
                    <TableCell>{formatRupiah(p.takeHome)}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "TERKIRIM" ? "success" : "warning"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="audit" activeValue={tab}>
        <ChangeLogTable />
      </TabPanel>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-neutral-600">{label}</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
