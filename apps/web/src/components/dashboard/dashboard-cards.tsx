"use client";

import { type JSX } from "react";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@opensis/ui";
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
} from "@opensis/ui";
import { useApi } from "@/lib/use-api";
import { api } from "@/lib/api-client";
import { STORAGE_KEYS, ttlGet, ttlSet } from "@/lib/storage";
import type { DashboardCard, DashboardRoleGroup } from "@/lib/dashboard";

const ICON_MAP: Record<string, (props: IconProps) => JSX.Element> = {
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

function DashboardIcon({ name }: { name: string | null }): JSX.Element {
  const Cmp = (name && ICON_MAP[name]) || IconHome;
  return <Cmp className="h-5 w-5" aria-hidden="true" />;
}

/**
 * DashboardCards — grid kartu navigasi per role (R-05/R-10).
 * Data dari GET /dashboard/me (filter is_enabled + required_permission + urut),
 * di-cache per role `opensis_dashboard_config:{role}` TTL 30 dtk agar navigasi
 * antar halaman tidak bolak-balik hit API. Bila API tidak tersedia (offline),
 * fallback ke props.cards (default per role).
 */
const DASHBOARD_CONFIG_TTL_MS = 30_000;

export function DashboardCards({
  role,
  cards,
  fallbackLabel = "Menu dashboard"
}: {
  role: DashboardRoleGroup;
  cards: DashboardCard[];
  fallbackLabel?: string;
}): JSX.Element {
  const cacheKey = `${STORAGE_KEYS.dashboardConfig}:${role}`;
  const remote = useApi<DashboardCard[]>(
    (signal) => {
      const cached = ttlGet<DashboardCard[]>(cacheKey, DASHBOARD_CONFIG_TTL_MS);
      if (cached && cached.length > 0) return Promise.resolve(cached);
      return api.get<DashboardCard[]>("/dashboard/me", { signal }).then((cardsFromApi) => {
        ttlSet(cacheKey, cardsFromApi);
        return cardsFromApi;
      });
    },
    [cacheKey]
  );

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
                  <span className="rounded-md bg-muted p-1.5 text-primary">
                    <DashboardIcon name={c.icon} />
                  </span>
                </div>
                {c.description ? <CardDescription>{c.description}</CardDescription> : null}
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">Buka</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
