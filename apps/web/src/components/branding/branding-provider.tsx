"use client";

import { useEffect, type JSX, type ReactNode } from "react";

import { io } from "socket.io-client";
import { fetchBrandingClient, type BrandingView } from "@/lib/api-client";
import { STORAGE_KEYS, ttlGet, ttlSet, safeRemove } from "@/lib/storage";

/**
 * BrandingProvider — menerapkan variabel CSS --brand-* live di document root.
 * - Fetch branding saat mount (layout.tsx sudah meng-inline style <style id="branding-vars">
 *   untuk render awal; provider menyinkronkan ulang dari API).
 * - Cache browser `opensis_branding_cache` (TTL 1 jam): saat offline/API mati,
 *   identitas visual terakhir tetap dipakai (audit R-23).
 * - Subscribe Socket.IO namespace /ws event "branding:changed" → invalidasi
 *   cache + refetch. Sumber kebenaran tetap REST (event best-effort).
 * Variabel yang diterapkan:
 *   --brand-primary, --brand-secondary, --brand-accent, --brand-radius
 */
const BRANDING_CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam

export function BrandingProvider({ children }: { children: ReactNode }): JSX.Element {
  useEffect(() => {
    let cancelled = false;

    const apply = (b: BrandingView): void => {
      const root = document.documentElement;
      root.style.setProperty("--brand-primary", b.colors.primary);
      root.style.setProperty("--brand-secondary", b.colors.secondary);
      root.style.setProperty("--brand-accent", b.colors.accent);
      root.style.setProperty("--brand-radius", b.radius != null ? `${b.radius}px` : "8px");
    };

    const refresh = (): void => {
      fetchBrandingClient()
        .then((b) => {
          if (cancelled) return;
          apply(b);
          ttlSet(STORAGE_KEYS.brandingCache, b);
        })
        .catch(() => {
          // Offline/API mati: pakai cache browser bila masih segar (≤ 1 jam).
          if (cancelled) return;
          const cached = ttlGet<BrandingView>(STORAGE_KEYS.brandingCache, BRANDING_CACHE_TTL_MS);
          if (cached) apply(cached);
        });
    };

    refresh();

    // Namespace /ws (docs/02 §7.1); cookie httpOnly dikirim otomatis (same-origin).
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "/ws";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
    // branding:changed → invalidasi cache lalu refetch (supaya TTL tidak
    // menampilkan nilai usang setelah superadmin mengganti branding).
    socket.on("branding:changed", () => {
      safeRemove(STORAGE_KEYS.brandingCache);
      refresh();
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  return <>{children}</>;
}
