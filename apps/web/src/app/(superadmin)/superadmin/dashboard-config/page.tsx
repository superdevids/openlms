"use client";

import { useMemo, useState, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Input,
  Label,
  Select,
  Badge,
  DataView,
  EmptyState,
  toast,
  IconChevronRight
} from "@opensis/ui";
import type { Role } from "@opensis/types";
import { roleLabel } from "@/lib/roles";
import type { DashboardCard } from "@/lib/dashboard";
import { DEFAULT_DASHBOARD_CARDS, dashboardGroupForRole } from "@/lib/dashboard";

interface DashboardConfigRow extends DashboardCard {
  id: string;
  role: Role;
}

const EDITABLE_ROLES: Role[] = [
  "SISWA",
  "GURU",
  "BK",
  "KAPRODI",
  "AUDITOR",
  "OPERATOR",
  "KEUANGAN",
  "WAKEPSEK",
  "KEPSEK",
  "SUPERADMIN",
  "WALI_MURID"
];

export default function SuperadminDashboardConfigPage(): JSX.Element {
  const list = useApi<DashboardConfigRow[]>(() => api.get("/admin/dashboard-config"), []);
  const [activeRole, setActiveRole] = useState<Role>("SISWA");
  const [draft, setDraft] = useState<Record<Role, DashboardConfigRow[]>>({} as never);
  const [saving, setSaving] = useState(false);
  const [catalogKey, setCatalogKey] = useState("");

  const rows = list.data ?? [];
  const roleRows = (draft[activeRole] ?? rows.filter((r) => r.role === activeRole)).map((r) => ({
    ...r,
    role: activeRole
  }));

  /** Kartu dari katalog DEFAULT_DASHBOARD_CARDS yang belum terpasang di role aktif. */
  const catalog = useMemo(() => {
    const group = dashboardGroupForRole(activeRole);
    if (!group) return [];
    const existing = new Set((draft[activeRole] ?? roleRows).map((r) => r.featureKey));
    return DEFAULT_DASHBOARD_CARDS[group].filter((c) => !existing.has(c.featureKey));
  }, [activeRole, draft, roleRows]);

  const ensureDraft = (role: Role): void => {
    if (draft[role]) return;
    setDraft((prev) => ({
      ...prev,
      [role]: rows.filter((r) => r.role === role)
    }));
  };

  const patchRow = (featureKey: string, patch: Partial<DashboardConfigRow>): void => {
    setDraft((prev) => ({
      ...prev,
      [activeRole]: (prev[activeRole] ?? roleRows).map((r) =>
        r.featureKey === featureKey ? { ...r, ...patch } : r
      )
    }));
  };

  const addRow = (source?: DashboardCard): void => {
    setDraft((prev) => {
      const current = prev[activeRole] ?? roleRows;
      const base = source
        ? {
            id: `new-${Date.now()}`,
            role: activeRole,
            featureKey: source.featureKey,
            label: source.label,
            description: source.description,
            icon: source.icon,
            href: source.href,
            requiredPermission: source.requiredPermission
          }
        : {
            id: `new-${Date.now()}`,
            role: activeRole,
            featureKey: `fitur-${Date.now()}`,
            label: "Fitur baru",
            description: null,
            icon: "home",
            href: "/",
            requiredPermission: null
          };
      return {
        ...prev,
        [activeRole]: [
          ...current,
          { ...base, sectionOrder: (current.length + 1) * 10, isEnabled: true }
        ]
      };
    });
    setCatalogKey("");
  };

  const moveRow = (index: number, dir: -1 | 1): void => {
    setDraft((prev) => {
      const list = [...(prev[activeRole] ?? roleRows)];
      const target = index + dir;
      if (target < 0 || target >= list.length) return prev;
      const tmp = list[index];
      list[index] = list[target] ?? tmp;
      list[target] = tmp;
      // section_order harus di-renumber agar urutan tersimpan di API
      // (API mengurutkan ulang berdasarkan section_order).
      return {
        ...prev,
        [activeRole]: list.map((r, i) => ({ ...r, sectionOrder: (i + 1) * 10 }))
      };
    });
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    // section_order selalu di-renumber dari posisi array agar urutan
    // UI = urutan tersimpan (API sort by section_order).
    const payload = (draft[activeRole] ?? roleRows).map((r, i) => ({
      featureKey: r.featureKey,
      label: r.label,
      description: r.description,
      icon: r.icon,
      href: r.href,
      sectionOrder: (i + 1) * 10,
      isEnabled: r.isEnabled,
      requiredPermission: r.requiredPermission
    }));
    try {
      if (DEMO_MODE) {
        toast({ variant: "success", title: `Kartu ${roleLabel(activeRole)} disimpan (demo)` });
        setDraft((prev) => ({ ...prev, [activeRole]: payload }));
        return;
      }
      const saved = await api.put<DashboardConfigRow[]>(
        `/admin/dashboard-config/${encodeURIComponent(activeRole)}`,
        { cards: payload }
      );
      setDraft((prev) => ({ ...prev, [activeRole]: saved }));
      list.refetch();
      toast({ variant: "success", title: "Konfigurasi dashboard disimpan" });
    } catch {
      toast({ variant: "error", title: "Gagal menyimpan konfigurasi" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Konfigurasi Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Atur kartu menu yang tampil di dashboard tiap peran. Perubahan berlaku untuk semua
          pengguna dengan peran tersebut.
        </p>
      </div>

      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Konfigurasi dashboard"
      >
        <div className="flex flex-wrap gap-2">
          {EDITABLE_ROLES.map((role) => (
            <Button
              key={role}
              size="sm"
              variant={activeRole === role ? "default" : "outline"}
              onClick={() => {
                ensureDraft(role);
                setActiveRole(role);
              }}
            >
              {roleLabel(role)}
            </Button>
          ))}
        </div>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Kartu — {roleLabel(activeRole)}</CardTitle>
                <CardDescription>
                  Aktifkan/nonaktifkan, ubah label, dan atur urutan kartu.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addRow()}>
                  + Kosong
                </Button>
                <Button size="sm" onClick={() => void save()} loading={saving}>
                  Simpan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-background p-3">
              <div className="min-w-0 flex-1">
                <Label htmlFor="catalog-picker">Tambah dari katalog kartu</Label>
                <Select
                  id="catalog-picker"
                  value={catalogKey}
                  onChange={(e) => setCatalogKey(e.target.value)}
                  placeholder="Pilih kartu katalog…"
                  options={catalog.map((c) => ({ value: c.featureKey, label: c.label }))}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!catalogKey}
                onClick={() => {
                  const source = catalog.find((c) => c.featureKey === catalogKey);
                  if (source) addRow(source);
                }}
              >
                + Tambah
              </Button>
            </div>
            {roleRows.length === 0 ? (
              <EmptyState title="Belum ada kartu" description="Tambahkan kartu untuk peran ini." />
            ) : (
              roleRows.map((row, index) => (
                <div
                  key={row.featureKey}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Naikkan urutan"
                      onClick={() => moveRow(index, -1)}
                    >
                      <IconChevronRight className="h-4 w-4 -rotate-90" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Turunkan urutan"
                      onClick={() => moveRow(index, 1)}
                    >
                      <IconChevronRight className="h-4 w-4 rotate-90" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Switch
                        checked={row.isEnabled}
                        onCheckedChange={(v) => patchRow(row.featureKey, { isEnabled: v })}
                        label={row.isEnabled ? "ON" : "OFF"}
                      />
                      <Badge variant={row.isEnabled ? "success" : "neutral"}>
                        {row.isEnabled ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <Input
                      value={row.label}
                      onChange={(e) => patchRow(row.featureKey, { label: e.target.value })}
                      aria-label={`Label kartu ${row.featureKey}`}
                    />
                    <Input
                      value={row.href}
                      onChange={(e) => patchRow(row.featureKey, { href: e.target.value })}
                      aria-label={`Tautan kartu ${row.featureKey}`}
                      placeholder="/rute/menu"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </DataView>
    </div>
  );
}
