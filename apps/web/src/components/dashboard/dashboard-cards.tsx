"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@openlms/ui";
import {
  IconAcademic,
  IconBank,
  IconBell,
  IconBook,
  IconBriefcase,
  IconCalendar,
  IconCamera,
  IconChart,
  IconClipboard,
  IconClock,
  IconDatabase,
  IconExam,
  IconFile,
  IconFlag,
  IconGrade,
  IconHome,
  IconInfo,
  IconLock,
  IconPlus,
  IconQr,
  IconRefresh,
  IconRocket,
  IconSearch,
  IconSettings,
  IconUser,
  IconWallet,
  type IconProps
} from "@openlms/ui";
import { useApi } from "@/lib/use-api";
import { api } from "@/lib/api-client";
import type { DashboardCard, DashboardRoleGroup } from "@/lib/dashboard";

const ICON_MAP: Record<string, (props: IconProps) => React.JSX.Element> = {
  home: IconHome,
  book: IconBook,
  clipboard: IconClipboard,
  quiz: IconExam,
  exam: IconExam,
  chart: IconChart,
  qr: IconQr,
  camera: IconCamera,
  calendar: IconCalendar,
  bell: IconBell,
  clock: IconClock,
  settings: IconSettings,
  database: IconDatabase,
  wallet: IconWallet,
  academic: IconAcademic,
  briefcase: IconBriefcase,
  rocket: IconRocket,
  refresh: IconRefresh,
  file: IconFile,
  bank: IconBank,
  grade: IconGrade,
  plus: IconPlus,
  search: IconSearch,
  flag: IconFlag,
  user: IconUser,
  lock: IconLock,
  info: IconInfo
};

function DashboardIcon({ name }: { name: string | null }): React.JSX.Element {
  const Cmp = (name && ICON_MAP[name]) || IconHome;
  return <Cmp className="h-5 w-5" aria-hidden="true" />;
}

/**
 * DashboardCards — grid kartu navigasi per role (R-05/R-10).
 * Data dari GET /dashboard/me (filter is_enabled + required_permission + urut).
 * Bila API tidak tersedia (offline), fallback ke props.cards (default per role).
 */
export function DashboardCards({
  role,
  cards,
  fallbackLabel = "Menu dashboard"
}: {
  role: DashboardRoleGroup;
  cards: DashboardCard[];
  fallbackLabel?: string;
}): React.JSX.Element {
  const remote = useApi<DashboardCard[]>(() => api.get<DashboardCard[]>("/dashboard/me"), []);

  // API /dashboard/me adalah otoritas; fallback props hanya saat gagal/offline.
  const effective =
    remote.status === "success" && remote.data && remote.data.length > 0 ? remote.data : cards;

  if (!effective || effective.length === 0) {
    return (
      <EmptyState
        title="Belum ada menu dashboard"
        description="Superadmin dapat mengatur kartu menu melalui halaman Dashboard Config."
      />
    );
  }

  return (
    <section aria-label={fallbackLabel}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {effective.map((c) => (
          <Link key={`${role}:${c.featureKey}`} href={c.href} className="block h-full">
            <Card className="h-full transition-colors hover:border-primary-600">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{c.label}</CardTitle>
                  <span className="rounded-md bg-neutral-100 p-1.5 text-primary-700">
                    <DashboardIcon name={c.icon} />
                  </span>
                </div>
                {c.description ? <CardDescription>{c.description}</CardDescription> : null}
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary-600">Buka</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
