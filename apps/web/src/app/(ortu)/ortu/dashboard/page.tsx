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
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  EmptyState
} from "@opensis/ui";

import { formatPercent } from "@/lib/format";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";

interface ParentGuardian {
  id: string;
  full_name: string;
}

interface ParentChild {
  id: string;
  student: { id: string; full_name: string };
}

interface ParentOverview {
  studentId: string;
  studentName: string;
  gradesCount: number;
  attendance: { total: number; alpa: number };
  unpaidInvoices: number;
}

interface OrtuOverviewState {
  parent?: ParentGuardian | null;
  children: ParentChild[];
  child?: ParentChild;
  overview: ParentOverview | null;
}

export default function OrtuDashboardPage(): JSX.Element {
  const { user } = useAuth();

  // R-08: portal orang tua memakai kontrak parent-portal NYATA:
  // GET /parent-portal/me → GET /parent-portal/:id/children →
  // GET /parent-portal/:id/children/:studentId/overview.
  const state = useApi<OrtuOverviewState>(
    async () => {
      const parent = await api.get<ParentGuardian | null>("/parent-portal/me");
      if (!parent) {
        return { parent: null, children: [], overview: null };
      }
      const children = await api.get<ParentChild[]>(`/parent-portal/${parent.id}/children`);
      const child = children[0] ?? undefined;
      if (!child) {
        return { parent, children, overview: null };
      }
      const overview = await api.get<ParentOverview>(
        `/parent-portal/${parent.id}/children/${child.student.id}/overview`
      );
      return { parent, children, child, overview };
    },
    [],
    { enabled: !!(user && user.roles.includes("WALI_MURID")) }
  );

  const childName = state.data?.child?.student.full_name ?? null;
  const overview = state.data?.overview ?? null;
  const attendancePct =
    overview && overview.attendance.total > 0
      ? (overview.attendance.total - overview.attendance.alpa) / overview.attendance.total
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Selamat datang, {user?.fullName ?? "Bapak/Ibu"}
        </h1>
        {childName ? (
          <p className="text-sm text-muted-foreground">Anak: {childName}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Hubungkan anak melalui menu Nilai / Absensi untuk melihat data.
          </p>
        )}
      </div>

      <DataView
        status={state.status}
        error={state.error}
        onRetry={state.refetch}
        fallbackLabel="Ringkasan anak"
      >
        {!state.data?.parent ? (
          <EmptyState
            title="Profil orang tua belum terhubung"
            description="Atur data orang tua dan tautkan anak Anda agar dashboard menampilkan ringkasan."
          />
        ) : !overview ? (
          <EmptyState
            title="Belum ada anak terhubung"
            description="Setelah menautkan anak, ringkasan nilai, absensi, dan tagihan akan tampil di sini."
          />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Nilai Tercatat" value={String(overview.gradesCount)} />
            <Kpi
              label="Kehadiran"
              value={attendancePct === null ? "-" : formatPercent(attendancePct * 100)}
              hint={`${overview.attendance.alpa} alpa dari ${overview.attendance.total} absensi`}
            />
            <Kpi label="Tagihan Menunggak" value={String(overview.unpaidInvoices)} />
          </div>
        )}
      </DataView>

      <DashboardCards
        role="ortu"
        cards={DEFAULT_DASHBOARD_CARDS.ortu}
        fallbackLabel="Menu orang tua"
      />

      <Card className="border-info-600 bg-info-100">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div>
            <p className="font-semibold text-info-700">Portal orang tua bersifat read-only</p>
            <p className="text-sm text-info-700">
              Anda dapat melihat nilai, absensi, dan tagihan anak — tanpa aksi tulis.
            </p>
          </div>
          <Badge variant="info">READ-ONLY</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/ortu/absensi" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Absensi Anak</CardTitle>
              <CardDescription>Riwayat kehadiran per bulan + % kehadiran</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Buka
              </Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ortu/tagihan" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Tagihan Anak</CardTitle>
              <CardDescription>Status tagihan SPP — read-only</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Buka
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
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
        <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
        <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
