"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, Button, Input, IconQr, toast } from "@opensis/ui";

import { formatTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";

import { PageHeader, StatCard, StatGrid, EmptyStateV3, RequiredLabel } from "@/components/ui";

interface AttendanceRekapSummary {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  terlambat: number;
  kehadiranPercent: number;
  alpaPercent: number;
}

interface AttendanceRekap {
  period: { start: string | null; end: string | null };
  summary: AttendanceRekapSummary;
  perStudent: Array<{ studentId: string; summary: AttendanceRekapSummary }>;
}

export default function SiswaAbsensiPage(): JSX.Element {
  // Rekap nyata siswa: GET /attendance/rekap (scope SENDIRI — selalu dirinya sendiri).
  const list = useApi<AttendanceRekap>(() => api.get("/attendance/rekap"), [], {
    fallbackData: {
      period: { start: null, end: null },
      summary: {
        total: 12,
        hadir: 10,
        izin: 1,
        sakit: 1,
        alpa: 0,
        terlambat: 0,
        kehadiranPercent: 100,
        alpaPercent: 0
      },
      perStudent: []
    }
  });
  const [sessionId, setSessionId] = useState("");
  const [token, setToken] = useState("");
  const [scanning, setScanning] = useState(false);

  const scan = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setScanning(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 400));
        toast({
          variant: "success",
          title: "Absensi tercatat",
          description: `Hadir — ${formatTime(new Date().toISOString())}`
        });
        return;
      }
      const res = await api.post<{ status: "HADIR" | "TERLAMBAT"; recordedAt: string }>(
        "/attendance/records/scan",
        { sessionId, token: token.trim().toUpperCase() },
        { idempotencyKey: newIdempotencyKey("att") }
      );
      toast({
        variant: "success",
        title: "Absensi tercatat",
        description: `${res.status === "TERLAMBAT" ? "Terlambat" : "Hadir"} — ${formatTime(res.recordedAt)}`
      });
      list.refetch();
    } catch (err) {
      toast({
        variant: "error",
        title: "Absensi gagal",
        description: err instanceof ApiError ? errorMessage(err) : "QR tidak valid"
      });
    } finally {
      setScanning(false);
    }
  };

  const summary = list.data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi Saya"
        description="Scan kode QR/guru untuk mencatat kehadiran dan pantau rekap bulan ini."
      />

      <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
        <CardContent className="space-y-4">
          <form onSubmit={(e) => void scan(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <RequiredLabel htmlFor="att-session">Kode Sesi (dari guru)</RequiredLabel>
                <Input
                  id="att-session"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="ats_1"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <RequiredLabel htmlFor="att-token">Kode QR / Manual</RequiredLabel>
                <Input
                  id="att-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="AT-XXXXXX"
                  required
                  autoCapitalize="characters"
                />
              </div>
            </div>
            <Button type="submit" size="lg" loading={scanning} disabled={scanning}>
              Scan / Validasi Absensi
            </Button>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="siswa-rekap-absensi">
        <h2
          id="siswa-rekap-absensi"
          className="mb-3 text-base font-semibold tracking-tight text-foreground"
        >
          Rekap Kehadiran
        </h2>
        <DataView
          status={list.status}
          error={list.error}
          onRetry={list.refetch}
          fallbackLabel="Rekap absensi"
        >
          {!summary || summary.total === 0 ? (
            <EmptyStateV3
              icon={<IconQr className="h-5 w-5" />}
              title="Belum ada riwayat absensi"
              desc="Absensi akan muncul setelah Anda scan QR."
            />
          ) : (
            <StatGrid>
              <StatCard
                label="Kehadiran"
                value={`${Math.round(summary.kehadiranPercent)}%`}
                icon={<IconQr className="h-5 w-5" aria-hidden="true" />}
                tone={summary.kehadiranPercent < 80 ? "danger" : "success"}
                hint={`dari ${summary.total} absensi`}
              />
              <StatCard
                label="Hadir"
                value={String(summary.hadir)}
                icon={<IconQr className="h-5 w-5" aria-hidden="true" />}
                tone="success"
                hint={summary.terlambat > 0 ? `${summary.terlambat} terlambat` : "tepat waktu"}
              />
              <StatCard
                label="Izin & Sakit"
                value={String(summary.izin + summary.sakit)}
                icon={<IconQr className="h-5 w-5" aria-hidden="true" />}
                tone="warning"
                hint="dengan keterangan"
              />
              <StatCard
                label="Alpa"
                value={String(summary.alpa)}
                icon={<IconQr className="h-5 w-5" aria-hidden="true" />}
                tone={summary.alpa > 0 ? "danger" : "neutral"}
                hint="tanpa keterangan"
              />
            </StatGrid>
          )}
        </DataView>
      </section>
    </div>
  );
}
