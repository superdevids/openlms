"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Label, Select, Input, Alert, ConfirmDialog, Badge, toast, IconQr } from "@openlms/ui";

import { formatDuration } from "@/lib/format";

import { DEMO_ATTENDANCE_SUMMARY } from "@/lib/demo";

/**
 * Absensi QR guru — generate sesi → token QR sekali pakai (expire ±7 mnt),
 * countdown, daftar scan real-time (Socket.IO saat backend siap).
 */
export default function GuruAbsensiPage(): React.JSX.Element {
  const [className, setClassName] = React.useState("XI IPA 1 - Matematika");
  const [method, setMethod] = React.useState<"QR_CODE" | "MANUAL">("QR_CODE");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [qrToken, setQrToken] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<number | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [closed, setClosed] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);

  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
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
      const res = await api.post<{ id: string }>("/attendance/sessions", {
        className,
        method: "QR_CODE",
        kind: "MASUK"
      });
      setSessionId(res.id);
      const qr = await api.get<{ qrToken: string; expiresAt: string }>(
        `/attendance/sessions/${res.id}/qr`
      );
      setQrToken(qr.qrToken);
      setExpiresAt(new Date(qr.expiresAt).getTime());
      setClosed(false);
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
      const qr = await api.get<{ qrToken: string; expiresAt: string }>(
        `/attendance/sessions/${sessionId}/qr`
      );
      setQrToken(qr.qrToken);
      setExpiresAt(new Date(qr.expiresAt).getTime());
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Absensi QR</h1>

      <Card>
        <CardHeader>
          <CardTitle>Buat Sesi Absensi</CardTitle>
          <CardDescription>Token QR sekali pakai, kedaluwarsa ±7 menit.</CardDescription>
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
        <Card className={closed ? "opacity-70" : "border-primary-600"}>
          <CardHeader>
            <CardTitle>Sesi: {className}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!closed && qrToken ? (
              <>
                <div
                  className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-6"
                  aria-label="QR Code absensi"
                >
                  <IconQr className="h-40 w-40 text-neutral-900" />
                  <p className="font-mono text-lg font-semibold tracking-widest">{qrToken}</p>
                  <p className="text-sm text-neutral-600" aria-live="polite">
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
              <p className="mb-2 text-sm font-semibold text-neutral-900">Sudah scan</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ATTENDANCE_SUMMARY.map((d) => (
                  <div
                    key={d.date}
                    className="rounded-md border border-neutral-200 p-3 text-center"
                  >
                    <p className="text-lg font-bold text-neutral-900">
                      {d.present}/{d.total}
                    </p>
                    <p className="text-xs text-neutral-600">Hadir</p>
                    {d.late > 0 ? (
                      <Badge variant="warning" className="mt-1">
                        {d.late} terlambat
                      </Badge>
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
