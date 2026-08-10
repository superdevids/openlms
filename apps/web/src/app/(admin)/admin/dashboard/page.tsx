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
  IconAcademic,
  IconAlert,
  IconBell,
  IconChart,
  IconChevronRight,
  IconClock,
  IconUser,
  IconWallet
} from "@opensis/ui";

import { roleLabel } from "@/lib/roles";
import { DEMO_INVOICES } from "@/lib/demo";
import { formatRupiah } from "@/lib/format";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";
import { PageHeader, StatCard, StatGrid, EmptyStateV3 } from "@/components/ui";

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
  const collected = (invoices.data ?? []).reduce((s, i) => s + i.paid, 0);
  const outstanding = (invoices.data ?? []).reduce((s, i) => s + (i.amount - i.paid), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Beranda Admin"
        description={role ? `Peran aktif: ${roleLabel(role)}` : undefined}
      />

      <DashboardCards
        role="admin"
        cards={DEFAULT_DASHBOARD_CARDS.admin}
        fallbackLabel="Menu admin"
      />

      <section aria-label="Ringkasan operasional">
        <StatGrid>
          <StatCard
            label="Pendaftar PPDB"
            value="-"
            icon={<IconUser className="h-5 w-5" />}
            hint="data via Data Induk & PPDB"
          />
          <StatCard
            label="Undangan pending"
            value="-"
            tone="warning"
            icon={<IconBell className="h-5 w-5" />}
            hint="data via Data Induk & PPDB"
          />
          <StatCard
            label="Tagihan jatuh tempo"
            value={invoices.data ? String(overdue) : "-"}
            tone={invoices.data ? (overdue > 0 ? "danger" : "success") : "neutral"}
            icon={<IconClock className="h-5 w-5" />}
            hint={
              invoices.data
                ? pendingVerify > 0
                  ? `${pendingVerify} menunggu verifikasi`
                  : "aman"
                : "memuat data"
            }
            href="/admin/keuangan"
          />
          <StatCard
            label="Kehadiran hari ini"
            value="-"
            tone="info"
            icon={<IconChart className="h-5 w-5" />}
            hint="data via Rekap Absensi"
          />
        </StatGrid>
      </section>

      <section aria-label="Ringkasan keuangan">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Keuangan</h2>
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
          <StatGrid className="grid-cols-1 sm:grid-cols-3">
            <StatCard
              label="Terkumpul"
              value={invoices.data ? formatRupiah(collected) : "-"}
              tone="success"
              icon={<IconWallet className="h-5 w-5" />}
            />
            <StatCard
              label="Belum dibayar"
              value={invoices.data ? formatRupiah(outstanding) : "-"}
              tone="warning"
              icon={<IconWallet className="h-5 w-5" />}
            />
            <StatCard
              label="Tunggakan"
              value={invoices.data ? String(overdue) : "-"}
              tone="danger"
              icon={<IconAlert className="h-5 w-5" />}
            />
          </StatGrid>
        </DataView>
      </section>

      <section aria-label="Menu admin cepat">
        <h2 className="mb-2 text-base font-semibold tracking-tight text-foreground">Menu Admin</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <Link href="/admin/operator" className="group block h-full">
            <Card className="flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-floating">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-sm font-semibold">
                    Data Induk & PPDB
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    Data siswa/guru, impor, undangan, verifikasi PPDB
                  </CardDescription>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                  aria-hidden="true"
                >
                  <IconUser className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                <span>Buka</span>
                <IconChevronRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Card>
          </Link>
          <Link href="/admin/wakepsek" className="group block h-full">
            <Card className="flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-floating">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-sm font-semibold">
                    Akademik & Kedisiplinan
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    Rekap nilai, jadwal ujian, kedisiplinan lintas kelas
                  </CardDescription>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                  aria-hidden="true"
                >
                  <IconAcademic className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                <span>Buka</span>
                <IconChevronRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Card>
          </Link>
          <Link href="/admin/kepsek" className="group block h-full">
            <Card className="flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-floating">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-sm font-semibold">
                    Dashboard Eksekutif
                  </CardTitle>
                  <CardDescription className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    KPI, tren kehadiran, rekap payroll, audit
                  </CardDescription>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                  aria-hidden="true"
                >
                  <IconChart className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                <span>Buka</span>
                <IconChevronRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Card>
          </Link>
        </div>
      </section>

      <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
        <CardHeader>
          <CardTitle>Kehadiran terbaru</CardTitle>
          <CardDescription>Rekap kehadiran tersedia di menu Absensi (data nyata).</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyStateV3
            icon={<IconChart className="h-5 w-5" />}
            title="Belum ada rekap ditampilkan di sini"
            desc="Rekap kehadiran lengkap dapat diakses melalui halaman Rekap Absensi."
          />
        </CardContent>
      </Card>
    </div>
  );
}
