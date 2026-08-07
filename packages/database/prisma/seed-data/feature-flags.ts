/**
 * Daftar awal feature flags — prd04 §5.N (keputusan owner-v4.1, disederhanakan v4.2).
 * Aturan default: WAJIB MVP/SANGAT DIREKOMENDASIKAN = ON; GELOMBANG 2/3 = OFF;
 * DITUNDA = OFF + locked. LMS_BASE system (tidak bisa dimatikan).
 */

import type { Prisma } from "@prisma/client";

export interface FeatureFlagSeed {
  key: string;
  kategori: string;
  deskripsi: string;
  default_enabled: boolean;
  locked: boolean;
  is_system: boolean;
  config_schema?: Prisma.InputJsonValue;
}

export const FEATURE_FLAGS: FeatureFlagSeed[] = [
  // LMS (inti)
  {
    key: "LMS_BASE",
    kategori: "LMS",
    deskripsi: "Fitur LMS inti (kelas, materi, tugas, penilaian)",
    default_enabled: true,
    locked: false,
    is_system: true
  },
  {
    key: "LMS_MATERIAL",
    kategori: "LMS",
    deskripsi: "Materi pembelajaran",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_ASSIGNMENT",
    kategori: "LMS",
    deskripsi: "Tugas & submission",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_QUIZ",
    kategori: "LMS",
    deskripsi: "Kuis harian",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_BANK_SOAL",
    kategori: "LMS",
    deskripsi: "Bank soal",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_EXAM",
    kategori: "LMS",
    deskripsi: "Ujian online",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_EXAM_TOKEN",
    kategori: "LMS",
    deskripsi: "Token sesi ujian",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_EXAM_RANDOMIZE",
    kategori: "LMS",
    deskripsi: "Randomisasi soal & opsi per siswa",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_ABSENSI_MANUAL",
    kategori: "LMS",
    deskripsi: "Absensi manual v1",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_ABSENSI_QR",
    kategori: "LMS",
    deskripsi: "Absensi QR",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_ABSENSI_GEOFENCE",
    kategori: "LMS",
    deskripsi: "Geofencing absensi",
    default_enabled: false,
    locked: false,
    is_system: false,
    config_schema: { radius_meters: 150, enabled_by_school: false }
  },
  {
    key: "LMS_ERAPOR",
    kategori: "LMS",
    deskripsi: "e-Rapor dua-track",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_KALENDER",
    kategori: "LMS",
    deskripsi: "Kalender akademik",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "LMS_LIVE_CLASS",
    kategori: "LMS",
    deskripsi: "Live class (DITUNDA — WebRTC self-hosted bila dibangun)",
    default_enabled: false,
    locked: true,
    is_system: false
  },
  // Akademik
  {
    key: "ACADEMIC_SCHEDULE",
    kategori: "AKADEMIK",
    deskripsi: "Jadwal pelajaran",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "KURIKULUM_MERDEKA",
    kategori: "AKADEMIK",
    deskripsi: "Kurikulum Merdeka",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "P5",
    kategori: "AKADEMIK",
    deskripsi: "Projek Penguatan Profil Pelajar Pancasila",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "ASESMEN_DIAGNOSTIK",
    kategori: "AKADEMIK",
    deskripsi: "Asesmen diagnostik",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  // Kesiswaan
  {
    key: "BK",
    kategori: "KESISWAAN",
    deskripsi: "Bimbingan konseling",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "TATA_TERTIB",
    kategori: "KESISWAAN",
    deskripsi: "Tata tertib & poin pelanggaran",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "EKSKUL",
    kategori: "KESISWAAN",
    deskripsi: "Ekstrakurikuler",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "OSIS",
    kategori: "KESISWAAN",
    deskripsi: "OSIS",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  // Kepegawaian & payroll
  {
    key: "STAFF_ABSENSI",
    kategori: "KEPEGAWAIAN",
    deskripsi: "Absensi staf",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "PAYROLL",
    kategori: "PAYROLL",
    deskripsi: "Penggajian",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  // Keuangan
  {
    key: "FINANCE_INVOICE",
    kategori: "KEUANGAN",
    deskripsi: "Tagihan (SPP dll.)",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "FINANCE_PAYMENT",
    kategori: "KEUANGAN",
    deskripsi: "Pembayaran",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "FINANCE_CICILAN",
    kategori: "KEUANGAN",
    deskripsi: "Cicilan",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "FINANCE_DENDA",
    kategori: "KEUANGAN",
    deskripsi: "Denda keterlambatan",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "FINANCE_REFUND",
    kategori: "KEUANGAN",
    deskripsi: "Refund",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "FINANCE_REKONSILIASI",
    kategori: "KEUANGAN",
    deskripsi: "Rekonsiliasi pembayaran",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "FINANCE_GATEWAY",
    kategori: "KEUANGAN",
    deskripsi: "Payment gateway (opsional; manual-first)",
    default_enabled: false,
    locked: false,
    is_system: false,
    config_schema: { provider: "none" }
  },
  // Aset
  {
    key: "ASSET_INVENTARIS",
    kategori: "ASET",
    deskripsi: "Inventaris aset",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "ASSET_DEPRESIASI",
    kategori: "ASET",
    deskripsi: "Depresiasi aset",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "ASSET_BOOKING",
    kategori: "ASET",
    deskripsi: "Booking aset",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "ASSET_MAINTENANCE",
    kategori: "ASET",
    deskripsi: "Maintenance aset",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "ASSET_AUDIT",
    kategori: "ASET",
    deskripsi: "Audit aset",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  // Sarpras & perpustakaan
  {
    key: "LIBRARY",
    kategori: "SARPRAS",
    deskripsi: "Perpustakaan",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  // PPDB
  {
    key: "PPDB",
    kategori: "PPDB",
    deskripsi: "PPDB online",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  // Komunikasi
  {
    key: "ANNOUNCEMENT",
    kategori: "KOMUNIKASI",
    deskripsi: "Pengumuman",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "SURAT",
    kategori: "KOMUNIKASI",
    deskripsi: "Surat resmi",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "PARENT_PORTAL",
    kategori: "KOMUNIKASI",
    deskripsi: "Portal wali murid (read-only)",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  // Platform
  {
    key: "NOTIFICATION",
    kategori: "PLATFORM",
    deskripsi: "Pusat notifikasi & Socket.IO",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "DATA_SAVER",
    kategori: "PLATFORM",
    deskripsi: "Mode hemat data (kompresi server-side)",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "OFFLINE_PWA",
    kategori: "PLATFORM",
    deskripsi: "PWA penuh / offline-first (DITUNDA)",
    default_enabled: false,
    locked: true,
    is_system: false
  },
  {
    key: "SUPERVISOR_CONSOLE",
    kategori: "PLATFORM",
    deskripsi: "Konsol supervisi flag MVP",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  {
    key: "ACADEMIC_ROLLOVER",
    kategori: "PLATFORM",
    deskripsi: "Rollover tahun ajaran",
    default_enabled: true,
    locked: false,
    is_system: false
  },
  // Alumni & SMK
  {
    key: "ALUMNI",
    kategori: "ALUMNI",
    deskripsi: "Modul alumni",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "SMK_PKL",
    kategori: "SMK",
    deskripsi: "PKL/Prakerin",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "SMK_UKK",
    kategori: "SMK",
    deskripsi: "UKK (Uji Kompetensi Keahlian)",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  {
    key: "SMK_DUDI",
    kategori: "SMK",
    deskripsi: "Mitra DUDI",
    default_enabled: false,
    locked: false,
    is_system: false
  },
  // Engagement & analisis (DITUNDA — locked)
  {
    key: "GAMIFIKASI",
    kategori: "ENGAGEMENT",
    deskripsi: "Gamifikasi (DITUNDA)",
    default_enabled: false,
    locked: true,
    is_system: false
  },
  {
    key: "PLAGIARISM_CHECK",
    kategori: "LMS",
    deskripsi: "Cek plagiarisme (DITUNDA)",
    default_enabled: false,
    locked: true,
    is_system: false
  },
  {
    key: "LEARNING_ANALYTICS",
    kategori: "ANALISIS",
    deskripsi: "Learning analytics (DITUNDA)",
    default_enabled: false,
    locked: true,
    is_system: false
  }
];
