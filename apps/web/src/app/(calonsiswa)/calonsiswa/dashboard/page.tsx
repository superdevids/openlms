"use client";

import { useState, type FormEvent, type JSX } from "react";

import Link from "next/link";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Alert,
  Badge,
  EmptyState,
  IconCheck,
  IconAlert,
  IconFile
} from "@opensis/ui";
import { NewsItem } from "@/lib/constants";

type TrackStatus = "SUBMITTED" | "VERIFIED" | "SELECTED" | "ENROLLED" | "WAITLIST" | "REJECTED";

interface TrackResult {
  registration_no: string;
  full_name: string;
  status: TrackStatus;
}

const CHECKLIST = [
  { label: "Akta kelahiran", done: true },
  { label: "Kartu Keluarga (KK)", done: true },
  { label: "Ijazah / SKHUN", done: true },
  { label: "Pas foto 3x4", done: false },
  { label: "Kartu NISN", done: false }
];

function statusVariant(status: TrackStatus): "success" | "warning" | "info" | "danger" | "primary" {
  if (status === "ENROLLED") return "success";
  if (status === "SELECTED") return "primary";
  if (status === "REJECTED") return "danger";
  if (status === "WAITLIST") return "warning";
  return "info";
}

function statusLabel(status: TrackStatus): string {
  const map: Record<TrackStatus, string> = {
    SUBMITTED: "Terdaftar — menunggu verifikasi",
    VERIFIED: "Dokumen terverifikasi",
    SELECTED: "Diterima",
    ENROLLED: "Resmi menjadi siswa",
    WAITLIST: "Cadangan",
    REJECTED: "Ditolak"
  };
  return map[status];
}

const DEMO_STATUS: TrackResult = {
  registration_no: "PPDB-2026-0001",
  full_name: "Budi Santoso",
  status: "SUBMITTED"
};

export default function CalonSiswaDashboardPage(): JSX.Element {
  const [regNo, setRegNo] = useState("");
  const [submittedNo, setSubmittedNo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const track = useApi<TrackResult>(
    (signal) =>
      api.get<TrackResult>(`/ppdb/track/public?registrationNo=${encodeURIComponent(submittedNo)}`, {
        signal
      }),
    [submittedNo],
    { enabled: submittedNo.length > 0 && !DEMO_MODE }
  );

  const berita = useApi<NewsItem[]>(
    (signal) =>
      fetch("/api/v1/public/landing/berita", { signal })
        .then((res) => (res.ok ? (res.json() as Promise<NewsItem[]>) : []))
        .catch(() => []),
    []
  );

  const check = (e: FormEvent): void => {
    e.preventDefault();
    setError(null);
    if (!regNo.trim()) {
      setError("Masukkan nomor pendaftaran.");
      return;
    }
    if (DEMO_MODE) return;
    setSubmittedNo(regNo.trim());
  };

  const effectiveStatus =
    DEMO_MODE && track.status !== "success" ? DEMO_STATUS : (track.data ?? null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard Calon Siswa</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Pendaftaran</CardTitle>
            <CardDescription>
              Masukkan nomor pendaftaran untuk melihat progres PPDB Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => void check(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cs-regno">No. Pendaftaran</Label>
                <Input
                  id="cs-regno"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="PPDB-2026-0001"
                />
              </div>
              {error ? (
                <Alert variant="danger" className="text-sm">
                  {error}
                </Alert>
              ) : null}
              <Button type="submit" loading={track.status === "loading"}>
                Cek Status
              </Button>
            </form>

            {track.status === "error" && submittedNo ? (
              <Alert variant="danger" className="text-sm">
                {track.error?.message ?? "Nomor pendaftaran tidak ditemukan."}
              </Alert>
            ) : null}

            {effectiveStatus ? (
              <div role="status" className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center gap-2">
                  {effectiveStatus.status === "SELECTED" ||
                  effectiveStatus.status === "ENROLLED" ? (
                    <IconCheck className="h-5 w-5 text-success-600" />
                  ) : (
                    <IconAlert className="h-5 w-5 text-warning-700" />
                  )}
                  <p className="font-semibold text-foreground">{effectiveStatus.full_name}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(effectiveStatus.status)}>
                    {statusLabel(effectiveStatus.status)}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {effectiveStatus.registration_no}
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist Dokumen</CardTitle>
            <CardDescription>Pastikan seluruh berkas pendaftaran sudah lengkap.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {CHECKLIST.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  {item.done ? (
                    <Badge variant="success">Lengkap</Badge>
                  ) : (
                    <Badge variant="warning">Kurang</Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pengumuman Sekolah</CardTitle>
          <CardDescription>Informasi terbaru dari halaman resmi sekolah.</CardDescription>
        </CardHeader>
        <CardContent>
          {(berita.data ?? []).length === 0 ? (
            <EmptyState
              title="Belum ada pengumuman"
              description="Pengumuman akan tampil saat sekolah menerbitkan berita."
            />
          ) : (
            <ul className="space-y-2">
              {(berita.data ?? []).slice(0, 5).map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/berita/${n.slug}`}
                    className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-muted"
                  >
                    <IconFile className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{n.title}</span>
                      {n.excerpt ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                          {n.excerpt}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
