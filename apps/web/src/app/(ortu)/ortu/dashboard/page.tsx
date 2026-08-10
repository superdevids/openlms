"use client";

import { type JSX } from "react";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Button, IconGrade, IconQr, IconWallet, IconInfo } from "@opensis/ui";

import { formatPercent } from "@/lib/format";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DEFAULT_DASHBOARD_CARDS } from "@/lib/dashboard";
import { PageHeader, StatCard, StatusBadge, EmptyStateV3 } from "@/components/ui";

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
      <PageHeader
        title={`Selamat datang, ${user?.fullName ?? "Bapak/Ibu"}`}
        description={
          childName
            ? `Anak: ${childName}`
            : "Hubungkan anak melalui menu Nilai / Absensi untuk melihat data."
        }
        meta={<StatusBadge status="INFO" label="READ-ONLY" />}
      />

      <DataView
        status={state.status}
        error={state.error}
        onRetry={state.refetch}
        fallbackLabel="Ringkasan anak"
      >
        {!state.data?.parent ? (
          <EmptyStateV3
            icon={<IconInfo className="h-5 w-5" />}
            title="Profil orang tua belum terhubung"
            desc="Atur data orang tua dan tautkan anak Anda agar dashboard menampilkan ringkasan."
            action={
              <Link href="/support">
                <Button size="sm" variant="outline">
                  Hubungi operator sekolah
                </Button>
              </Link>
            }
          />
        ) : !overview ? (
          <EmptyStateV3
            icon={<IconInfo className="h-5 w-5" />}
            title="Belum ada anak terhubung"
            desc="Setelah menautkan anak, ringkasan nilai, absensi, dan tagihan akan tampil di sini."
            action={
              <Link href="/support">
                <Button size="sm" variant="outline">
                  Hubungi operator sekolah
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Nilai Tercatat"
              value={String(overview.gradesCount)}
              icon={<IconGrade className="h-5 w-5" aria-hidden="true" />}
              tone="brand"
              hint="total nilai di rapor"
              href="/ortu/nilai"
            />
            <StatCard
              label="Kehadiran"
              value={attendancePct === null ? "-" : formatPercent(attendancePct * 100)}
              icon={<IconQr className="h-5 w-5" aria-hidden="true" />}
              tone={attendancePct !== null && attendancePct < 0.9 ? "warning" : "success"}
              hint={`${overview.attendance.alpa} alpa dari ${overview.attendance.total} absensi`}
              href="/ortu/absensi"
            />
            <StatCard
              label="Tagihan Menunggak"
              value={String(overview.unpaidInvoices)}
              icon={<IconWallet className="h-5 w-5" aria-hidden="true" />}
              tone={overview.unpaidInvoices > 0 ? "danger" : "success"}
              hint={overview.unpaidInvoices > 0 ? "segera lunasi" : "tidak ada tunggakan"}
              href="/ortu/tagihan"
            />
          </div>
        )}
      </DataView>

      <DashboardCards
        role="ortu"
        cards={DEFAULT_DASHBOARD_CARDS.ortu}
        fallbackLabel="Menu orang tua"
      />

      <div className="rounded-lg border border-status-info-border bg-status-info-bg/60 p-4 shadow-app-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Portal orang tua bersifat read-only
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Anda dapat melihat nilai, absensi, dan tagihan anak — tanpa aksi tulis.
            </p>
          </div>
          <StatusBadge status="INFO" label="READ-ONLY" />
        </div>
      </div>
    </div>
  );
}
