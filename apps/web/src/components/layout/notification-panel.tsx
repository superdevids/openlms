"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { API_BASE } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";
import { setLastReadNotif } from "@/lib/storage";
import { useFocusTrap } from "@/lib/use-focus-trap";
import {
  ANNOUNCEMENT_NEW_EVENT,
  INVOICE_PAID_EVENT,
  SUBMISSION_GRADED_EVENT,
  useRealtimeRefetch
} from "@/lib/use-socket";
import { ErrorState, IconBell, Skeleton } from "@opensis/ui";
import { EmptyStateV3 } from "@/components/ui";

/**
 * NotificationPanel (R-26/R-46) — panel notifikasi di app-shell.
 * Dibuka lewat URL `?notif=1` (deep link dari badge) atau klik tombol bell.
 * Data dari REST `/notifications` (sumber kebenaran); event Socket.IO hanya
 * memicu refresh (best-effort). Event domain announcement:new / invoice:paid /
 * submission:graded ikut memicu reload saat panel terbuka.
 */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationPanel({
  open,
  onClose,
  onUnreadChanged
}: {
  open: boolean;
  onClose: () => void;
  onUnreadChanged: () => void;
}): JSX.Element | null {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open, onClose);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/notifications?pageSize=10`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { items?: NotificationItem[] };
      setItems(json.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  }, []);

  // Event domain → refetch list saat panel terbuka (best-effort).
  useRealtimeRefetch(
    [ANNOUNCEMENT_NEW_EVENT, INVOICE_PAID_EVENT, SUBMISSION_GRADED_EVENT],
    useCallback(() => {
      if (openRef.current) void load();
    }, [load])
  );

  useEffect(() => {
    if (open) {
      setLastReadNotif();
      void load();
    }
  }, [open, load]);

  const markRead = async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "POST",
      credentials: "include"
    }).catch(() => undefined);
    setLastReadNotif();
    onUnreadChanged();
    void load();
  };

  const markAllRead = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLastReadNotif();
      onUnreadChanged();
      void load();
    } catch {
      // Gagal → jangan tandai dibaca / update state optimis (silent fail dicegah).
    }
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Panel notifikasi"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <section className="absolute inset-y-0 right-0 w-96 max-w-[85vw] overflow-y-auto rounded-l-xl border-l border-border bg-app-surface p-4 shadow-app-floating">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Notifikasi</h2>
          <div className="flex items-center gap-2">
            {items.some((i) => !i.readAt) ? (
              <button
                type="button"
                className="rounded text-xs font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void markAllRead()}
              >
                Tandai semua dibaca
              </button>
            ) : null}
            <button
              type="button"
              className="touch-target rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Tutup panel notifikasi"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2" role="status" aria-label="Memuat notifikasi">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-h-14 rounded-lg border border-border bg-app-surface p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} title="Gagal memuat notifikasi" onRetry={() => void load()} />
        ) : items.length === 0 ? (
          <EmptyStateV3
            compact
            icon={<IconBell className="h-5 w-5" />}
            title="Tidak ada notifikasi baru"
            desc="Pembaruan tugas, ujian, dan keuangan akan muncul di sini."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void markRead(item.id)}
                  className={`min-h-11 w-full rounded-lg border p-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    item.readAt
                      ? "border-border"
                      : "border-l-2 border-l-brand-primary border-border bg-sidebar-accent/60"
                  }`}
                >
                  {!item.readAt ? <span className="sr-only">Belum dibaca</span> : null}
                  <p className="flex items-start gap-1.5 text-sm font-semibold text-foreground">
                    <span className="min-w-0 flex-1">{item.title}</span>
                    {!item.readAt ? (
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary"
                        aria-hidden="true"
                      />
                    ) : null}
                  </p>
                  {item.body ? (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatRelative(item.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
