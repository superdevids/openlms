"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useFeatureFlags } from "@/lib/feature-flags-hook";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { Button, Input, Switch, Badge } from "@/components/ui";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { IconLock, IconDownload } from "@/components/ui/icons";

const DEMO_USERS = [
  { id: "u1", username: "guru.2026", fullName: "Budi Santoso", role: "GURU", status: "ACTIVE" },
  { id: "u2", username: "siswa.2026", fullName: "Andi Setiawan", role: "SISWA", status: "INVITED" },
  { id: "u3", username: "tu.2026", fullName: "Dewi Lestari", role: "OPERATOR", status: "ACTIVE" }
];

const DEMO_AUDIT = [
  {
    id: "au1",
    actor: "Superadmin",
    action: "featureflag:update",
    entity: "FINANCE_PAYMENT",
    at: "2026-08-06 08:12"
  },
  {
    id: "au2",
    actor: "Operator",
    action: "user:reset-password",
    entity: "siswa.2026",
    at: "2026-08-05 14:40"
  }
];

export default function SuperadminAdminSistemPage(): React.JSX.Element {
  const { flags, setFlag, refresh } = useFeatureFlags(true);
  const [tab, setTab] = React.useState("flags");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const categories = ["all", ...Array.from(new Set(flags.map((f) => f.category)))];
  const filtered = flags.filter(
    (f) =>
      (categoryFilter === "all" || f.category === categoryFilter) &&
      (search.trim() === "" || f.key.toLowerCase().includes(search.toLowerCase()))
  );

  const resetPassword = async (username: string): Promise<void> => {
    if (DEMO_MODE) {
      toast({ variant: "success", title: `Password sementara dibuat untuk ${username} (demo)` });
      return;
    }
    try {
      await api.post("/auth/password/reset", { username });
      toast({ variant: "success", title: "Password sementara dikirim" });
    } catch {
      toast({ variant: "error", title: "Gagal reset password" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Admin Sistem</h1>

      <Tabs
        tabs={[
          { value: "flags", label: "Feature Flags" },
          { value: "user", label: "Manajemen User" },
          { value: "audit", label: "Audit" },
          { value: "backup", label: "Backup" }
        ]}
        value={tab}
        onValueChange={setTab}
      />

      <TabPanel value="flags" activeValue={tab}>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Feature Flags (07-ux §5.14b)</CardTitle>
                <CardDescription>
                  OFF = UI disembunyikan, route diblokir, API tolak{" "}
                  <code className="text-xs">FEATURE_DISABLED</code>. Semua perubahan diaudit.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refresh}>
                Muat ulang
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filter kategori"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-11 rounded-md border border-neutral-300 bg-white px-3 text-base"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "Semua Kategori" : c}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Cari flag"
                placeholder="Cari flag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full min-w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium text-neutral-700">
                      Key
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-neutral-700">
                      Kategori
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-neutral-700">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-neutral-700">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map((f) => (
                    <tr key={f.key} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                          {f.key}
                        </code>
                        {f.locked ? (
                          <Badge variant="neutral" className="ml-2">
                            <IconLock className="h-3 w-3" /> locked
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">{f.category}</td>
                      <td className="px-4 py-3">
                        <Badge variant={f.enabled ? "success" : "neutral"}>
                          {f.enabled ? "ON" : "OFF"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {f.locked || f.isSystem ? (
                          <span className="text-xs text-neutral-500">
                            Terkunci (system/ditunda)
                          </span>
                        ) : (
                          <Switch
                            checked={f.enabled}
                            onCheckedChange={(v) => {
                              setFlag(f.key, v);
                              toast({
                                variant: "info",
                                title: `${f.key} ${v ? "diaktifkan" : "dinonaktifkan"}`,
                                description: "Perubahan dicatat di AuditLog"
                              });
                            }}
                            label={f.enabled ? "ON" : "OFF"}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="user" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Manajemen User</CardTitle>
            <CardDescription>
              Reset password oleh SUPERADMIN/OPERATOR (in-app, tanpa email/SMS).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_USERS.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                        {u.username}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "ACTIVE" ? "success" : "warning"}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void resetPassword(u.username)}
                      >
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="audit" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Aksi sensitif tercatat; filter entity tersedia.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aktor</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Entitas</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_AUDIT.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.actor}</TableCell>
                    <TableCell>
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                        {a.action}
                      </code>
                    </TableCell>
                    <TableCell>{a.entity}</TableCell>
                    <TableCell>{a.at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="backup" activeValue={tab}>
        <Card>
          <CardHeader>
            <CardTitle>Status Backup</CardTitle>
            <CardDescription>
              Backup terverifikasi wajib ada sebelum rollover dieksekusi (prd04 §5.R).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-success-600 bg-success-600/10 px-3 py-2">
              <span className="font-medium text-success-700">
                Backup terakhir: 2026-08-06 02:00 (verifikasi OK)
              </span>
              <Badge variant="success">Segar</Badge>
            </div>
            <Button variant="outline">
              <IconDownload className="h-4 w-4" /> Unduh Status Backup
            </Button>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
