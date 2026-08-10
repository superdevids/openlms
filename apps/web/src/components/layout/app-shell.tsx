"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type JSX,
  type ReactNode
} from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn, DropdownMenu, DropdownMenuItem } from "@opensis/ui";
import { useAuth, useDemoRoleSwitch } from "@/components/auth/auth-provider";
import {
  visibleNav,
  roleLabel,
  roleGroupFor,
  roleHome,
  ROLE_GROUP_LABEL,
  type NavItem,
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
import { useFocusTrap } from "@/lib/use-focus-trap";
import { CommandPalette, type CommandItem } from "@/components/ui";
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
  IconMenu,
  IconSearch,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconInfo,
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

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const value = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return value || "U";
}

interface NavSection {
  label: string;
  items: NavItem[];
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
  const [commandOpen, setCommandOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(mobileDrawerRef, mobileOpen, () => setMobileOpen(false));

  // Badge unread live via Socket.IO (R-27): nilai awal REST + event notification:new.
  const { unread, refresh: refreshUnread } = useUnreadNotifications();
  const badgeCount = unread ?? unreadFallback();

  // Deep link ?notif=1 (dari badge) → buka panel notifikasi, lalu bersihkan URL.
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

  // Defense-in-depth: hard redirect bila role user tidak cocok dengan grup route.
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
  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`);
  const pageTitle = items.find((i) => isActive(i.href))?.label ?? ROLE_GROUP_LABEL[roleGroup];

  // Grouping sidebar per spec D.1.a — urutan item mengikuti NAV_ITEMS.
  const sections = useMemo<NavSection[]>(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of items) {
      const g = item.group ?? "Umum";
      const list = map.get(g) ?? [];
      list.push(item);
      map.set(g, list);
    }
    return Array.from(map.entries()).map(([label, sectionItems]) => ({
      label,
      items: sectionItems
    }));
  }, [items]);

  const commandItems = useMemo<CommandItem[]>(
    () => [
      ...items.map((item) => {
        const Icon = ICON_MAP[item.icon] ?? IconHome;
        return {
          id: item.href,
          label: item.label,
          group: item.group ?? "Menu",
          href: item.href,
          icon: <Icon className="h-4 w-4" />
        } satisfies CommandItem;
      }),
      {
        id: "support",
        label: "Bantuan & FAQ",
        group: "Umum",
        href: "/support",
        icon: <IconInfo className="h-4 w-4" />
      }
    ],
    [items]
  );

  // Bottom nav dinamis (R-46): jumlah kolom mengikuti item; bila item > 6
  // tampilkan 5 item + tombol "Lainnya" yang membuka drawer penuh.
  const overflow = items.length > 6;
  const bottomItems = overflow ? items.slice(0, 5) : items;
  const bottomCols = Math.max(1, bottomItems.length + (overflow ? 1 : 0));

  const renderNavItem = (item: NavItem, onNavigate?: () => void): JSX.Element => {
    const Icon = ICON_MAP[item.icon] ?? IconHome;
    const active = isActive(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
            active
              ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60"
          )}
        >
          {active ? (
            <span
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-sidebar-primary"
              aria-hidden="true"
            />
          ) : null}
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div className="flex min-h-screen bg-app-bg">
      {/* ===== Sidebar desktop (lg+) ===== */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {/* 1. Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <IconAcademic className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-sidebar-foreground">{APP_NAME}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {ROLE_GROUP_LABEL[roleGroup]}
            </p>
          </div>
        </div>

        {/* 2. Navigasi berkelompok */}
        <nav aria-label="Navigasi utama" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">{section.items.map((item) => renderNavItem(item))}</ul>
            </div>
          ))}
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Lainnya
            </p>
            <ul>
              <li>
                <Link
                  href="/support"
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
                >
                  <IconInfo className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">Bantuan & FAQ</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* 3. User card footer */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <DropdownMenu
            label="Menu pengguna"
            align="start"
            trigger={
              <span className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-2 transition-colors hover:bg-sidebar-accent/60">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
                  aria-hidden="true"
                >
                  {initials(user.fullName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                    {user.fullName}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {roleLabel(primaryRole ?? "SISWA")}
                  </span>
                </span>
                <IconChevronUp
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </span>
            }
          >
            <Link href="/support" className="block w-full">
              <DropdownMenuItem>Bantuan & FAQ</DropdownMenuItem>
            </Link>
            <DropdownMenuItem onSelect={() => void logout()}>Keluar</DropdownMenuItem>
          </DropdownMenu>
        </div>
      </aside>

      {/* ===== Kolom kanan: topbar + main ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-topbar backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="touch-target rounded-md text-muted-foreground hover:bg-muted lg:hidden"
                aria-label="Buka menu"
              >
                <IconMenu className="h-5 w-5" />
              </button>
              {/* Breadcrumb / konteks halaman */}
              <nav
                aria-label="Breadcrumb"
                className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex"
              >
                <span className="font-medium text-muted-foreground">
                  {ROLE_GROUP_LABEL[roleGroup]}
                </span>
                <IconChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-foreground">{pageTitle}</span>
              </nav>
            </div>
            <div className="flex items-center gap-1.5">
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
              {/* Command palette trigger (desktop) */}
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="hidden h-10 w-64 items-center gap-2 rounded-md border border-input bg-app-surface px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
                aria-label="Cari (Ctrl+K)"
              >
                <IconSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate text-left">Cari menu…</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  Ctrl K
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="touch-target rounded-md text-muted-foreground hover:bg-muted md:hidden"
                aria-label="Cari"
              >
                <IconSearch className="h-5 w-5" />
              </button>
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
                {badgeCount > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                ) : null}
              </button>
              {/* User menu (desktop) */}
              <DropdownMenu
                label="Menu pengguna"
                trigger={
                  <span className="ml-1 hidden h-10 cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-muted sm:flex">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-800"
                      aria-hidden="true"
                    >
                      {initials(user.fullName)}
                    </span>
                    <IconChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                }
              >
                <Link href="/support" className="block w-full">
                  <DropdownMenuItem>Bantuan & FAQ</DropdownMenuItem>
                </Link>
                <DropdownMenuItem onSelect={() => void logout()}>Keluar</DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:px-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* ===== Drawer mobile ===== */}
      {mobileOpen ? (
        <div
          ref={mobileDrawerRef}
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-sidebar p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-sidebar-border pb-3">
              <p className="px-1 text-sm font-semibold text-foreground">
                Menu {ROLE_GROUP_LABEL[roleGroup]}
              </p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="touch-target rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Tutup menu"
              >
                <IconMenu className="h-5 w-5" />
              </button>
            </div>
            {sections.map((section) => (
              <div key={section.label} className="mb-4">
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
                </ul>
              </div>
            ))}
            <div className="mb-4">
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Lainnya
              </p>
              <ul>
                <li>
                  <Link
                    href="/support"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
                  >
                    <IconInfo className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">Bantuan & FAQ</span>
                  </Link>
                </li>
              </ul>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-sidebar-border px-3 pt-3">
              <span className="text-sm font-medium text-sidebar-foreground">Ukuran teks</span>
              <FontSizeToggle />
            </div>
          </nav>
        </div>
      ) : null}

      {/* ===== Bottom nav (mobile) ===== */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-app-surface md:hidden"
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${bottomCols}, minmax(0, 1fr))` }}
        >
          {bottomItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? IconHome;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
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

      <CommandPalette items={commandItems} open={commandOpen} onOpenChange={setCommandOpen} />

      <OnboardingTour />
    </div>
  );
}
