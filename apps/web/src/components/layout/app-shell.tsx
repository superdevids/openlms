"use client";

import { useEffect, useState, type ComponentType, type JSX, type ReactNode } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@opensis/ui";
import { useAuth, useDemoRoleSwitch } from "@/components/auth/auth-provider";
import {
  visibleNav,
  roleLabel,
  roleGroupFor,
  roleHome,
  ROLE_GROUP_LABEL,
  type RoleGroup
} from "@/lib/roles";
import { useFeatureFlags } from "@/lib/feature-flags-hook";
import { DEMO_MODE } from "@/lib/api-client";
import { APP_NAME } from "@/lib/constants";
import { DEMO_ROLES } from "@/lib/demo";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { FontSizeToggle } from "@/components/theme/font-size-toggle";
import { useUnreadNotifications } from "@/lib/use-socket";
import { NotificationPanel } from "./notification-panel";
import {
  IconBell,
  IconHome,
  IconBook,
  IconClipboard,
  IconQuiz,
  IconExam,
  IconChart,
  IconQr,
  IconCalendar,
  IconFile,
  IconBank,
  IconGrade,
  IconDatabase,
  IconWallet,
  IconAcademic,
  IconBriefcase,
  IconSettings,
  IconRocket,
  IconRefresh,
  IconLogout,
  IconMenu,
  Select
} from "@opensis/ui";

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  home: IconHome,
  book: IconBook,
  clipboard: IconClipboard,
  quiz: IconQuiz,
  exam: IconExam,
  chart: IconChart,
  qrcode: IconQr,
  calendar: IconCalendar,
  file: IconFile,
  bank: IconBank,
  grade: IconGrade,
  database: IconDatabase,
  wallet: IconWallet,
  academic: IconAcademic,
  briefcase: IconBriefcase,
  settings: IconSettings,
  rocket: IconRocket,
  refresh: IconRefresh
};

function unreadFallback(): number {
  return 0;
}

export function AppShell({
  roleGroup,
  children
}: {
  roleGroup: RoleGroup;
  children: ReactNode;
}): JSX.Element {
  const { user, status, logout } = useAuth();
  const { flags } = useFeatureFlags();
  const pathname = usePathname();
  const router = useRouter();
  const demo = useDemoRoleSwitch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Badge unread live via Socket.IO (R-27): nilai awal REST + event notification:new.
  const { unread, refresh: refreshUnread } = useUnreadNotifications();
  const badgeCount = unread ?? unreadFallback();

  // Deep link ?notif=1 (dari badge) → buka panel notifikasi, lalu bersihkan URL.
  // Dipakai window.location (bukan useSearchParams) agar tidak wajib Suspense
  // boundary saat prerender statis (R-46).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("notif") === "1") {
      setNotifOpen(true);
      params.delete("notif");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (status === "error" && !DEMO_MODE) {
      router.replace("/login");
    }
  }, [status, router]);

  // Defense-in-depth: hard redirect bila role user tidak cocok dengan grup route
  // (mis. SISWA membuka /superadmin/*). API tetap fail-closed; ini mencegah
  // menampilkan shell/navigasi grup yang tidak berhak. Sumber role = UserRole
  // server via /auth/me (sama dengan daftar role API).
  useEffect(() => {
    if (status !== "ready" || !user) return;
    const hasGroupAccess = user.roles.some((r) => roleGroupFor(r) === roleGroup);
    if (!hasGroupAccess) {
      router.replace(roleHome(user.primaryRole ?? user.roles[0]));
    }
  }, [status, user, roleGroup, router]);

  if (status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
        aria-busy="true"
      >
        Memuat sesi...
      </div>
    );
  }

  if (status === "error" || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-base text-foreground">Sesi tidak ditemukan.</p>
        <Link href="/login" className="text-base font-medium text-primary underline">
          Masuk kembali
        </Link>
      </div>
    );
  }

  const hasGroupAccess = user.roles.some((r) => roleGroupFor(r) === roleGroup);
  if (!hasGroupAccess) {
    // Menunggu redirect (useEffect di atas) — jangan render shell grup yang tidak berhak.
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
        aria-busy="true"
      >
        Mengalihkan...
      </div>
    );
  }

  const primaryRole = user.primaryRole ?? user.roles[0];
  const items = visibleNav(roleGroup, flags, user.roles);
  // Bottom nav dinamis (R-46): jumlah kolom mengikuti item; bila item > 6
  // tampilkan 5 item + tombol "Lainnya" yang membuka drawer penuh (semua item).
  const overflow = items.length > 6;
  const bottomItems = overflow ? items.slice(0, 5) : items;
  const bottomCols = Math.max(1, bottomItems.length + (overflow ? 1 : 0));
  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="touch-target rounded-md text-muted-foreground hover:bg-muted md:hidden"
              aria-label="Buka menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <Link href={`/${roleGroup}/dashboard`} className="text-lg font-bold text-primary">
              {APP_NAME}
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              · {ROLE_GROUP_LABEL[roleGroup]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {demo.enabled ? (
              <label className="mr-1 hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                Demo role
                <Select
                  aria-label="Ganti role demo"
                  value={demo.role ?? ""}
                  options={DEMO_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
                  onChange={(e) => demo.setRole(e.target.value)}
                  className="h-8 w-40 text-sm"
                />
              </label>
            ) : null}
            <ThemeToggle />
            <span className="hidden sm:inline-block">
              <FontSizeToggle />
            </span>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="touch-target relative rounded-md text-muted-foreground hover:bg-muted"
              aria-label={`Notifikasi${badgeCount ? `, ${badgeCount} belum dibaca` : ""}`}
            >
              <IconBell className="h-5 w-5" />
              {badgeCount && badgeCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-semibold text-white">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              ) : null}
            </button>
            <span className="ml-1 hidden max-w-[180px] truncate text-sm font-medium text-foreground sm:inline">
              {user.fullName}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {roleLabel(primaryRole ?? "SISWA")}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="touch-target ml-1 rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Keluar"
            >
              <IconLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4">
        <nav aria-label="Navigasi utama" className="hidden w-56 shrink-0 py-6 md:block">
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = ICON_MAP[item.icon] ?? IconHome;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-base font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary-100 text-primary-800"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/support"
                className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-muted"
              >
                Bantuan & FAQ
              </Link>
            </li>
          </ul>
        </nav>

        {mobileOpen ? (
          <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <nav className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-background p-4 shadow-lg">
              <p className="mb-2 px-3 text-sm font-semibold text-muted-foreground">
                Menu {ROLE_GROUP_LABEL[roleGroup]}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = ICON_MAP[item.icon] ?? IconHome;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-base font-medium",
                          isActive(item.href)
                            ? "bg-primary-100 text-primary-800"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/support"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-muted"
                  >
                    Bantuan & FAQ
                  </Link>
                </li>
                <li className="mt-2 flex items-center justify-between gap-3 border-t border-border px-3 pt-3">
                  <span className="text-sm font-medium text-foreground">Ukuran teks</span>
                  <FontSizeToggle />
                </li>
              </ul>
            </nav>
          </div>
        ) : null}

        <main id="main" className="min-w-0 flex-1 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden"
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${bottomCols}, minmax(0, 1fr))` }}
        >
          {bottomItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? IconHome;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          {overflow ? (
            <li>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Buka semua menu"
                className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground"
              >
                <IconMenu className="h-5 w-5" />
                Lainnya
              </button>
            </li>
          ) : null}
        </ul>
      </nav>

      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadChanged={refreshUnread}
      />

      <OnboardingTour />
    </div>
  );
}
