"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button, Spinner } from "@openlms/ui";
import { APP_NAME } from "@/lib/constants";

/**
 * MaintenanceGate — gerbang mode maintenance global (client).
 *
 * MOUNT (oleh agent pemilik layout/app-shell):
 *   <MaintenanceGate>{children}</MaintenanceGate>
 * Dibungkus di root layout (blokir seluruh aplikasi). Path publik dan halaman
 * kontrol maintenance TETAP dirender tanpa overlay — konsisten dengan allowlist
 * API (apps/api maintenance.middleware.ts): landing (/, /berita, /berita/*)
 * dari /public/landing, dan /superadmin/maintenance agar SUPERADMIN tetap bisa
 * mematikan mode lewat UI (otorisasi tetap di guard).
 *
 * Perilaku:
 * - Path publik → langsung render children (tanpa fetch status).
 * - Mount → fetch GET /public/system-status (endpoint SELALU bekerja, allowlist).
 * - maintenanceEnabled → overlay full-screen halaman maintenance (blocking children).
 * - Offline/error fetch → anggap normal (assume up) — tidak memblokir aplikasi.
 * - Tombol "Kembali" memeriksa ulang status (retry).
 */

interface PublicSystemStatus {
  maintenanceEnabled: boolean;
  message: string | null;
  eta: string | null;
}

type GateState = "checking" | "up" | "maintenance";

/**
 * Path yang dikecualikan dari gerbang (public + kontrol maintenance):
 * - "/" (landing home), "/berita", "/berita/*" — publik, konten dari
 *   /public/landing (allowlist API).
 * - "/superadmin/maintenance" — kontrol ON/OFF mode maintenance.
 */
function isExemptPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/berita" || pathname.startsWith("/berita/")) return true;
  if (pathname === "/superadmin/maintenance") return true;
  return false;
}

export function MaintenanceGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const [state, setState] = React.useState<GateState>("checking");
  const [status, setStatus] = React.useState<PublicSystemStatus | null>(null);
  const [retrying, setRetrying] = React.useState(false);

  const exempt = isExemptPath(pathname);

  const check = React.useCallback(async (signal?: AbortSignal): Promise<void> => {
    setState("checking");
    try {
      const res = await api.get<PublicSystemStatus>("/public/system-status", { signal });
      setStatus(res);
      setState(res.maintenanceEnabled ? "maintenance" : "up");
    } catch {
      // Offline / API tidak terjangkau → anggap normal (tidak memblokir).
      setStatus(null);
      setState("up");
    }
  }, []);

  React.useEffect(() => {
    if (exempt) return;
    const controller = new AbortController();
    void check(controller.signal);
    return () => controller.abort();
  }, [check, exempt]);

  const retry = async (): Promise<void> => {
    setRetrying(true);
    try {
      await check();
    } finally {
      setRetrying(false);
    }
  };

  if (exempt || state !== "maintenance") {
    return <>{children}</>;
  }

  const message =
    status?.message && status.message.trim().length > 0
      ? status.message
      : "Sistem sedang dalam pemeliharaan. Silakan coba lagi dalam beberapa saat.";
  const eta = status?.eta ?? null;

  return (
    <div
      className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-neutral-950/95 p-6 text-white"
      role="alert"
      aria-live="polite"
      aria-label="Halaman pemeliharaan"
    >
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--brand-primary, #2563eb)" }}
          aria-hidden="true"
        >
          <Spinner className="h-6 w-6" />
        </div>
        <p className="mt-5 text-2xl font-bold tracking-tight">{APP_NAME}</p>
        <p className="mt-1 text-sm text-neutral-300">LMS &amp; SIS Sekolah</p>
        <h1 className="mt-6 text-xl font-semibold">Sedang Dalam Pemeliharaan</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-200">{message}</p>
        {eta ? (
          <p
            className="mt-3 text-sm font-medium"
            style={{ color: "var(--brand-primary, #60a5fa)" }}
          >
            Perkiraan selesai: {eta}
          </p>
        ) : null}
        <Button
          variant="outline"
          className="mt-8 border-neutral-600 bg-transparent text-white hover:bg-neutral-800"
          onClick={() => void retry()}
          disabled={retrying}
        >
          {retrying ? "Memeriksa..." : "Kembali"}
        </Button>
        <p className="mt-4 text-xs text-neutral-400">
          Kami sedang meningkatkan layanan untuk pengalaman yang lebih baik.
        </p>
      </div>
    </div>
  );
}
