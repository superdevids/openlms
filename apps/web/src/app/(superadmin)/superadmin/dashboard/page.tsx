"use client";

import { type JSX } from "react";

import Link from "next/link";
import { useFeatureFlags } from "@/lib/feature-flags-hook";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  IconAcademic,
  IconHome,
  IconUser,
  IconFlag
} from "@opensis/ui";

import { formatPercent } from "@/lib/format";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";
import {
  PageHeader,
  StatCard,
  StatGrid,
  DataTable,
  StatusBadge,
  EmptyStateV3,
  type DataTableColumn
} from "@/components/ui";

interface DashboardStats {
  usersByRole: { role: string; count: number }[];
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  academicYear: { id: string; code: string; name: string; status: string } | null;
  adoptionPercent: number;
  featureFlagsEnabled: number;
  featureFlagsTotal: number;
}

interface FlagSummary {
  key: string;
  category: string;
  enabled: boolean;
  locked: boolean;
}

const FLAG_COLUMNS: DataTableColumn<FlagSummary>[] = [
  {
    key: "key",
    label: "Key",
    render: (f) => (
      <>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{f.key}</code>
        {f.locked ? <StatusBadge status="locked" label="locked" className="ml-2" /> : null}
      </>
    )
  },
  { key: "category", label: "Kategori" },
  {
    key: "status",
    label: "Status",
    render: (f) => <StatusBadge status={f.enabled ? "ON" : "OFF"} />
  }
];

/** Warna segmen bar proporsi peran (siklus otomatis bila peran > 6). */
const SEGMENT_COLORS: readonly string[] = [
  "bg-brand-primary",
  "bg-status-info-fg",
  "bg-status-warning-fg",
  "bg-status-success-fg",
  "bg-status-danger-fg",
  "bg-muted-foreground"
];

export default function SuperadminDashboardPage(): JSX.Element {
  const { flags } = useFeatureFlags();
  const summary: FlagSummary[] = flags.slice(0, 8);
  const stats = useApi<DashboardStats>(() => api.get<DashboardStats>("/admin/dashboard/stats"), []);

  const s = stats.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistik Sekolah"
        description="Ringkasan instalasi & konfigurasi sekolah."
        meta={
          s?.academicYear ? (
            <StatusBadge status={s.academicYear.status} label={s.academicYear.name} />
          ) : undefined
        }
      />

      <StatGrid>
        <StatCard
          label="Siswa"
          value={s ? String(s.totalStudents) : "-"}
          icon={<IconAcademic className="h-5 w-5" />}
        />
        <StatCard
          label="Guru"
          value={s ? String(s.totalTeachers) : "-"}
          icon={<IconUser className="h-5 w-5" />}
        />
        <StatCard
          label="Kelas"
          value={s ? String(s.totalClasses) : "-"}
          icon={<IconHome className="h-5 w-5" />}
        />
        <StatCard
          label="Adopsi Fitur"
          value={s ? formatPercent(s.adoptionPercent) : "-"}
          tone="success"
          icon={<IconFlag className="h-5 w-5" />}
          hint={s ? `${s.featureFlagsEnabled}/${s.featureFlagsTotal} flag aktif` : "menunggu data"}
          href="/superadmin/admin-sistem"
        />
      </StatGrid>

      {s?.usersByRole ? (
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Pengguna per Peran</CardTitle>
            <CardDescription>Distribusi user aktif berdasarkan role.</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const total = s.usersByRole.reduce((sum, u) => sum + u.count, 0);
              if (total <= 0) {
                return (
                  <EmptyStateV3
                    compact
                    icon={<IconUser className="h-5 w-5" />}
                    title="Belum ada data pengguna"
                    desc="Statistik role akan tampil setelah data sekolah dimuat."
                  />
                );
              }
              return (
                <div className="space-y-3">
                  <div
                    className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label="Proporsi pengguna per peran"
                  >
                    {s.usersByRole.map((u, i) => (
                      <span
                        key={u.role}
                        className={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                        style={{ width: `${(u.count / total) * 100}%` }}
                      />
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    {s.usersByRole.map((u, i) => (
                      <li key={u.role} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              SEGMENT_COLORS[i % SEGMENT_COLORS.length]
                            }`}
                          />
                          <span className="truncate font-medium text-foreground">{u.role}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          <span className="font-semibold text-foreground">{u.count}</span>
                          <span className="ml-1 text-xs">
                            ({Math.round((u.count / total) * 100)}%)
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      ) : null}

      <DashboardCards
        role="superadmin"
        cards={DEFAULT_DASHBOARD_CARDS.superadmin}
        fallbackLabel="Menu superadmin"
      />

      <Card className="overflow-hidden rounded-lg border-border bg-app-surface shadow-app-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Feature Flags (ringkas)</CardTitle>
            <Link href="/superadmin/admin-sistem">
              <Button size="sm" variant="outline">
                Kelola Semua
              </Button>
            </Link>
          </div>
          <CardDescription>
            OFF = UI disembunyikan, route diblokir, API tolak FEATURE_DISABLED (prd04 §5.N).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={FLAG_COLUMNS}
            rows={summary}
            keyField="key"
            emptyTitle="Belum ada feature flag"
            emptyDesc="Feature flag akan tampil saat server menyediakan konfigurasi."
            maxHeight="none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
