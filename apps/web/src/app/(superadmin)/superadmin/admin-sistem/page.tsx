"use client";

import { useState, type JSX } from "react";

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
  Select,
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
} from "@opensis/ui";

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

// Definisi kolom tabel — header dirender lewat KOLOM.map() agar konsisten.
const FLAG_KOLOM: { key: string; label: string }[] = [
  { key: "key", label: "Key" },
  { key: "kategori", label: "Kategori" },
  { key: "status", label: "Status" },
  { key: "aksi", label: "Aksi" }
];

const USER_KOLOM: { key: string; label: string }[] = [
  { key: "username", label: "Username" },
  { key: "nama", label: "Nama" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "aksi", label: "Aksi" }
];

export default function SuperadminAdminSistemPage(): JSX.Element {
  const { flags, setFlag, refresh } = useFeatureFlags(true);
  const [tab, setTab] = useState("flags");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

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

  const resetPassword = async (user: AdminUser): Promise<void> => {
    if (DEMO_MODE) {
      toast({
        variant: "success",
        title: `Password sementara dibuat untuk ${(user.fullName || user.username) ?? ""} (demo)`
      });
      return;
    }
    try {
      // ResetPasswordDto: userId wajib; newPassword opsional (di-generate server).
      await api.post("/auth/reset-password", { userId: user.id });
      toast({ variant: "success", title: "Password sementara dikirim" });
    } catch {
      toast({ variant: "error", title: "Gagal reset password" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin Sistem</h1>

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
              <Select
                aria-label="Filter kategori"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={categories.map((c) => ({
                  value: c,
                  label: c === "all" ? "Semua Kategori" : c
                }))}
                className="w-48"
              />
              <Input
                aria-label="Cari flag"
                placeholder="Cari flag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {FLAG_KOLOM.map((k) => (
                    <TableHead key={k.key}>{k.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.key}>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{f.key}</code>
                      {f.locked ? (
                        <Badge variant="neutral" className="ml-2">
                          <IconLock className="h-3 w-3" /> locked
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{f.category}</TableCell>
                    <TableCell>
                      <Badge variant={f.enabled ? "success" : "neutral"}>
                        {f.enabled ? "ON" : "OFF"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {f.locked || f.isSystem ? (
                        <span className="text-xs text-muted-foreground">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                      {USER_KOLOM.map((k) => (
                        <TableHead key={k.key}>{k.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(users.data?.items ?? []).map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
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
                              onClick={() => void resetPassword(u)}
                            >
                              Reset Password
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">tanpa username</span>
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
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2">
              <span className="font-medium text-foreground">Status backup belum dikonfigurasi</span>
              <Badge variant="warning">Perlu konfigurasi</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
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
