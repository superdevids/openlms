"use client";

import { type JSX } from "react";

import Link from "next/link";
import { Card, cn, IconChevronRight } from "@opensis/ui";
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
import { safeInternalHref } from "@/lib/safe-url";
import { STORAGE_KEYS, ttlGet, ttlSet } from "@/lib/storage";
import type { DashboardCard, DashboardRoleGroup } from "@/lib/dashboard";
import { EmptyStateV3 } from "@/components/ui";

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
 * DashboardCards — grid kartu navigasi per role (R-05/R-10), tampilan APP v3.
 * Kartu lebih kaya: ikon tint circle (brand), label, deskripsi, arrow "Buka →"
 * dengan group-hover — konsisten dengan StatCard (spec D.3).
 * Data dari GET /dashboard/me (filter is_enabled + required_permission + urut),
 * di-cache per role `opensis_dashboard_config:{role}` TTL 30 dtk. Bila API tidak
 * tersedia (offline), fallback ke props.cards (default per role).
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
      <EmptyStateV3
        icon={<IconHome className="h-5 w-5" />}
        title="Belum ada menu dashboard"
        desc="Superadmin dapat mengatur kartu menu melalui halaman Dashboard Config."
      />
    );
  }

  return (
    <section aria-label={fallbackLabel}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {effective.map((c) => (
          <Link
            key={`${role}:${c.featureKey}`}
            href={safeInternalHref(c.href)}
            className="group block h-full"
          >
            <Card
              className={cn(
                "flex h-full flex-col rounded-lg border-border bg-app-surface p-5 shadow-app-card",
                "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-floating"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{c.label}</p>
                  {c.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {c.description}
                    </p>
                  ) : null}
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary"
                  aria-hidden="true"
                >
                  <DashboardIcon name={c.icon} />
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
        ))}
      </div>
    </section>
  );
}
