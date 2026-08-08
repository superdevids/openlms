"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useFeatureFlags } from "@/lib/feature-flags-hook";
import { useApi } from "@/lib/use-api";
import { ChangeLogTable } from "@/components/audit/change-log-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Tabs,
  TabPanel,
  Button,
  Input,
  Switch,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  DataView,
  toast,
  IconLock,
  IconDownload
} from "@openlms/ui";

interface AdminUser {
  id: string;
  username: string | null;
  email: string | null;
  fullName: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function SuperadminAdminSistemPage(): React.JSX.Element {
  const { flags, setFlag, refresh } = useFeatureFlags(true);
  const [tab, setTab] = React.useState("flags");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const users = useApi<{ items: AdminUser[]; total: number }>(
    () => api.get<{ items: AdminUser[]; total: number }>("/admin/users"),
    []
  );

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
              Daftar user nyata (GET /admin/users). Reset password oleh SUPERADMIN/OPERATOR (in-app,
              tanpa email/SMS).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataView
              status={users.status}
              error={users.error}
              onRetry={users.refetch}
              fallbackLabel="Daftar user"
            >
              {users.data?.items.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="Belum ada user" description="Data user akan tampil di sini." />
                </div>
              ) : (
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
                    {(users.data?.items ?? []).map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                            {u.username ?? "-"}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{u.fullName}</TableCell>
                        <TableCell>{u.roles.join(", ")}</TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? "success" : "warning"}>
                            {u.isActive ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.username ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void resetPassword(u.username as string)}
                            >
                              Reset Password
                            </Button>
                          ) : (
                            <span className="text-xs text-neutral-500">tanpa username</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataView>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="audit" activeValue={tab}>
        <ChangeLogTable />
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
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2">
              <span className="font-medium text-neutral-700">
                Status backup belum dikonfigurasi
              </span>
              <Badge variant="warning">Perlu konfigurasi</Badge>
            </div>
            <p className="text-sm text-neutral-600">
              Fitur backup database belum terpasang pada instalasi ini. Konfigurasikan backup
              otomatis (mis. pg_dump terjadwal) sebelum mengeksekusi rollover. Setelah backup
              tersedia, status terakhir akan ditampilkan di sini.
            </p>
            <Button variant="outline" disabled>
              <IconDownload className="h-4 w-4" /> Unduh Status Backup (belum tersedia)
            </Button>
          </CardContent>
        </Card>
      </TabPanel>
    </div>
  );
}
