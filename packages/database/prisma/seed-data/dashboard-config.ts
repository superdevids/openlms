/**
 * Default kartu dashboard per role (R-05/R-10).
 * Di-seed ke RoleDashboardConfig; SUPERADMIN dapat mengubah via
 * PUT /admin/dashboard-config/:role (dashboard:write:school).
 * Ikon memakai katalog components/dashboard (web): book, clipboard, quiz,
 * exam, chart, qr, calendar, file, bank, grade, settings, database, wallet,
 * academic, briefcase, rocket, refresh, user.
 */

import type { Role } from "@opensis/types";

export interface DashboardCardSeed {
  featureKey: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  sectionOrder: number;
  requiredPermission?: string;
}

export const DASHBOARD_CARDS_BY_ROLE: Record<Role, DashboardCardSeed[]> = {
  SISWA: [
    {
      featureKey: "kelas",
      label: "Kelas Saya",
      description: "Materi, tugas, dan rekap kelas",
      icon: "book",
      href: "/siswa/kelas",
      sectionOrder: 10
    },
    {
      featureKey: "tugas",
      label: "Tugas",
      description: "Tugas tenggat terdekat",
      icon: "clipboard",
      href: "/siswa/tugas",
      sectionOrder: 20,
      requiredPermission: "assignment:read:class"
    },
    {
      featureKey: "kuis",
      label: "Kuis",
      description: "Kuis harian yang terbuka",
      icon: "quiz",
      href: "/siswa/kuis",
      sectionOrder: 30,
      requiredPermission: "quiz:attempt:self"
    },
    {
      featureKey: "ujian",
      label: "Ujian",
      description: "Jadwal & sesi ujian",
      icon: "exam",
      href: "/siswa/ujian",
      sectionOrder: 40,
      requiredPermission: "exam:attempt:self"
    },
    {
      featureKey: "nilai",
      label: "Nilai",
      description: "Rapor & rekap nilai",
      icon: "chart",
      href: "/siswa/nilai",
      sectionOrder: 50,
      requiredPermission: "report:read:self"
    },
    {
      featureKey: "absensi",
      label: "Absensi",
      description: "Riwayat kehadiran",
      icon: "qr",
      href: "/siswa/absensi",
      sectionOrder: 60,
      requiredPermission: "attendance:rekap:self"
    },
    {
      featureKey: "kalender",
      label: "Kalender",
      description: "Jadwal pelajaran & acara",
      icon: "calendar",
      href: "/siswa/kalender",
      sectionOrder: 70,
      requiredPermission: "schedule:read:school"
    }
  ],
  GURU: [
    {
      featureKey: "kelas",
      label: "Kelas Saya",
      description: "Kelas yang Anda ampu",
      icon: "book",
      href: "/guru/kelas",
      sectionOrder: 10
    },
    {
      featureKey: "tugas",
      label: "Tugas",
      description: "Buat & kelola tugas",
      icon: "clipboard",
      href: "/guru/tugas",
      sectionOrder: 20,
      requiredPermission: "assignment:read:class"
    },
    {
      featureKey: "materi",
      label: "Materi",
      description: "Upload & publish materi",
      icon: "file",
      href: "/guru/materi",
      sectionOrder: 30,
      requiredPermission: "material:read:class"
    },
    {
      featureKey: "bank-soal",
      label: "Bank Soal",
      description: "Pertanyaan kuis & ujian",
      icon: "bank",
      href: "/guru/bank-soal",
      sectionOrder: 40,
      requiredPermission: "question:read:class"
    },
    {
      featureKey: "penilaian",
      label: "Penilaian",
      description: "Antrean submission dinilai",
      icon: "grade",
      href: "/guru/penilaian",
      sectionOrder: 50,
      requiredPermission: "submission:read:class"
    },
    {
      featureKey: "absensi",
      label: "Absensi QR",
      description: "Sesi absensi QR/geofencing",
      icon: "qr",
      href: "/guru/absensi",
      sectionOrder: 60,
      requiredPermission: "attendance:record:class"
    },
    {
      featureKey: "ujian",
      label: "Ujian",
      description: "Jadwal & sesi ujian",
      icon: "exam",
      href: "/guru/ujian",
      sectionOrder: 70,
      requiredPermission: "exam:read:school"
    }
  ],
  BK: [
    {
      featureKey: "kelas",
      label: "Data Siswa",
      description: "Siswa binaan & kedisiplinan",
      icon: "book",
      href: "/admin/kepsek",
      sectionOrder: 10
    },
    {
      featureKey: "penilaian",
      label: "Catatan BK",
      description: "Catatan konseling & kedisiplinan",
      icon: "grade",
      href: "/admin/kepsek",
      sectionOrder: 20,
      requiredPermission: "counseling:read:class"
    },
    {
      featureKey: "absensi",
      label: "Rekap Kehadiran",
      description: "Kehadiran lintas kelas",
      icon: "qr",
      href: "/admin/kepsek",
      sectionOrder: 30,
      requiredPermission: "attendance:rekap:school"
    }
  ],
  OPERATOR: [
    {
      featureKey: "data-induk",
      label: "Data Induk & PPDB",
      description: "Siswa/guru, impor, undangan, verifikasi PPDB",
      icon: "database",
      href: "/admin/operator",
      sectionOrder: 10,
      requiredPermission: "user:read:school"
    },
    {
      featureKey: "landing",
      label: "Landing Page",
      description: "Konten website sekolah",
      icon: "settings",
      href: "/superadmin/landing",
      sectionOrder: 20,
      requiredPermission: "landing:write:school"
    },
    {
      featureKey: "keuangan",
      label: "Keuangan",
      description: "Tagihan & pembayaran",
      icon: "wallet",
      href: "/admin/keuangan",
      sectionOrder: 30,
      requiredPermission: "invoice:read:school"
    },
    {
      featureKey: "wakepsek",
      label: "Akademik & Kedisiplinan",
      description: "Rekap nilai, ujian, kedisiplinan",
      icon: "academic",
      href: "/admin/wakepsek",
      sectionOrder: 40
    },
    {
      featureKey: "kepsek",
      label: "Dashboard Eksekutif",
      description: "KPI, tren kehadiran, payroll",
      icon: "briefcase",
      href: "/admin/kepsek",
      sectionOrder: 50
    }
  ],
  KEUANGAN: [
    {
      featureKey: "keuangan",
      label: "Keuangan",
      description: "Tagihan, pembayaran, verifikasi",
      icon: "wallet",
      href: "/admin/keuangan",
      sectionOrder: 10,
      requiredPermission: "invoice:read:school"
    },
    {
      featureKey: "data-induk",
      label: "Data Siswa",
      description: "Data induk & kelas",
      icon: "database",
      href: "/admin/operator",
      sectionOrder: 20,
      requiredPermission: "class:read:school"
    },
    {
      featureKey: "kepsek",
      label: "Dashboard Eksekutif",
      description: "Rekap keuangan & payroll",
      icon: "briefcase",
      href: "/admin/kepsek",
      sectionOrder: 30
    }
  ],
  WAKEPSEK: [
    {
      featureKey: "wakepsek",
      label: "Akademik & Kedisiplinan",
      description: "Rekap nilai, ujian, kedisiplinan",
      icon: "academic",
      href: "/admin/wakepsek",
      sectionOrder: 10
    },
    {
      featureKey: "data-induk",
      label: "Data Induk",
      description: "Siswa/guru & kelas",
      icon: "database",
      href: "/admin/operator",
      sectionOrder: 20,
      requiredPermission: "user:read:school"
    },
    {
      featureKey: "keuangan",
      label: "Keuangan",
      description: "Ringkasan tagihan",
      icon: "wallet",
      href: "/admin/keuangan",
      sectionOrder: 30,
      requiredPermission: "invoice:read:school"
    },
    {
      featureKey: "kepsek",
      label: "Dashboard Eksekutif",
      description: "KPI & tren sekolah",
      icon: "briefcase",
      href: "/admin/kepsek",
      sectionOrder: 40
    }
  ],
  KAPRODI: [
    {
      featureKey: "wakepsek",
      label: "Akademik Program",
      description: "Kurikulum, jadwal & rekap program keahlian",
      icon: "academic",
      href: "/admin/wakepsek",
      sectionOrder: 10
    },
    {
      featureKey: "kelas",
      label: "Data Siswa",
      description: "Siswa & kelas program keahlian",
      icon: "database",
      href: "/admin/operator",
      sectionOrder: 20,
      requiredPermission: "class:read:school"
    },
    {
      featureKey: "penilaian",
      label: "Rekap Nilai",
      description: "Rapor, kompetensi & UKK",
      icon: "grade",
      href: "/admin/wakepsek",
      sectionOrder: 30,
      requiredPermission: "report:read:class"
    },
    {
      featureKey: "absensi",
      label: "Kehadiran",
      description: "Rekap kehadiran lintas kelas",
      icon: "qr",
      href: "/admin/kepsek",
      sectionOrder: 40,
      requiredPermission: "attendance:rekap:school"
    }
  ],
  KEPSEK: [
    {
      featureKey: "kepsek",
      label: "Dashboard Eksekutif",
      description: "KPI, tren kehadiran, payroll",
      icon: "briefcase",
      href: "/admin/kepsek",
      sectionOrder: 10
    },
    {
      featureKey: "data-induk",
      label: "Data Sekolah",
      description: "Data induk & kelas",
      icon: "database",
      href: "/admin/operator",
      sectionOrder: 20,
      requiredPermission: "user:read:school"
    },
    {
      featureKey: "wakepsek",
      label: "Akademik",
      description: "Rekap nilai & kedisiplinan",
      icon: "academic",
      href: "/admin/wakepsek",
      sectionOrder: 30
    },
    {
      featureKey: "keuangan",
      label: "Keuangan",
      description: "Ringkasan tagihan",
      icon: "wallet",
      href: "/admin/keuangan",
      sectionOrder: 40,
      requiredPermission: "invoice:read:school"
    }
  ],
  AUDITOR: [
    {
      featureKey: "audit",
      label: "Audit Log",
      description: "Log perubahan sistem",
      icon: "file",
      href: "/admin/kepsek/change-logs",
      sectionOrder: 10,
      requiredPermission: "audit:read:school"
    },
    {
      featureKey: "data-induk",
      label: "Data Sekolah",
      description: "Data induk & kepegawaian",
      icon: "database",
      href: "/admin/operator",
      sectionOrder: 20,
      requiredPermission: "user:read:school"
    },
    {
      featureKey: "keuangan",
      label: "Keuangan",
      description: "Tagihan & arus kas",
      icon: "wallet",
      href: "/admin/keuangan",
      sectionOrder: 30,
      requiredPermission: "invoice:read:school"
    },
    {
      featureKey: "kepsek",
      label: "Dashboard Eksekutif",
      description: "KPI & tren sekolah",
      icon: "briefcase",
      href: "/admin/kepsek",
      sectionOrder: 40
    }
  ],
  SUPERADMIN: [
    {
      featureKey: "admin-sistem",
      label: "Admin Sistem",
      description: "Feature flags, user, backup",
      icon: "settings",
      href: "/superadmin/admin-sistem",
      sectionOrder: 10
    },
    {
      featureKey: "branding",
      label: "Branding",
      description: "Identitas visual aplikasi",
      icon: "settings",
      href: "/superadmin/branding",
      sectionOrder: 20
    },
    {
      featureKey: "landing",
      label: "Landing Page",
      description: "Konten website sekolah",
      icon: "settings",
      href: "/superadmin/landing",
      sectionOrder: 30,
      requiredPermission: "landing:write:school"
    },
    {
      featureKey: "rbac",
      label: "RBAC",
      description: "Role & permission",
      icon: "database",
      href: "/superadmin/rbac",
      sectionOrder: 40,
      requiredPermission: "rbac:read:school"
    },
    {
      featureKey: "onboarding",
      label: "Onboarding",
      description: "Wizard setup sekolah",
      icon: "rocket",
      href: "/superadmin/onboarding",
      sectionOrder: 50
    },
    {
      featureKey: "rollover",
      label: "Rollover",
      description: "Rollover tahun ajaran",
      icon: "refresh",
      href: "/superadmin/rollover",
      sectionOrder: 60,
      requiredPermission: "rollover:preview:school"
    },
    {
      featureKey: "maintenance",
      label: "Maintenance",
      description: "Mode maintenance / dev mode",
      icon: "settings",
      href: "/superadmin/maintenance",
      sectionOrder: 70,
      requiredPermission: "system:maintenance:write"
    }
  ],
  WALI_MURID: [
    {
      featureKey: "nilai",
      label: "Nilai Anak",
      description: "Rapor & nilai terbaru",
      icon: "chart",
      href: "/ortu/nilai",
      sectionOrder: 10,
      requiredPermission: "report:read:self"
    },
    {
      featureKey: "absensi",
      label: "Absensi Anak",
      description: "Kehadiran per bulan",
      icon: "calendar",
      href: "/ortu/absensi",
      sectionOrder: 20,
      requiredPermission: "attendance:rekap:self"
    },
    {
      featureKey: "tagihan",
      label: "Tagihan Anak",
      description: "Status tagihan SPP",
      icon: "wallet",
      href: "/ortu/tagihan",
      sectionOrder: 30,
      requiredPermission: "invoice:read:self"
    }
  ],
  CALON_SISWA: [],
  PEMBIMBING_INDUSTRI: [],
  PENGUJI_EKSTERNAL: []
};

/** Role yang di-seed kartunya (dashboard yang sudah ada di web). */
export const DASHBOARD_ROLES_TO_SEED: Role[] = [
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
