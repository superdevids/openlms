/**
 * Dashboard per role (R-05/R-10) — satu sumber kebenaran di sisi web.
 * - Types mengikuti kontrak GET /dashboard/me (API).
 * - DEFAULT_DASHBOARD_CARDS: fallback offline/DEMO_MODE (tidak pernah dipakai
 *   saat API terhubung; API adalah otoritas kartu yang aktif per role).
 * - Ikon memakai katalog components/dashboard (icon name → Icon* di @opensis/ui).
 */
import type { Role } from "@opensis/types";

export interface DashboardCard {
  featureKey: string;
  label: string;
  description: string | null;
  icon: string | null;
  href: string;
  sectionOrder: number;
  isEnabled: boolean;
  requiredPermission: string | null;
}

export type DashboardRoleGroup = "siswa" | "guru" | "admin" | "superadmin" | "ortu";

/** Role aktif per grup dashboard (sama dengan lib/roles.ts ROLES). */
export const DASHBOARD_GROUP_ROLES: Record<DashboardRoleGroup, Role[]> = {
  siswa: ["SISWA"],
  guru: ["GURU", "BK", "KAPRODI"],
  admin: ["OPERATOR", "KEUANGAN", "WAKEPSEK", "KEPSEK", "AUDITOR"],
  superadmin: ["SUPERADMIN"],
  ortu: ["WALI_MURID"]
};

/** Katalog ikon yang dikenal komponen DashboardCards (fallback home). */
export const DASHBOARD_ICONS = [
  "home",
  "book",
  "clipboard",
  "quiz",
  "exam",
  "chart",
  "qr",
  "camera",
  "calendar",
  "bell",
  "clock",
  "settings",
  "database",
  "wallet",
  "academic",
  "briefcase",
  "rocket",
  "refresh",
  "file",
  "bank",
  "grade",
  "plus",
  "search",
  "flag",
  "user",
  "lock",
  "info"
] as const;

export type DashboardIconName = (typeof DASHBOARD_ICONS)[number];

const card = (
  featureKey: string,
  label: string,
  description: string,
  icon: DashboardIconName,
  href: string,
  sectionOrder: number,
  requiredPermission?: string
): DashboardCard => ({
  featureKey,
  label,
  description,
  icon,
  href,
  sectionOrder,
  isEnabled: true,
  requiredPermission: requiredPermission ?? null
});

/** Kartu default per grup — dipakai saat API /dashboard/me belum tersedia. */
export const DEFAULT_DASHBOARD_CARDS: Record<DashboardRoleGroup, DashboardCard[]> = {
  siswa: [
    card("kelas", "Kelas Saya", "Materi, tugas, dan rekap kelas", "book", "/siswa/kelas", 10),
    card(
      "tugas",
      "Tugas",
      "Tugas tenggat terdekat",
      "clipboard",
      "/siswa/tugas",
      20,
      "assignment:read:class"
    ),
    card(
      "kuis",
      "Kuis",
      "Kuis harian yang terbuka",
      "quiz",
      "/siswa/kuis",
      30,
      "quiz:attempt:self"
    ),
    card("ujian", "Ujian", "Jadwal & sesi ujian", "exam", "/siswa/ujian", 40, "exam:attempt:self"),
    card("nilai", "Nilai", "Rapor & rekap nilai", "chart", "/siswa/nilai", 50, "report:read:self"),
    card(
      "absensi",
      "Absensi",
      "Riwayat kehadiran",
      "qr",
      "/siswa/absensi",
      60,
      "attendance:rekap:self"
    ),
    card(
      "kalender",
      "Kalender",
      "Jadwal pelajaran & acara",
      "calendar",
      "/siswa/kalender",
      70,
      "schedule:read:school"
    )
  ],
  guru: [
    card("kelas", "Kelas Saya", "Kelas yang Anda ampu", "book", "/guru/kelas", 10),
    card(
      "tugas",
      "Tugas",
      "Buat & kelola tugas",
      "clipboard",
      "/guru/tugas",
      20,
      "assignment:read:class"
    ),
    card(
      "materi",
      "Materi",
      "Upload & publish materi",
      "file",
      "/guru/materi",
      30,
      "material:read:class"
    ),
    card(
      "bank-soal",
      "Bank Soal",
      "Pertanyaan kuis & ujian",
      "bank",
      "/guru/bank-soal",
      40,
      "question:read:class"
    ),
    card(
      "penilaian",
      "Penilaian",
      "Antrean submission dinilai",
      "grade",
      "/guru/penilaian",
      50,
      "submission:read:class"
    ),
    card(
      "absensi",
      "Absensi QR",
      "Sesi absensi QR/geofencing",
      "qr",
      "/guru/absensi",
      60,
      "attendance:record:class"
    ),
    card("ujian", "Ujian", "Jadwal & sesi ujian", "exam", "/guru/ujian", 70, "exam:read:school")
  ],
  admin: [
    card(
      "data-induk",
      "Data Induk & PPDB",
      "Siswa/guru, impor, undangan",
      "database",
      "/admin/operator",
      10,
      "user:read:school"
    ),
    card(
      "landing",
      "Landing Page",
      "Konten website sekolah",
      "settings",
      "/superadmin/landing",
      20,
      "landing:write:school"
    ),
    card(
      "keuangan",
      "Keuangan",
      "Tagihan & pembayaran",
      "wallet",
      "/admin/keuangan",
      30,
      "invoice:read:school"
    ),
    card(
      "wakepsek",
      "Akademik & Kedisiplinan",
      "Rekap nilai, ujian, kedisiplinan",
      "academic",
      "/admin/wakepsek",
      40
    ),
    card(
      "kepsek",
      "Dashboard Eksekutif",
      "KPI, tren kehadiran, payroll",
      "briefcase",
      "/admin/kepsek",
      50
    )
  ],
  superadmin: [
    card(
      "admin-sistem",
      "Admin Sistem",
      "Feature flags, user, backup",
      "settings",
      "/superadmin/admin-sistem",
      10
    ),
    card(
      "branding",
      "Branding",
      "Identitas visual aplikasi",
      "settings",
      "/superadmin/branding",
      20
    ),
    card(
      "landing",
      "Landing Page",
      "Konten website sekolah",
      "settings",
      "/superadmin/landing",
      30,
      "landing:write:school"
    ),
    card(
      "rbac",
      "RBAC",
      "Role & permission",
      "database",
      "/superadmin/rbac",
      40,
      "rbac:read:school"
    ),
    card(
      "onboarding",
      "Onboarding",
      "Wizard setup sekolah",
      "rocket",
      "/superadmin/onboarding",
      50
    ),
    card(
      "rollover",
      "Rollover",
      "Rollover tahun ajaran",
      "refresh",
      "/superadmin/rollover",
      60,
      "rollover:preview:school"
    ),
    card(
      "maintenance",
      "Maintenance",
      "Mode maintenance / dev mode",
      "settings",
      "/superadmin/maintenance",
      70,
      "system:maintenance:write"
    )
  ],
  ortu: [
    card(
      "nilai",
      "Nilai Anak",
      "Rapor & nilai terbaru",
      "chart",
      "/ortu/nilai",
      10,
      "report:read:self"
    ),
    card(
      "absensi",
      "Absensi Anak",
      "Kehadiran per bulan",
      "calendar",
      "/ortu/absensi",
      20,
      "attendance:rekap:self"
    ),
    card(
      "tagihan",
      "Tagihan Anak",
      "Status tagihan SPP",
      "wallet",
      "/ortu/tagihan",
      30,
      "invoice:read:self"
    )
  ]
};

/** Grup dashboard untuk satu role (fallback: null bila tidak punya dashboard). */
export function dashboardGroupForRole(role: Role | undefined): DashboardRoleGroup | null {
  if (!role) return null;
  for (const group of Object.keys(DASHBOARD_GROUP_ROLES) as DashboardRoleGroup[]) {
    if (DASHBOARD_GROUP_ROLES[group].includes(role)) return group;
  }
  return null;
}
