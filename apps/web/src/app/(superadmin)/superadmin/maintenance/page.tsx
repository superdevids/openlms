"use client";

import { useEffect, useRef, useState, type JSX } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { APP_NAME } from "@/lib/constants";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Input,
  Label,
  Spinner,
  Switch,
  Textarea,
  toast
} from "@opensis/ui";

/**
 * Halaman Maintenance (SUPERADMIN) — /superadmin/maintenance.
 * Mengontrol mode maintenance global (dev mode):
 * - GET /admin/system/maintenance  → status saat ini
 * - PUT /admin/system/maintenance  → toggle + pesan + ETA (AuditLog di backend)
 * Menampilkan pratinjau halaman maintenance yang dilihat pengguna.
 */

interface MaintenanceStatus {
  maintenanceEnabled: boolean;
  message: string | null;
  eta: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const DEFAULT_MESSAGE = "Sistem sedang dalam pemeliharaan. Silakan coba lagi dalam beberapa saat.";

function formatTanggal(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default function SuperadminMaintenancePage(): JSX.Element {
  const statusApi = useApi<MaintenanceStatus>((signal) =>
    api.get<MaintenanceStatus>("/admin/system/maintenance", { signal })
  );

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [eta, setEta] = useState("");
  const [saving, setSaving] = useState(false);
  const synced = useRef(false);

  // Sinkronkan form dari status terbaru (hanya sekali saat data dimuat).
  useEffect(() => {
    if (!synced.current && statusApi.data) {
      setEnabled(statusApi.data.maintenanceEnabled);
      setMessage(statusApi.data.message ?? "");
      setEta(statusApi.data.eta ?? "");
      synced.current = true;
    }
  }, [statusApi.data]);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const updated = await api.put<MaintenanceStatus>("/admin/system/maintenance", {
        maintenanceEnabled: enabled,
        message: message.trim() || undefined,
        eta: eta.trim() || undefined
      });
      setEnabled(updated.maintenanceEnabled);
      setMessage(updated.message ?? "");
      setEta(updated.eta ?? "");
      toast({
        variant: "success",
        title: enabled ? "Mode maintenance AKTIF" : "Mode maintenance NONAKTIF",
        description: "Perubahan langsung diterapkan ke seluruh pengguna."
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan mode maintenance",
        description: errorMessage(err)
      });
    } finally {
      setSaving(false);
    }
  };

  const currentEnabled = statusApi.data?.maintenanceEnabled ?? false;
  const previewMessage = message.trim() || DEFAULT_MESSAGE;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mode Maintenance</h1>
        <p className="text-sm text-muted-foreground">
          Aktifkan mode pemeliharaan global untuk seluruh aplikasi. Endpoint publik terpilih
          (health, status sistem, konten landing) tetap berfungsi. Perubahan tercatat di Audit Log.
        </p>
      </div>

      {statusApi.status === "error" ? (
        <Card>
          <CardContent className="p-4 text-sm text-danger-700">
            Tidak dapat memuat status maintenance. Periksa koneksi backend dan pastikan akun
            memiliki permission <code>system:status:read</code>.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardDescription>Status saat ini</CardDescription>
              <div className="mt-1">
                <Badge variant={currentEnabled ? "warning" : "success"}>
                  {currentEnabled ? "MAINTENANCE AKTIF" : "NORMAL"}
                </Badge>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              label={enabled ? "Mode maintenance ON" : "Mode maintenance OFF"}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="maintenance-message">Pesan yang ditampilkan ke pengguna</Label>
            <Textarea
              id="maintenance-message"
              value={message}
              rows={3}
              maxLength={500}
              placeholder={DEFAULT_MESSAGE}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maintenance-eta">
              ETA (perkiraan selesai) <span className="text-muted-foreground">— opsional</span>
            </Label>
            <Input
              id="maintenance-eta"
              value={eta}
              maxLength={120}
              placeholder='mis. "14:00 WIB" atau "2026-08-07T14:00:00Z"'
              onChange={(e) => setEta(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void save()} disabled={saving || statusApi.status !== "success"}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            {enabled ? (
              <p className="text-sm text-warning-700">
                Peringatan: seluruh pengguna non-allowlist akan melihat halaman pemeliharaan.
              </p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Terakhir diperbarui: {formatTanggal(statusApi.data?.updatedAt ?? null)}
            {statusApi.data?.updatedBy ? ` oleh ${statusApi.data.updatedBy}` : ""}
          </p>
        </CardContent>
      </Card>

      <section aria-labelledby="maintenance-preview-title">
        <h2 id="maintenance-preview-title" className="text-lg font-semibold text-foreground">
          Pratinjau Halaman Maintenance
        </h2>
        <p className="text-sm text-muted-foreground">
          Tampilan yang dilihat pengguna saat mode maintenance aktif.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-neutral-950 p-6 text-white">
          <div className="mx-auto max-w-md text-center">
            <div
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--brand-primary, #2563eb)" }}
              aria-hidden="true"
            >
              <Spinner className="h-5 w-5" />
            </div>
            <p className="mt-4 text-lg font-bold">{APP_NAME}</p>
            <h3 className="mt-3 text-base font-semibold">Sedang Dalam Pemeliharaan</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-200">{previewMessage}</p>
            {eta.trim() ? (
              <p
                className="mt-2 text-sm font-medium"
                style={{ color: "var(--brand-primary, #60a5fa)" }}
              >
                Perkiraan selesai: {eta.trim()}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
