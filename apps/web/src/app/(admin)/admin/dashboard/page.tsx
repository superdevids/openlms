"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from "@openlms/ui";

import { roleLabel } from "@/lib/roles";
import { DEMO_INVOICES, DEMO_ATTENDANCE_SUMMARY } from "@/lib/demo";
import { formatPercent, formatRupiah } from "@/lib/format";

export default function AdminDashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  const role = user?.primaryRole ?? user?.roles[0];
  const invoices = useApi<{ amount: number; paid: number; status: string }[]>(
    () => api.get("/invoices"),
    [],
    { fallbackData: DEMO_INVOICES }
  );
  const overdue = (invoices.data ?? []).filter((i) => i.status === "OVERDUE").length;
  const pendingVerify = (invoices.data ?? []).filter((i) => i.status === "PARTIAL").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Beranda Admin</h1>
        <p className="text-sm text-neutral-600">Peran aktif: {role ? roleLabel(role) : "-"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Pendaftar PPDB"
          value={role === "KEUANGAN" ? "-" : "24"}
          hint="perlu verifikasi: 5"
        />
        <Kpi label="Undangan pending" value="3" hint="guru/staf" />
        <Kpi
          label="Tagihan jatuh tempo"
          value={overdue > 0 ? String(overdue) : "0"}
          hint={pendingVerify > 0 ? `${pendingVerify} menunggu verifikasi` : "aman"}
        />
        <Kpi label="Kehadiran hari ini" value={formatPercent(96.2)} hint="tren 6 bulan" />
      </div>

      <section aria-label="Ringkasan keuangan">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Keuangan</h2>
          <Link href="/admin/keuangan" className="text-sm font-medium text-primary-600">
            Lihat semua
          </Link>
        </div>
        <DataView
          status={invoices.status}
          error={invoices.error}
          onRetry={invoices.refetch}
          fallbackLabel="Ringkasan keuangan"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi
              label="Terkumpul"
              value={formatRupiah((invoices.data ?? []).reduce((s, i) => s + i.paid, 0))}
            />
            <Kpi
              label="Belum dibayar"
              value={formatRupiah(
                (invoices.data ?? []).reduce((s, i) => s + (i.amount - i.paid), 0)
              )}
            />
            <Kpi label="Tunggakan" value={String(overdue)} />
          </div>
        </DataView>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <Link href="/admin/operator" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Data Induk & PPDB</CardTitle>
              <CardDescription>Data siswa/guru, impor, undangan, verifikasi PPDB</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Buka
              </Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/wakepsek" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Akademik & Kedisiplinan</CardTitle>
              <CardDescription>
                Rekap nilai, jadwal ujian, kedisiplinan lintas kelas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Buka
              </Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/kepsek" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Dashboard Eksekutif</CardTitle>
              <CardDescription>KPI, tren kehadiran, rekap payroll, audit</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Buka
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kehadiran terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <DataView status={invoices.status} error={invoices.error} onRetry={invoices.refetch}>
            <ul className="space-y-2">
              {DEMO_ATTENDANCE_SUMMARY.map((d) => (
                <li
                  key={d.date}
                  className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
                >
                  <span className="text-sm text-neutral-700">{d.subject}</span>
                  <Badge variant="success">
                    {d.present}/{d.total} hadir
                  </Badge>
                </li>
              ))}
            </ul>
          </DataView>
        </CardContent>
      </Card>
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
