import type { Role } from "@opensis/types";
import { DEMO_MODE } from "@/lib/api-client";

/**
 * Feature flags (prd04 §5.N). Default mengikuti keputusan produk.
 * SUPERADMIN membaca dari API GET /app/feature-flags; role lain memakai
 * default lokal (backend hanya mengekspos ke SA — lihat ISSUES).
 * Saat DEMO_MODE, toggle disimpan di localStorage agar konsol flag bisa dipreview.
 */

export interface FeatureFlag {
  key: string;
  category: string;
  description: string;
  defaultEnabled: boolean;
  locked: boolean;
  isSystem: boolean;
  enabled: boolean;
}

export const FEATURE_FLAG_DEFAULTS: FeatureFlag[] = [
  {
    key: "LMS_BASE",
    category: "LMS",
    description: "Fondasi LMS (kelas, materi, tugas, nilai)",
    defaultEnabled: true,
    locked: true,
    isSystem: true,
    enabled: true
  },
  {
    key: "LMS_MATERIAL",
    category: "LMS",
    description: "Materi pembelajaran",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_ASSIGNMENT",
    category: "LMS",
    description: "Tugas & submission",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_QUIZ",
    category: "LMS",
    description: "Kuis harian",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_BANK_SOAL",
    category: "LMS",
    description: "Bank soal guru",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_EXAM",
    category: "LMS",
    description: "Ujian online (token, timer, autosave)",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_EXAM_TOKEN",
    category: "LMS",
    description: "Token sesi ujian",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_EXAM_RANDOMIZE",
    category: "LMS",
    description: "Acak urutan soal",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_ABSENSI_MANUAL",
    category: "LMS",
    description: "Absensi manual",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_ABSENSI_QR",
    category: "LMS",
    description: "Absensi QR",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_ABSENSI_GEOFENCE",
    category: "LMS",
    description: "Absensi geofencing (radius)",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "LMS_ERAPOR",
    category: "LMS",
    description: "e-Rapor",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_KALENDER",
    category: "LMS",
    description: "Kalender akademik",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "LMS_LIVE_CLASS",
    category: "LMS",
    description: "Kelas langsung (DITUNDA)",
    defaultEnabled: false,
    locked: true,
    isSystem: false,
    enabled: false
  },
  {
    key: "ACADEMIC_SCHEDULE",
    category: "Akademik",
    description: "Jadwal pelajaran",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "KURIKULUM_MERDEKA",
    category: "Akademik",
    description: "Kurikulum Merdeka",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "P5",
    category: "Akademik",
    description: "Projek P5",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "BK",
    category: "Kesiswaan",
    description: "Bimbingan konseling",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "TATA_TERTIB",
    category: "Kesiswaan",
    description: "Tata tertib & poin pelanggaran",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "EKSKUL",
    category: "Kesiswaan",
    description: "Ekstrakurikuler",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "STAFF_ABSENSI",
    category: "Kepegawaian",
    description: "Absensi staf",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "PAYROLL",
    category: "Payroll",
    description: "Penggajian",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "FINANCE_INVOICE",
    category: "Keuangan",
    description: "Tagihan & invoice",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "FINANCE_PAYMENT",
    category: "Keuangan",
    description: "Pembayaran & verifikasi",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "FINANCE_CICILAN",
    category: "Keuangan",
    description: "Cicilan/parsial",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "FINANCE_DENDA",
    category: "Keuangan",
    description: "Denda keterlambatan",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "FINANCE_REFUND",
    category: "Keuangan",
    description: "Refund",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "FINANCE_REKONSILIASI",
    category: "Keuangan",
    description: "Rekonsiliasi bank",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "FINANCE_GATEWAY",
    category: "Keuangan",
    description: "Payment gateway (opsional)",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "ASSET_INVENTARIS",
    category: "Aset",
    description: "Inventaris aset",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "ASSET_DEPRESIASI",
    category: "Aset",
    description: "Depresiasi aset",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "ASSET_BOOKING",
    category: "Aset",
    description: "Peminjaman aset",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "ASSET_MAINTENANCE",
    category: "Aset",
    description: "Pemeliharaan aset",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "ASSET_AUDIT",
    category: "Aset",
    description: "Audit/opname aset",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "LIBRARY",
    category: "Perpustakaan",
    description: "Perpustakaan",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "PPDB",
    category: "PPDB",
    description: "Penerimaan siswa baru",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "ANNOUNCEMENT",
    category: "Komunikasi",
    description: "Pengumuman",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "SURAT",
    category: "Komunikasi",
    description: "Surat resmi",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "PARENT_PORTAL",
    category: "Komunikasi",
    description: "Portal wali murid",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "NOTIFICATION",
    category: "Platform",
    description: "Pusat notifikasi",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "ALUMNI",
    category: "Alumni",
    description: "Modul alumni",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "SMK_PKL",
    category: "SMK",
    description: "PKL/Prakerin",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "SMK_UKK",
    category: "SMK",
    description: "UKK",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "SMK_DUDI",
    category: "SMK",
    description: "Mitra DUDI",
    defaultEnabled: false,
    locked: false,
    isSystem: false,
    enabled: false
  },
  {
    key: "DATA_SAVER",
    category: "Platform",
    description: "Mode hemat data",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "GAMIFIKASI",
    category: "Engagement",
    description: "Gamifikasi (DITUNDA)",
    defaultEnabled: false,
    locked: true,
    isSystem: false,
    enabled: false
  },
  {
    key: "PLAGIARISM_CHECK",
    category: "LMS",
    description: "Cek plagiarisme (DITUNDA)",
    defaultEnabled: false,
    locked: true,
    isSystem: false,
    enabled: false
  },
  {
    key: "LEARNING_ANALYTICS",
    category: "Analisis",
    description: "Analitik pembelajaran (DITUNDA)",
    defaultEnabled: false,
    locked: true,
    isSystem: false,
    enabled: false
  },
  {
    key: "OFFLINE_PWA",
    category: "Platform",
    description: "PWA offline (DITUNDA)",
    defaultEnabled: false,
    locked: true,
    isSystem: false,
    enabled: false
  },
  {
    key: "SUPERVISOR_CONSOLE",
    category: "Platform",
    description: "Konsol pengawasan (flag MVP)",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  },
  {
    key: "ACADEMIC_ROLLOVER",
    category: "Platform",
    description: "Rollover tahun ajaran",
    defaultEnabled: true,
    locked: false,
    isSystem: false,
    enabled: true
  }
];

export function isFeatureEnabled(flags: FeatureFlag[], key: string): boolean {
  const flag = flags.find((f) => f.key === key);
  if (!flag) return false;
  return flag.enabled;
}

function loadLocalOverrides(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("opensis_demo_flags");
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function applyDefaults(flags: FeatureFlag[]): FeatureFlag[] {
  return FEATURE_FLAG_DEFAULTS.map((def) => {
    const found = flags.find((f) => f.key === def.key);
    return found ?? def;
  });
}

export interface FeatureFlagApiShape {
  key: string;
  category?: string;
  description?: string;
  default_enabled?: boolean;
  locked?: boolean;
  is_system?: boolean;
  enabled?: boolean;
}

export function normalizeFlags(raw: FeatureFlagApiShape[]): FeatureFlag[] {
  return applyDefaults(
    raw.map((f) => ({
      key: f.key,
      category: f.category ?? "Lainnya",
      description: f.description ?? "",
      defaultEnabled: f.default_enabled ?? false,
      locked: f.locked ?? false,
      isSystem: f.is_system ?? false,
      enabled: f.enabled ?? f.default_enabled ?? false
    }))
  );
}

/** Hanya untuk client — dibaca oleh hook useFeatureFlags. */
export function readFeatureFlagsForDemo(): FeatureFlag[] {
  const overrides = loadLocalOverrides();
  return FEATURE_FLAG_DEFAULTS.map((f) =>
    f.key in overrides ? { ...f, enabled: overrides[f.key] ?? f.enabled } : f
  );
}

export function writeFeatureFlagForDemo(key: string, enabled: boolean): void {
  const overrides = loadLocalOverrides();
  overrides[key] = enabled;
  try {
    localStorage.setItem("opensis_demo_flags", JSON.stringify(overrides));
  } catch {
    // storage penuh / private mode — abaikan
  }
}

export function roleCanAccessFlagConsole(role: Role | undefined): boolean {
  return role === "SUPERADMIN";
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}
