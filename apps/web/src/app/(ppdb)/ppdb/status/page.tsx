"use client";

import { useState, type FormEvent, type JSX } from "react";

import Link from "next/link";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Alert,
  Badge,
  type BadgeVariant,
  IconCheck,
  IconAlert
} from "@opensis/ui";
import { APP_NAME } from "@/lib/constants";

type Status =
  | {
      ok: true;
      status: "SUBMITTED" | "VERIFIED" | "SELECTED" | "ENROLLED" | "WAITLIST" | "REJECTED";
      next: string;
    }
  | { ok: false; message: string }
  | null;

const DEMO_STATUS: NonNullable<Status> & { ok: true } = {
  ok: true,
  status: "SUBMITTED",
  next: "Dokumen sedang diverifikasi TU — pengumuman 20 Agustus 2026"
};

// Lookup map — pengganti rantai ternary status (F-part: satu sumber kebenaran label/badge).
const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Terdaftar",
  VERIFIED: "Dokumen Diverifikasi",
  SELECTED: "Diterima",
  WAITLIST: "Cadangan",
  REJECTED: "Ditolak",
  ENROLLED: "Jadi Siswa"
};

const STATUS_BADGE: Record<string, BadgeVariant> = {
  SUBMITTED: "warning",
  WAITLIST: "warning",
  VERIFIED: "info",
  SELECTED: "primary",
  REJECTED: "danger",
  ENROLLED: "success"
};

// Status yang dianggap sukses → ikon centang (bukan peringatan).
const STATUS_SUCCESS: ReadonlySet<string> = new Set(["SELECTED", "ENROLLED"]);

export default function PPDBStatusPage(): JSX.Element {
  const [regNo, setRegNo] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    setLoading(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 400));
        setStatus(DEMO_STATUS);
        return;
      }
      const res = await api.get<{
        registration_no: string;
        full_name: string;
        status: "SUBMITTED" | "VERIFIED" | "SELECTED" | "ENROLLED" | "REJECTED" | "WAITLIST";
      }>(`/ppdb/track/public?registrationNo=${encodeURIComponent(regNo)}`);
      setStatus({
        ok: true,
        status: res.status,
        next: `Pendaftar ${res.full_name} — ikuti informasi lanjutan dari sekolah.`
      });
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(err) : "Nomor pendaftaran tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/ppdb" className="text-sm font-medium text-primary">
            &larr; Halaman PPDB
          </Link>
          <p className="text-lg font-bold text-primary">{APP_NAME}</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Cek Status Pendaftaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={(e) => void check(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ppdb-regno">No. Pendaftaran</Label>
                <Input
                  id="ppdb-regno"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="PPDB-2026-0001"
                  required
                />
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Cek Status
              </Button>
            </form>

            {error ? (
              <div role="alert">
                <Alert variant="danger" className="text-sm">
                  {error}
                </Alert>
              </div>
            ) : null}

            {status ? (
              status.ok ? (
                <div role="status" className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    {STATUS_SUCCESS.has(status.status) ? (
                      <IconCheck className="h-5 w-5 text-success-600" />
                    ) : (
                      <IconAlert className="h-5 w-5 text-warning-700" />
                    )}
                    <p className="font-semibold text-foreground">Status: {status.status}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{status.next}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Pipeline:</span>
                    <Badge variant={STATUS_BADGE[status.status] ?? "neutral"}>
                      {STATUS_LABEL[status.status] ?? status.status}
                    </Badge>
                  </div>
                </div>
              ) : (
                <Alert variant="danger" className="text-sm">
                  {status.message}
                </Alert>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
