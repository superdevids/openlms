"use client";

import * as React from "react";
import { io } from "socket.io-client";
import { fetchBrandingClient, type BrandingView } from "@/lib/api-client";

/**
 * BrandingProvider — menerapkan variabel CSS --brand-* live di document root.
 * - Fetch branding saat mount (layout.tsx sudah meng-inline style <style id="branding-vars">
 *   untuk render awal; provider menyinkronkan ulang dari API).
 * - Subscribe Socket.IO namespace /ws event "branding:changed" → refetch +
 *   setProperty per key. Sumber kebenaran tetap REST (event best-effort).
 * Variabel yang diterapkan:
 *   --brand-primary, --brand-secondary, --brand-accent, --brand-radius
 */
export function BrandingProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  React.useEffect(() => {
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
          if (!cancelled) apply(b);
        })
        .catch(() => {
          // Gagal fetch (offline/API mati) — biarkan nilai inline layout bertahan.
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
    socket.on("branding:changed", refresh);

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  return <>{children}</>;
}
