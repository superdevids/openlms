"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "./api-client";
import { useAsyncData } from "./use-api";
import { STORAGE_KEYS } from "./storage";

/**
 * Socket.IO client opensis (R-27) — namespace `/ws` (docs/02 §7.1).
 * - URL: NEXT_PUBLIC_SOCKET_URL bila diset; else diturunkan dari API_BASE
 *   (origin + /ws) agar cocok dengan RealtimeGateway.
 * - Satu koneksi singleton per halaman (getSocket) — app-shell (badge notifikasi)
 *   dan halaman ujian (join room exam) memakai socket yang sama.
 * - Reconnect otomatis (socket.io); event best-effort, sumber kebenaran REST.
 */

/** Event generic inbox (notification-events.ts di API). */
export const NOTIFICATION_NEW_EVENT = "notification:new";
export const EXAM_FORCE_SUBMIT_EVENT = "exam:force-submit";
export const EXAM_TICK_EVENT = "exam:tick";
export const ANNOUNCEMENT_NEW_EVENT = "announcement:new";
export const INVOICE_PAID_EVENT = "invoice:paid";
export const SUBMISSION_GRADED_EVENT = "submission:graded";
export const GRADE_RECORDED_EVENT = "grade:recorded";
export const PAYROLL_STATUS_EVENT = "payroll:status";
export const ATTENDANCE_CHECKED_IN_EVENT = "attendance:checked-in";
export const BRANDING_CHANGED_EVENT = "branding:changed";

function socketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (configured) return configured;
  const base = (API_BASE ?? "").replace(/\/+$/, "");
  if (base.startsWith("http")) {
    const origin = base.replace(/\/api\/v1$/, "");
    return `${origin}/ws`;
  }
  return "/ws";
}

let sharedSocket: Socket | null = null;

/** Ambil koneksi singleton; dibuat sekali (reconnect dikelola socket.io). */
export function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(socketUrl(), {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000
    });
  }
  return sharedSocket;
}

/** State koneksi (connect/disconnect/reconnect). */
export interface SocketState {
  socket: Socket;
  connected: boolean;
}

export function useSocket(): SocketState {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = (): void => setConnected(true);
    const onDisconnect = (): void => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);
    if (socket.connected) setConnected(true);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
    };
  }, []);

  return { socket: getSocket(), connected };
}

/**
 * Hook unread count badge (R-27):
 * - Nilai awal dari REST `/notifications/unread-count` (authoritative).
 * - `notification:new` → refetch REST (best-effort event, REST tetap sumber
 *   kebenaran); non-ok/offline → biarkan data sebelumnya.
 * - Reconnect (connected true) → refetch agar sinkron.
 * - Event `storage` key opensis_last_read_notif (tab lain menandai dibaca) →
 *   refetch agar badge konsisten lintas tab (R-26).
 */
export function useUnreadNotifications(): {
  unread: number | null;
  connected: boolean;
  refresh: () => void;
} {
  const { socket, connected } = useSocket();
  const { data, refetch } = useAsyncData<number | null>(
    (signal) =>
      fetch(`${API_BASE}/notifications/unread-count`, { credentials: "include", signal })
        .then((res) => (res.ok ? (res.json() as Promise<{ count?: number }>) : null))
        .then((json) => (json && typeof json.count === "number" ? json.count : null)),
    [connected]
  );

  useEffect(() => {
    const onNew = (): void => refetch();
    socket.on(NOTIFICATION_NEW_EVENT, onNew);
    return () => {
      socket.off(NOTIFICATION_NEW_EVENT, onNew);
    };
  }, [socket, refetch]);

  // Badge lintas tab: tab lain menandai dibaca → localStorage berubah → refetch.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STORAGE_KEYS.lastReadNotif) refetch();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refetch]);

  return { unread: data ?? null, connected, refresh: refetch };
}

/**
 * Hook generik refetch saat event realtime tertentu tiba (best-effort).
 * Dipakai panel/halaman yang menampilkan data dari REST: event datang →
 * refetch sumber kebenaran. Contoh: announcement:new, invoice:paid,
 * submission:graded di panel notifikasi / halaman nilai.
 */
export function useRealtimeRefetch(events: string[], refetch: () => void): { connected: boolean } {
  const { socket, connected } = useSocket();
  const eventsKey = events.join("|");
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const names = eventsKey.split("|").filter(Boolean);
    const onEvent = (): void => refetchRef.current();
    for (const event of names) socket.on(event, onEvent);
    return () => {
      for (const event of names) socket.off(event, onEvent);
    };
  }, [socket, eventsKey]);

  return { connected };
}
