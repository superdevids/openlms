"use client";

import { useEffect, useState, type JSX } from "react";

import { ChangeLogTable } from "@/components/audit/change-log-table";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabPanel,
  Alert,
  IconAcademic,
  IconChart,
  IconWallet
} from "@opensis/ui";

import { formatPercent, formatRupiah } from "@/lib/format";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";
import {
  PageHeader,
  StatCard,
  StatGrid,
  DataTable,
  StatusBadge,
  type DataTableColumn
} from "@/components/ui";

const DEMO_PAYROLL = [
  { id: "p1", staff: "Budi Santoso", role: "Guru", takeHome: 4200000, status: "TERKIRIM" },
  { id: "p2", staff: "Sari Wulandari", role: "Guru", takeHome: 3900000, status: "PENDING" },
  { id: "p3", staff: "Dewi Lestari", role: "TU", takeHome: 3300000, status: "TERKIRIM" }
];

const PAYROLL_COLUMNS: DataTableColumn<(typeof DEMO_PAYROLL)[number]>[] = [
  { key: "staff", label: "Staf", render: (p) => <span className="font-medium">{p.staff}</span> },
  { key: "role", label: "Role" },
  {
    key: "takeHome",
    label: "Take Home",
    className: "tabular-nums",
    render: (p) => formatRupiah(p.takeHome)
  },
  {
    key: "status",
    label: "Status",
    render: (p) => <StatusBadge status={p.status} mapping={{ TERKIRIM: "success" }} />
  }
];

interface MonthlySummary {
  total: number;
  paid: number;
  partial: number;
  overdue: number;
  outstanding: number;
}

/** Kunci tab per halaman (opensis_tab_state) — tab aktif bertahan saat reload. */
const TAB_STATE_KEY = `${STORAGE_KEYS.tabState}:kepsek`;

export default function AdminKepsekPage(): JSX.Element {
  // Tab aktif dipersistenkan ke sessionStorage (audit R-23) agar tidak hilang
  // saat reload; fallback "kpi".
  const [tab, setTab] = useState<string>(
    () => safeGet<{ tab: string }>(TAB_STATE_KEY, "session")?.tab ?? "kpi"
  );

  useEffect(() => {
    safeSet(TAB_STATE_KEY, { tab }, "session");
  }, [tab]);

  // KPI tunggakan memakai data NYATA (GET /finance/invoices/summary/monthly) —
  // read-only; KPI lain tetap placeholder sampai endpoint agregat tersedia.
  const finance = useApi<MonthlySummary>(
    () => api.get<MonthlySummary>("/finance/invoices/summary/monthly"),
    [],
    { enabled: tab === "kpi" }
  );
  const tunggakan = finance.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Eksekutif"
        description="KPI sekolah, rekap payroll, dan audit untuk kepala sekolah."
      />

      <StatGrid>
        <StatCard
          label="Siswa Aktif"
          value="1,204"
          tone="brand"
          icon={<IconAcademic className="h-5 w-5" />}
          hint="48 rombel"
        />
        <StatCard
          label="Kehadiran Hari Ini"
          value={formatPercent(95.8)}
          tone="success"
          icon={<IconChart className="h-5 w-5" />}
          hint="tren 6 bulan"
        />
        <StatCard
          label="Rata-rata Nilai"
          value="78.4"
          tone="info"
          icon={<IconAcademic className="h-5 w-5" />}
          hint="per angkatan"
        />
        <StatCard
          label="Tunggakan SPP"
          value={tunggakan ? `${tunggakan.overdue} tagihan` : finance.error ? "-" : "…"}
          tone="danger"
          icon={<IconWallet className="h-5 w-5" />}
          hint={
            tunggakan
              ? `outstanding ${formatRupiah(Number(tunggakan.outstanding))} · ${tunggakan.total} total`
              : "read-only"
          }
          href="/admin/keuangan"
        />
      </StatGrid>

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
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Perlu Perhatian</CardTitle>
            <CardDescription>
              Daftar digenerate dari aturan (nilai turun, alpa naik) — data, bukan opini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center justify-between rounded-md border border-status-warning-border bg-status-warning-bg px-3 py-2">
                <span className="font-medium text-status-warning-fg">
                  Kelas XII IPS 2 — nilai turun 6%
                </span>
                <StatusBadge status="PENDING" label="perhatian" />
              </li>
              <li className="flex items-center justify-between rounded-md border border-status-danger-border bg-status-danger-bg px-3 py-2">
                <span className="font-medium text-status-danger-fg">
                  Alpa naik di XI IPA 3 (Budi, Sari)
                </span>
                <StatusBadge status="ALPA" label="alpa" />
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
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Rekap Payroll</CardTitle>
            <CardDescription>
              Modul payroll (GELOMBANG 2, default OFF) — rekap read-only untuk kepsek.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={PAYROLL_COLUMNS}
              rows={DEMO_PAYROLL}
              keyField="id"
              maxHeight="none"
            />
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="audit" activeValue={tab}>
        <ChangeLogTable />
      </TabPanel>
    </div>
  );
}
