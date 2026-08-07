"use client";

import * as React from "react";
import {
  errorMessage,
  fetchBrandingClient,
  updateBranding,
  uploadBrandingAsset,
  type BrandingView
} from "@/lib/api-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  toast,
  IconUpload,
  IconCheck
} from "@openlms/ui";
import { DEFAULT_APP_NAME } from "@/lib/constants";

import { useApi } from "@/lib/use-api";

const DEFAULT_BRANDING: BrandingView = {
  appName: DEFAULT_APP_NAME,
  tagline: "LMS & SIS Sekolah",
  logoUrl: null,
  faviconUrl: null,
  colors: { primary: "#2563eb", secondary: "#1d4ed8", accent: "#0ea5e9" },
  radius: 8,
  configVersion: 1
};

export default function SuperadminBrandingPage(): React.JSX.Element {
  const { status, data, refetch } = useApi<BrandingView>(
    (signal) => fetchBrandingClient(signal),
    []
  );
  const branding = data ?? DEFAULT_BRANDING;

  const [appName, setAppName] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [primary, setPrimary] = React.useState("#2563eb");
  const [secondary, setSecondary] = React.useState("#1d4ed8");
  const [accent, setAccent] = React.useState("#0ea5e9");
  const [radius, setRadius] = React.useState(8);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState<"logo" | "favicon" | null>(null);

  // Sinkronkan form saat data branding pertama kali dimuat.
  const synced = React.useRef(false);
  React.useEffect(() => {
    if (!synced.current && data) {
      setAppName(data.appName ?? "");
      setTagline(data.tagline ?? "");
      setPrimary(data.colors?.primary ?? "#2563eb");
      setSecondary(data.colors?.secondary ?? "#1d4ed8");
      setAccent(data.colors?.accent ?? "#0ea5e9");
      setRadius(data.radius ?? 8);
      synced.current = true;
    }
  }, [data]);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await updateBranding({
        appName: appName.trim(),
        tagline: tagline.trim(),
        primaryColor: primary,
        secondaryColor: secondary,
        accentColor: accent,
        radius
      });
      toast({ variant: "success", title: "Branding disimpan" });
      synced.current = false;
      refetch();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan branding",
        description: errorMessage(err)
      });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (field: "logo" | "favicon", file: File | undefined): Promise<void> => {
    if (!file) return;
    setUploading(field);
    try {
      await uploadBrandingAsset(field, file);
      toast({ variant: "success", title: `${field === "logo" ? "Logo" : "Favicon"} diperbarui` });
      synced.current = false;
      refetch();
    } catch (err) {
      toast({
        variant: "error",
        title: `Gagal upload ${field}`,
        description: errorMessage(err)
      });
    } finally {
      setUploading(null);
    }
  };

  const colorInput = (
    key: "primary" | "secondary" | "accent",
    label: string,
    value: string,
    onChange: (v: string) => void
  ): React.JSX.Element => (
    <div className="flex items-center gap-3">
      <input
        type="color"
        aria-label={`Warna ${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-14 cursor-pointer rounded-md border border-neutral-300 bg-white"
      />
      <Label className="w-28 text-sm text-neutral-700">{label}</Label>
      <Input
        aria-label={`Nilai hex ${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-40 font-mono text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Branding Aplikasi</h1>
        <p className="text-sm text-neutral-500">
          Identitas visual aplikasi — diterapkan via CSS variable <code>--brand-*</code> dan
          Socket.IO <code>branding:changed</code>.
        </p>
      </div>

      {status === "error" ? (
        <Card>
          <CardContent className="p-4 text-sm text-danger-700">
            Tidak dapat memuat branding dari API ({errorMessage(undefined)}). Periksa koneksi
            backend.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identitas</CardTitle>
            <CardDescription>Nama aplikasi, tagline, dan warna tema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="brand-app-name">Nama aplikasi</Label>
              <Input
                id="brand-app-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder={DEFAULT_APP_NAME}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-tagline">Tagline</Label>
              <Input
                id="brand-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="LMS & SIS Sekolah"
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              {colorInput("primary", "Primer", primary, setPrimary)}
              {colorInput("secondary", "Sekunder", secondary, setSecondary)}
              {colorInput("accent", "Aksen", accent, setAccent)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-radius">Border radius (px)</Label>
              <Input
                id="brand-radius"
                type="number"
                min={0}
                max={32}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <Button onClick={() => void save()} disabled={saving || status === "loading"}>
              <IconCheck className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Branding"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pratinjau</CardTitle>
              <CardDescription>
                CSS variable <code>--brand-*</code> yang akan diterapkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: primary,
                  color: "#ffffff"
                }}
              >
                <p className="text-lg font-bold">{appName || DEFAULT_APP_NAME}</p>
                <p className="text-sm opacity-90">{tagline || "LMS & SIS Sekolah"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded px-3 py-1 text-sm font-medium"
                  style={{ backgroundColor: primary, color: "#fff", borderRadius: radius }}
                >
                  Primer
                </span>
                <span
                  className="rounded px-3 py-1 text-sm font-medium"
                  style={{ backgroundColor: secondary, color: "#fff", borderRadius: radius }}
                >
                  Sekunder
                </span>
                <span
                  className="rounded px-3 py-1 text-sm font-medium"
                  style={{ backgroundColor: accent, color: "#fff", borderRadius: radius }}
                >
                  Aksen
                </span>
              </div>
              <pre className="overflow-x-auto rounded-md bg-neutral-100 p-3 text-xs text-neutral-800">
                {`--brand-primary: ${primary}; --brand-secondary: ${secondary}; --brand-accent: ${accent}; --brand-radius: ${radius}px;`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo & Favicon</CardTitle>
              <CardDescription>
                PNG/JPG/WebP maks 2MB per file (upload /app/branding).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AssetRow
                label="Logo"
                currentUrl={branding.logoUrl}
                busy={uploading === "logo"}
                onPick={(f) => void upload("logo", f)}
              />
              <AssetRow
                label="Favicon"
                currentUrl={branding.faviconUrl}
                busy={uploading === "favicon"}
                onPick={(f) => void upload("favicon", f)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AssetRow({
  label,
  currentUrl,
  busy,
  onPick
}: {
  label: string;
  currentUrl: string | null;
  busy: boolean;
  onPick: (file: File | undefined) => void;
}): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      {currentUrl ? (
        <img
          src={currentUrl}
          alt={`${label} saat ini`}
          className="h-12 w-12 rounded-md border border-neutral-200 bg-white object-contain"
        />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-400">
          -
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="truncate text-xs text-neutral-500">{currentUrl ?? "Belum ada"}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label={`Upload ${label}`}
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        <IconUpload className="h-4 w-4" /> {busy ? "Mengunggah..." : "Upload"}
      </Button>
    </div>
  );
}
