"use client";

import * as React from "react";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, Input, Label } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatTime } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { toast } from "@/components/ui/toast";
import { DEMO_ATTENDANCE } from "@/lib/demo";
import { cn } from "@openlms/ui";

interface AttendanceRecord {
  date: string;
  subject: string;
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPA" | "TERLAMBAT";
}

type ScanResult =
  | { ok: true; status: "HADIR" | "TERLAMBAT"; recordedAt: string }
  | { ok: false; message: string }
  | null;

export default function SiswaAbsensiPage(): React.JSX.Element {
  const list = useApi<AttendanceRecord[]>(() => api.get("/attendance/records"), [], {
    fallbackData: DEMO_ATTENDANCE
  });
  const [sessionId, setSessionId] = React.useState("");
  const [token, setToken] = React.useState("");
  const [result, setResult] = React.useState<ScanResult>(null);
  const [scanning, setScanning] = React.useState(false);

  const scan = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setResult(null);
    setScanning(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 400));
        setResult({ ok: true, status: "HADIR", recordedAt: new Date().toISOString() });
        return;
      }
      const res = await api.post<{ status: "HADIR" | "TERLAMBAT"; recordedAt: string }>(
        "/attendance/records/scan",
        { sessionId, token: token.trim().toUpperCase() },
        { idempotencyKey: newIdempotencyKey("att") }
      );
      setResult({ ok: true, status: res.status, recordedAt: res.recordedAt });
      toast({ variant: "success", title: "Absensi tercatat" });
      list.refetch();
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof ApiError ? errorMessage(err) : "QR tidak valid"
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Absensi Saya</h1>

      <Card className="border-primary-600">
        <CardHeader>
          <CardTitle>Scan QR Absensi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(e) => void scan(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="att-session">Kode Sesi (dari guru)</Label>
                <Input
                  id="att-session"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="ats_1"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="att-token">Kode QR / Manual</Label>
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

          {result ? (
            result.ok ? (
              <div
                role="status"
                className={cn(
                  "rounded-lg border p-4",
                  result.status === "TERLAMBAT"
                    ? "border-warning-700 bg-warning-100"
                    : "border-success-600 bg-success-600/10"
                )}
              >
                <p
                  className={cn(
                    "text-lg font-bold",
                    result.status === "TERLAMBAT" ? "text-warning-700" : "text-success-700"
                  )}
                >
                  {result.status === "TERLAMBAT" ? "Terlambat" : "Hadir"} —{" "}
                  {formatTime(result.recordedAt)}
                </p>
                <p className="text-sm text-neutral-700">
                  Absensi tercatat.{" "}
                  {result.status === "TERLAMBAT"
                    ? "Perhatikan toleransi keterlambatan kelas."
                    : "Tepat waktu."}
                </p>
              </div>
            ) : (
              <div role="alert" className="rounded-lg border border-danger-600 bg-danger-100 p-4">
                <p className="text-lg font-bold text-danger-700">Gagal</p>
                <p className="text-sm text-neutral-800">{result.message}</p>
                <p className="mt-1 text-sm text-neutral-700">
                  Minta QR baru ke guru jika token sudah kedaluwarsa.
                </p>
              </div>
            )
          ) : null}
        </CardContent>
      </Card>

      <section aria-label="Riwayat absensi">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">Riwayat</h2>
        <DataView
          status={list.status}
          error={list.error}
          onRetry={list.refetch}
          fallbackLabel="Riwayat absensi"
        >
          {list.data?.length === 0 ? (
            <EmptyState
              title="Belum ada riwayat absensi"
              description="Absensi akan muncul setelah Anda scan QR."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Mapel</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(list.data ?? []).map((r, i) => (
                      <TableRow key={`${r.date}-${i}`}>
                        <TableCell>{formatDate(r.date)}</TableCell>
                        <TableCell>{r.subject}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "HADIR"
                                ? "success"
                                : r.status === "TERLAMBAT"
                                  ? "warning"
                                  : r.status === "ALPA"
                                    ? "danger"
                                    : "info"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </DataView>
      </section>
    </div>
  );
}
