"use client";

import * as React from "react";
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
  IconCheck,
  IconAlert
} from "@openlms/ui";
import { APP_NAME } from "@/lib/constants";

type Status =
  | { ok: true; status: "SUBMITTED" | "VERIFIED" | "SELECTED" | "ENROLLED"; next: string }
  | { ok: false; message: string }
  | null;

const DEMO_STATUS: NonNullable<Status> & { ok: true } = {
  ok: true,
  status: "SUBMITTED",
  next: "Dokumen sedang diverifikasi TU — pengumuman 20 Agustus 2026"
};

export default function PPDBStatusPage(): React.JSX.Element {
  const [regNo, setRegNo] = React.useState("");
  const [status, setStatus] = React.useState<Status>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const check = async (e: React.FormEvent): Promise<void> => {
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
      const res = await api.get<{ status: "SUBMITTED" | "VERIFIED" | "SELECTED" | "ENROLLED" }>(
        `/ppdb/status?registrationNo=${encodeURIComponent(regNo)}`
      );
      setStatus({ ok: true, status: res.status, next: "Ikuti informasi lanjutan dari sekolah." });
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(err) : "Nomor pendaftaran tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/ppdb" className="text-sm font-medium text-primary-600">
            &larr; Halaman PPDB
          </Link>
          <p className="text-lg font-bold text-primary-700">{APP_NAME}</p>
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
                <div
                  role="status"
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="flex items-center gap-2">
                    {status.status === "SELECTED" || status.status === "ENROLLED" ? (
                      <IconCheck className="h-5 w-5 text-success-600" />
                    ) : (
                      <IconAlert className="h-5 w-5 text-warning-700" />
                    )}
                    <p className="font-semibold text-neutral-900">Status: {status.status}</p>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{status.next}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Pipeline:</span>
                    <Badge
                      variant={
                        status.status === "SUBMITTED"
                          ? "warning"
                          : status.status === "VERIFIED"
                            ? "info"
                            : status.status === "SELECTED"
                              ? "primary"
                              : "success"
                      }
                    >
                      {status.status === "SUBMITTED"
                        ? "Terdaftar"
                        : status.status === "VERIFIED"
                          ? "Dokumen Diverifikasi"
                          : status.status === "SELECTED"
                            ? "Diterima"
                            : "Jadi Siswa"}
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
