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
  DataView,
  toast,
  IconLock,
  IconDownload
} from "@opensis/ui";

import { PageHeader, DataTable, StatusBadge, type DataTableColumn } from "@/components/ui";

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

interface FlagRow {
  key: string;
  category: string;
  enabled: boolean;
  locked: boolean;
  isSystem: boolean;
}

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
  const filtered: FlagRow[] = flags.filter(
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

  const flagColumns: DataTableColumn<FlagRow>[] = [
    {
      key: "key",
      label: "Key",
      render: (f) => (
        <>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{f.key}</code>
          {f.locked ? (
            <StatusBadge status="locked" label="locked" icon={<IconLock className="h-3 w-3" />} />
          ) : null}
        </>
      )
    },
    { key: "category", label: "Kategori" },
    {
      key: "status",
      label: "Status",
      render: (f) => <StatusBadge status={f.enabled ? "ON" : "OFF"} />
    },
    {
      key: "aksi",
      label: "Aksi",
      render: (f) =>
        f.locked || f.isSystem ? (
          <span className="text-xs text-muted-foreground">Terkunci (system/ditunda)</span>
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
        )
    }
  ];

  const userColumns: DataTableColumn<AdminUser>[] = [
    {
      key: "username",
      label: "Username",
      render: (u) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{u.username ?? "-"}</code>
      )
    },
    {
      key: "fullName",
      label: "Nama",
      render: (u) => <span className="font-medium">{u.fullName}</span>
    },
    { key: "roles", label: "Role", render: (u) => u.roles.join(", ") },
    {
      key: "status",
      label: "Status",
      render: (u) => <StatusBadge status={u.isActive ? "ACTIVE" : "INACTIVE"} />
    },
    {
      key: "aksi",
      label: "Aksi",
      render: (u) =>
        u.username ? (
          <Button size="sm" variant="outline" onClick={() => void resetPassword(u)}>
            Reset Password
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">tanpa username</span>
        )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Sistem"
        description="Feature flags, manajemen user, audit log, dan status backup."
      />

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
        <Card className="overflow-hidden rounded-lg border-border bg-app-surface shadow-app-card">
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
            <DataTable
              columns={flagColumns}
              rows={filtered}
              keyField="key"
              emptyTitle="Tidak ada flag ditemukan"
              emptyDesc="Ubah filter kategori atau kata kunci pencarian."
              maxHeight="none"
            />
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="user" activeValue={tab}>
        <Card className="overflow-hidden rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Manajemen User</CardTitle>
            <CardDescription>
              Daftar user nyata (GET /admin/users). Reset password oleh SUPERADMIN/OPERATOR (in-app,
              tanpa email/SMS).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataView
              status={users.status}
              error={users.error}
              onRetry={users.refetch}
              fallbackLabel="Daftar user"
            >
              <DataTable
                columns={userColumns}
                rows={users.data?.items ?? []}
                keyField="id"
                emptyTitle="Belum ada user"
                emptyDesc="Data user akan tampil di sini."
                maxHeight="none"
              />
            </DataView>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value="audit" activeValue={tab}>
        <ChangeLogTable />
      </TabPanel>

      <TabPanel value="backup" activeValue={tab}>
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardHeader>
            <CardTitle>Status Backup</CardTitle>
            <CardDescription>
              Backup terverifikasi wajib ada sebelum rollover dieksekusi (prd04 §5.R).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2">
              <span className="font-medium text-foreground">Status backup belum dikonfigurasi</span>
              <StatusBadge status="DIPROSES" label="Perlu konfigurasi" />
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
