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
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DataView
} from "@opensis/ui";

import { formatPercent } from "@/lib/format";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";

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

// Definisi kolom tabel — header dirender lewat KOLOM.map() agar konsisten.
const FLAG_KOLOM: { key: string; label: string }[] = [
  { key: "key", label: "Key" },
  { key: "kategori", label: "Kategori" },
  { key: "status", label: "Status" }
];

export default function SuperadminDashboardPage(): JSX.Element {
  const { flags } = useFeatureFlags();
  const summary = flags.slice(0, 8);
  const stats = useApi<DashboardStats>(() => api.get<DashboardStats>("/admin/dashboard/stats"), []);

  const s = stats.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Statistik Sekolah</h1>

      <DataView
        status={stats.status}
        error={stats.error}
        onRetry={stats.refetch}
        fallbackLabel="Statistik sekolah"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Siswa" value={s ? String(s.totalStudents) : "-"} />
          <Kpi label="Guru" value={s ? String(s.totalTeachers) : "-"} />
          <Kpi label="Kelas" value={s ? String(s.totalClasses) : "-"} />
          <Kpi
            label="Adopsi Fitur"
            value={s ? formatPercent(s.adoptionPercent) : "-"}
            hint={
              s ? `${s.featureFlagsEnabled}/${s.featureFlagsTotal} flag aktif` : "menunggu data"
            }
          />
        </div>
        {s?.academicYear ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Tahun ajaran: <span className="font-medium">{s.academicYear.name}</span>{" "}
            <Badge variant={s.academicYear.status === "OPEN" ? "success" : "neutral"}>
              {s.academicYear.status}
            </Badge>
          </p>
        ) : null}
      </DataView>

      <DashboardCards
        role="superadmin"
        cards={DEFAULT_DASHBOARD_CARDS.superadmin}
        fallbackLabel="Menu superadmin"
      />

      <Card>
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {FLAG_KOLOM.map((k) => (
                  <TableHead key={k.key}>{k.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((f) => (
                <TableRow key={f.key}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{f.key}</code>
                    {f.locked ? (
                      <Badge variant="neutral" className="ml-2">
                        locked
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{f.category}</TableCell>
                  <TableCell>
                    <Badge variant={f.enabled ? "success" : "neutral"}>
                      {f.enabled ? "ON" : "OFF"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
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
