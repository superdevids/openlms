"use client";

import { useEffect, useState, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Label,
  Select,
  Input,
  Alert,
  ConfirmDialog,
  IconQr,
  toast
} from "@opensis/ui";

import { formatDuration } from "@/lib/format";

import { DEMO_ATTENDANCE_SUMMARY } from "@/lib/demo";
import { getSocket, ATTENDANCE_CHECKED_IN_EVENT } from "@/lib/use-socket";
import { PageHeader, StatusBadge } from "@/components/ui";

/**
 * Absensi QR guru — generate sesi → token QR sekali pakai (expire ±7 mnt),
 * countdown, daftar scan real-time (Socket.IO saat backend siap).
 * Guru join room `class:{classId}` agar menerima event attendance:checked-in
 * (payload memuat total scan sesi) — best-effort; REST tetap sumber kebenaran.
 */
export default function GuruAbsensiPage(): JSX.Element {
  const [className, setClassName] = useState("XI IPA 1 - Matematika");
  const [method, setMethod] = useState<"QR_CODE" | "MANUAL">("QR_CODE");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [classSubjectId, setClassSubjectId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [closed, setClosed] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  // Jumlah scan live dari event realtime (best-effort).
  const [liveCount, setLiveCount] = useState(0);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remaining = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;

  const createSession = async (): Promise<void> => {
    setCreating(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 300));
        setSessionId("ats_demo");
        setQrToken("AT-DEMO1");
        setExpiresAt(Date.now() + 7 * 60000);
        setClosed(false);
        toast({ variant: "info", title: "Sesi absensi demo dibuat" });
        return;
      }
      const res = await api.post<{ id: string; class_subject_id?: string | null }>(
        "/attendance/sessions",
        {
          className,
          method: "QR_CODE",
          kind: "MASUK"
        }
      );
      setSessionId(res.id);
      setClassSubjectId(res.class_subject_id ?? null);
      const qr = await api.post<{ token: string; expires_at: string }>(
        `/attendance/sessions/${res.id}/tokens`,
        { ttl_minutes: 7 }
      );
      setQrToken(qr.token);
      setExpiresAt(new Date(qr.expires_at).getTime());
      setClosed(false);
      setLiveCount(0);
      toast({ variant: "success", title: "Sesi absensi dibuat" });
    } catch {
      toast({ variant: "error", title: "Gagal membuat sesi absensi" });
    } finally {
      setCreating(false);
    }
  };

  const extend = async (): Promise<void> => {
    if (!sessionId) return;
    try {
      if (DEMO_MODE) {
        setExpiresAt(Date.now() + 5 * 60000);
        toast({ variant: "success", title: "QR diperpanjang 5 menit (demo)" });
        return;
      }
      const qr = await api.post<{ token: string; expires_at: string }>(
        `/attendance/sessions/${sessionId}/tokens`,
        { ttl_minutes: 5 }
      );
      setQrToken(qr.token);
      setExpiresAt(new Date(qr.expires_at).getTime());
      toast({ variant: "success", title: "QR baru diterbitkan" });
    } catch {
      toast({ variant: "error", title: "Gagal memperpanjang QR" });
    }
  };

  const closeSession = async (): Promise<void> => {
    setClosed(true);
    setQrToken(null);
    toast({ variant: "success", title: "Sesi ditutup" });
  };

  // Realtime scan live (best-effort, R-27): join room class:{classId} saat
  // sesi dibuat, hitung event attendance:checked-in untuk sesi ini.
  useEffect(() => {
    if (!sessionId || !classSubjectId || closed || DEMO_MODE) return;
    const socket = getSocket();
    const room = `class:${classSubjectId}`;
    socket.emit("room:join", { room });

    const onCheckedIn = (payload: { sessionId?: string; total?: number }): void => {
      if (payload.sessionId && payload.sessionId === sessionId) {
        setLiveCount(payload.total ?? ((prev) => prev + 1));
      }
    };
    socket.on(ATTENDANCE_CHECKED_IN_EVENT, onCheckedIn);

    return () => {
      socket.off(ATTENDANCE_CHECKED_IN_EVENT, onCheckedIn);
      socket.emit("room:leave", { room });
    };
  }, [sessionId, classSubjectId, closed]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Absensi QR"
        description="Buat sesi absensi, tampilkan QR ke siswa, pantau scan secara real-time."
      />

      <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Buat Sesi Absensi</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Token QR sekali pakai, kedaluwarsa ±7 menit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="att-class">Kelas / Mata Pelajaran</Label>
            <Input
              id="att-class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-method">Metode</Label>
            <Select
              id="att-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as "QR_CODE" | "MANUAL")}
              options={[
                { value: "QR_CODE", label: "QR Code" },
                { value: "MANUAL", label: "Manual (fallback)" }
              ]}
            />
          </div>
          <Button
            onClick={() => void createSession()}
            loading={creating}
            disabled={!!sessionId && !closed}
          >
            Generate QR
          </Button>
        </CardContent>
      </Card>

      {sessionId ? (
        <Card
          className={
            closed
              ? "rounded-lg border-border bg-app-surface opacity-70 shadow-app-card"
              : "rounded-lg border-brand-primary/50 bg-app-surface shadow-app-card"
          }
        >
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Sesi: {className}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!closed && qrToken ? (
              <>
                <div
                  className="flex flex-col items-center gap-2 rounded-lg border border-border bg-app-surface-2/60 p-6"
                  aria-label="QR Code absensi"
                >
                  <IconQr className="h-40 w-40 text-foreground" />
                  <p className="font-mono text-lg font-semibold tracking-widest">{qrToken}</p>
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    Kedaluwarsa: {formatDuration(remaining)}{" "}
                    {remaining <= 60 ? "— segera perpanjang!" : ""}
                  </p>
                  {remaining <= 60 ? (
                    <Alert variant="warning" className="text-sm">
                      Token hampir kedaluwarsa. Perpanjang agar siswa tetap bisa scan.
                    </Alert>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void extend()}>
                    Perpanjang 5 mnt
                  </Button>
                  <Button variant="destructive" onClick={() => setCloseOpen(true)}>
                    Tutup Sesi
                  </Button>
                </div>
              </>
            ) : (
              <Alert variant="info">
                Sesi telah ditutup. Buat sesi baru untuk pertemuan berikutnya.
              </Alert>
            )}

            <div aria-label="Ringkasan scan">
              <p className="mb-2 text-sm font-semibold text-foreground">Sudah scan</p>
              {!DEMO_MODE && sessionId ? (
                <div className="mb-2 rounded-md border border-status-info-border bg-status-info-bg p-3 text-center">
                  <p
                    className="text-2xl font-bold tabular-nums text-status-info-fg"
                    aria-live="polite"
                  >
                    {liveCount}
                  </p>
                  <p className="text-xs text-status-info-fg">scan live sesi ini</p>
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ATTENDANCE_SUMMARY.map((d) => (
                  <div
                    key={d.date}
                    className="rounded-md border border-border bg-app-surface-2/40 p-3 text-center"
                  >
                    <p className="text-lg font-bold tabular-nums text-foreground">
                      {d.present}/{d.total}
                    </p>
                    <p className="text-xs text-muted-foreground">Hadir</p>
                    {d.late > 0 ? (
                      <StatusBadge
                        status="TERLAMBAT"
                        label={`${d.late} terlambat`}
                        className="mt-1"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Tutup sesi absensi?"
        description="Setelah ditutup, siswa tidak bisa lagi scan QR ini. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, tutup sesi"
        destructive
        onConfirm={() => void closeSession()}
      />
    </div>
  );
}
