"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "./api-client";

/**
 * Socket.IO client openlms (R-27) — namespace `/ws` (docs/02 §7.1).
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
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
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
 * - `notification:new` → increment lokal + refetch REST (best-effort event,
 *   REST tetap sumber kebenaran; broadcast tanpa id tidak menambah count).
 * - Reconnect (connected true) → refetch agar sinkron.
 */
export function useUnreadNotifications(): {
  unread: number | null;
  connected: boolean;
  refresh: () => void;
} {
  const { socket, connected } = useSocket();
  const [unread, setUnread] = React.useState<number | null>(null);
  const [tick, setTick] = React.useState(0);

  const refresh = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/notifications/unread-count`, { credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<{ count?: number }>) : null))
      .then((json) => {
        if (!cancelled && json && typeof json.count === "number") {
          setUnread(json.count);
        }
      })
      .catch(() => {
        // offline / non-200 — biarkan nilai sebelumnya
      });
    return () => {
      cancelled = true;
    };
  }, [tick, connected]);

  React.useEffect(() => {
    const onNew = (payload: { id?: string }): void => {
      if (payload && typeof payload.id === "string") {
        // Punya id → notifikasi masuk inbox, naikkan badge + refetch.
        setUnread((u) => (u === null ? u : u + 1));
      }
      setTick((t) => t + 1);
    };
    socket.on(NOTIFICATION_NEW_EVENT, onNew);
    return () => {
      socket.off(NOTIFICATION_NEW_EVENT, onNew);
    };
  }, [socket]);

  return { unread, connected, refresh };
}
