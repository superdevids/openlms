"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "./api-client";
import { useAsyncData } from "./use-api";

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

  return { unread: data ?? null, connected, refresh: refetch };
}
