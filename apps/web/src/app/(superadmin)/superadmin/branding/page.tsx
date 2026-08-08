"use client";

import { useEffect, useRef, useState, type JSX } from "react";

import {
  errorMessage,
  fetchAppSettingsClient,
  fetchBrandingClient,
  updateAppFontSettings,
  updateBranding,
  uploadBrandingAsset,
  type AppSettingsView,
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
  Select,
  toast,
  IconUpload,
  IconCheck
} from "@opensis/ui";
import { DEFAULT_APP_NAME } from "@/lib/constants";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SCALE,
  FONT_FAMILIES,
  FONT_SCALES,
  FONT_SCALE_ORDER,
  isFontFamily,
  isFontScale,
  type FontFamily,
  type FontScale
} from "@/lib/font";

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

export default function SuperadminBrandingPage(): JSX.Element {
  const { status, data, error, refetch } = useApi<BrandingView>(
    (signal) => fetchBrandingClient(signal),
    []
  );
  const branding = data ?? DEFAULT_BRANDING;

  const [appName, setAppName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primary, setPrimary] = useState("#2563eb");
  const [secondary, setSecondary] = useState("#1d4ed8");
  const [accent, setAccent] = useState("#0ea5e9");
  const [radius, setRadius] = useState(8);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);

  // Tipografi global (SchoolProfile.settings.font).
  const { data: settingsData } = useApi<AppSettingsView>(
    (signal) => fetchAppSettingsClient(signal),
    []
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>(DEFAULT_FONT_FAMILY);
  const [baseFontScale, setBaseFontScale] = useState<FontScale>(DEFAULT_FONT_SCALE);
  const [fontSaving, setFontSaving] = useState(false);

  // Sinkronkan form saat data branding pertama kali dimuat.
  const synced = useRef(false);
  useEffect(() => {
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

  // Sinkronkan form tipografi saat settings dimuat.
  const fontSynced = useRef(false);
  useEffect(() => {
    if (!fontSynced.current && settingsData?.settings?.font) {
      const font = settingsData.settings.font;
      if (isFontFamily(font.font_family)) setFontFamily(font.font_family);
      if (isFontScale(font.base_font_scale)) setBaseFontScale(font.base_font_scale);
      fontSynced.current = true;
    }
  }, [settingsData]);

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

  const saveFont = async (): Promise<void> => {
    setFontSaving(true);
    try {
      await updateAppFontSettings({
        font_family: fontFamily,
        base_font_scale: baseFontScale
      });
      toast({ variant: "success", title: "Tipografi disimpan" });
      fontSynced.current = false;
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan tipografi",
        description: errorMessage(err)
      });
    } finally {
      setFontSaving(false);
    }
  };

  const colorInput = (
    key: "primary" | "secondary" | "accent",
    label: string,
    value: string,
    onChange: (v: string) => void
  ): JSX.Element => (
    <div className="flex items-center gap-3">
      <input
        type="color"
        aria-label={`Warna ${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-14 cursor-pointer rounded-md border border-input bg-card"
      />
      <Label className="w-28 text-sm text-foreground">{label}</Label>
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
        <h1 className="text-2xl font-bold text-foreground">Branding Aplikasi</h1>
        <p className="text-sm text-muted-foreground">
          Identitas visual aplikasi — diterapkan via CSS variable <code>--brand-*</code> dan
          Socket.IO <code>branding:changed</code>.
        </p>
      </div>

      {status === "error" ? (
        <Card>
          <CardContent className="p-4 text-sm text-danger-700">
            Tidak dapat memuat branding dari API ({errorMessage(error)}). Periksa koneksi backend.
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

        <Card>
          <CardHeader>
            <CardTitle>Tipografi</CardTitle>
            <CardDescription>
              Font global & ukuran dasar teks — menjadi default untuk semua user yang belum memilih
              sendiri.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="font-family">Font keluarga</Label>
              <Select
                id="font-family"
                aria-label="Font keluarga"
                value={fontFamily}
                options={FONT_FAMILIES.map((f) => ({ value: f.value, label: f.label }))}
                onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Font dimuat otomatis dari Google Fonts (400–800).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="font-scale">Ukuran dasar teks</Label>
              <Select
                id="font-scale"
                aria-label="Ukuran dasar teks"
                value={baseFontScale}
                options={FONT_SCALE_ORDER.map((s) => ({ value: s, label: FONT_SCALES[s].label }))}
                onChange={(e) => setBaseFontScale(e.target.value as FontScale)}
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void saveFont()}
              disabled={fontSaving || status === "loading"}
            >
              <IconCheck className="h-4 w-4" /> {fontSaving ? "Menyimpan..." : "Simpan Tipografi"}
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
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
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
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      {currentUrl ? (
        <img
          src={currentUrl}
          alt={`${label} saat ini`}
          className="h-12 w-12 rounded-md border border-border bg-card object-contain"
        />
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-input text-xs text-muted-foreground">
          -
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{currentUrl ?? "Belum ada"}</p>
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
