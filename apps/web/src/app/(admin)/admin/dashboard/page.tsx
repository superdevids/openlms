"use client";

import { type JSX } from "react";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  EmptyState
} from "@opensis/ui";

import { roleLabel } from "@/lib/roles";
import { DEMO_INVOICES } from "@/lib/demo";
import { formatRupiah } from "@/lib/format";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";

export default function AdminDashboardPage(): JSX.Element {
  const { user } = useAuth();
  const role = user?.primaryRole ?? user?.roles[0];
  const invoices = useApi<{ amount: number; paid: number; status: string }[]>(
    async () => {
      const rows =
        await api.get<
          Array<{ amount: number | string; paidAmount: number | string; status: string }>
        >("/finance/invoices");
      return rows.map((r) => ({
        amount: Number(r.amount),
        paid: Number(r.paidAmount),
        status: r.status
      }));
    },
    [],
    { fallbackData: DEMO_INVOICES }
  );
  const overdue = (invoices.data ?? []).filter((i) => i.status === "OVERDUE").length;
  const pendingVerify = (invoices.data ?? []).filter((i) => i.status === "PARTIAL").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Beranda Admin</h1>
        <p className="text-sm text-muted-foreground">Peran aktif: {role ? roleLabel(role) : "-"}</p>
      </div>

      <DashboardCards
        role="admin"
        cards={DEFAULT_DASHBOARD_CARDS.admin}
        fallbackLabel="Menu admin"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Pendaftar PPDB"
          value={role === "KEUANGAN" ? "-" : "-"}
          hint="data via Data Induk & PPDB"
        />
        <Kpi label="Undangan pending" value="-" hint="data via Data Induk & PPDB" />
        <Kpi
          label="Tagihan jatuh tempo"
          value={overdue > 0 ? String(overdue) : "0"}
          hint={pendingVerify > 0 ? `${pendingVerify} menunggu verifikasi` : "aman"}
        />
        <Kpi label="Kehadiran hari ini" value="-" hint="data via Rekap Absensi" />
      </div>

      <section aria-label="Ringkasan keuangan">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Keuangan</h2>
          <Link href="/admin/keuangan" className="text-sm font-medium text-primary">
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
          <CardDescription>Rekap kehadiran tersedia di menu Absensi (data nyata).</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Belum ada rekap ditampilkan di sini"
            description="Rekap kehadiran lengkap dapat diakses melalui halaman Rekap Absensi."
          />
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
}): JSX.Element {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
