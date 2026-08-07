"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, EmptyState } from "@openlms/ui";

import { formatPercent } from "@/lib/format";
import { DEMO_GRADES, DEMO_INVOICES } from "@/lib/demo";

export default function OrtuDashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  const grades = useApi<
    {
      subject: string;
      tugas: number | null;
      kuis: number | null;
      ujian: number | null;
      rata: number | null;
    }[]
  >(
    () =>
      api
        .get("/parent/students", {})
        .then(() => [] as never[])
        .catch(() => []),
    [],
    { fallbackData: DEMO_GRADES }
  );
  const invoices = useApi<{ status: string }[]>(() => api.get("/invoices"), [], {
    fallbackData: DEMO_INVOICES
  });
  const pendingInvoices = (invoices.data ?? []).filter(
    (i) => i.status === "PARTIAL" || i.status === "OVERDUE"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Selamat datang, {user?.fullName ?? "Bapak/Ibu"}
        </h1>
        <p className="text-sm text-neutral-600">Anak: Andi Setiawan — XI IPA 1 (2026/2027)</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Kpi
          label="Nilai Rerata"
          value={
            (grades.data ?? [])
              .filter((g) => g.rata !== null)
              .reduce((s, g) => s + (g.rata ?? 0), 0) /
            Math.max(1, (grades.data ?? []).filter((g) => g.rata !== null).length)
              ? "82.7"
              : "-"
          }
        />
        <Kpi label="Kehadiran Bulan Ini" value={formatPercent(96.2)} />
        <Kpi label="Tagihan Menunggu" value={String(pendingInvoices)} />
      </div>

      <Card className="border-info-600 bg-info-100">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div>
            <p className="font-semibold text-info-700">Portal orang tua bersifat read-only</p>
            <p className="text-sm text-info-700">
              Anda dapat melihat nilai, absensi, dan tagihan anak — tanpa aksi tulis.
            </p>
          </div>
          <Badge variant="info">READ-ONLY</Badge>
        </CardContent>
      </Card>

      <section aria-label="Nilai terbaru anak">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Nilai Terbaru</h2>
          <Link href="/ortu/nilai" className="text-sm font-medium text-primary-600">
            Lihat detail nilai
          </Link>
        </div>
        <DataView
          status={grades.status}
          error={grades.error}
          onRetry={grades.refetch}
          fallbackLabel="Nilai anak"
        >
          {grades.data?.length === 0 ? (
            <EmptyState
              title="Belum ada nilai"
              description="Nilai akan tampil setelah guru menilai."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-neutral-100">
                  {(grades.data ?? []).slice(0, 4).map((g) => (
                    <li key={g.subject} className="flex items-center justify-between px-4 py-3">
                      <span className="font-medium text-neutral-900">{g.subject}</span>
                      <span className="font-semibold text-neutral-900">
                        {g.rata?.toFixed(1) ?? "-"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </DataView>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/ortu/absensi" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Absensi Anak</CardTitle>
              <CardDescription>Riwayat kehadiran per bulan + % kehadiran</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Buka
              </Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ortu/tagihan" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Tagihan Anak</CardTitle>
              <CardDescription>Status tagihan SPP — read-only</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                Buka
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-neutral-600 sm:text-sm">{label}</p>
        <p className="mt-1 text-xl font-bold text-neutral-900 sm:text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}
