"use client";

import * as React from "react";
import Link from "next/link";
import { useFeatureFlags } from "@/lib/feature-flags-hook";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@openlms/ui";

import { formatPercent } from "@/lib/format";

export default function SuperadminDashboardPage(): React.JSX.Element {
  const { flags } = useFeatureFlags();
  const summary = flags.slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Statistik Sekolah</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Siswa" value="1,204" />
        <Kpi label="Guru" value="86" />
        <Kpi label="Kelas" value="48" />
        <Kpi label="Adopsi Fitur" value={formatPercent(64)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Feature Flags (ringkas)</CardTitle>
            <Link href="/superadmin/admin-sistem">
              <Button size="sm" variant="outline">
                Kelola Semua
              </Button>
            </Link>
          </div>
          <CardDescription>
            OFF = UI disembunyikan, route diblokir, API tolak FEATURE_DISABLED (prd04 §5.N).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((f) => (
                <TableRow key={f.key}>
                  <TableCell>
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{f.key}</code>
                    {f.locked ? (
                      <Badge variant="neutral" className="ml-2">
                        locked
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{f.category}</TableCell>
                  <TableCell>
                    <Badge variant={f.enabled ? "success" : "neutral"}>
                      {f.enabled ? "ON" : "OFF"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/superadmin/admin-sistem" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Pengaturan Aplikasi</CardTitle>
              <CardDescription>Identitas sekolah, tahun ajaran, Feature Flags</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/superadmin/onboarding" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Onboarding Setup</CardTitle>
              <CardDescription>
                Wizard 5 langkah: profil → kebijakan → impor → undang → aktifkan
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/superadmin/rollover" className="block">
          <Card className="h-full transition-colors hover:border-primary-600">
            <CardHeader>
              <CardTitle>Rollover Tahun Ajaran</CardTitle>
              <CardDescription>
                Pre-check → dry-run → konfirmasi → eksekusi → rollback
              </CardDescription>
            </CardHeader>
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
        <p className="text-sm text-neutral-600">{label}</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
      </CardContent>
    </Card>
  );
}
