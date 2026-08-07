/**
 * Katalog permission RBAC — prd04 §4.2 (13 kategori) + role mapping.
 * ~120 permission; scope default per role (SENDIRI/KELAS/SEKOLAH).
 * Sumber mapping: prd04 §16.1 Lampiran A + 04-api-contract §4 RBAC Matrix.
 */

import type { PermissionScope, Role } from "@openlms/types";

export interface PermissionSeed {
  code: string;
  category: string;
  description: string;
  is_system?: boolean;
}

export interface RolePermissionSeed {
  code: string;
  scope: PermissionScope;
}

/** Kategori (13) — prd04 §4.2 */
export const PERMISSION_CATEGORIES = [
  "IDENTITAS",
  "PENGATURAN",
  "AKADEMIK",
  "LMS",
  "UJIAN",
  "ABSENSI",
  "KESISWAAN",
  "KEUANGAN",
  "ASET",
  "PAYROLL",
  "PPDB",
  "SMK",
  "SISTEM"
] as const;

export const PERMISSIONS: PermissionSeed[] = [
  // 1. Identitas
  {
    code: "auth:login",
    category: "IDENTITAS",
    description: "Login Email/Username + Password",
    is_system: true
  },
  {
    code: "auth:me:self",
    category: "IDENTITAS",
    description: "Lihat profil & sesi sendiri",
    is_system: true
  },
  { code: "auth:logout:self", category: "IDENTITAS", description: "Logout", is_system: true },
  {
    code: "auth:password:change:self",
    category: "IDENTITAS",
    description: "Ganti password sendiri"
  },
  {
    code: "auth:invitation:accept:self",
    category: "IDENTITAS",
    description: "Terima undangan akun",
    is_system: true
  },
  { code: "user:read:self", category: "IDENTITAS", description: "Baca data diri sendiri" },
  { code: "user:write:self", category: "IDENTITAS", description: "Ubah data diri sendiri" },
  {
    code: "user:read:school",
    category: "IDENTITAS",
    description: "Baca data induk user (siswa/guru/staf)"
  },
  { code: "user:write:school", category: "IDENTITAS", description: "Kelola data induk user" },
  { code: "user:list:school", category: "IDENTITAS", description: "Daftar user" },
  {
    code: "user:reset-password:school",
    category: "IDENTITAS",
    description: "Reset password user lain (OPERATOR)"
  },

  // 2. Pengaturan & data induk
  { code: "app:read:school", category: "PENGATURAN", description: "Baca pengaturan aplikasi" },
  { code: "app:write:school", category: "PENGATURAN", description: "Ubah pengaturan aplikasi" },
  {
    code: "landing:write:school",
    category: "PENGATURAN",
    description: "Kelola konten landing page sekolah (hero, tentang, piagam, berita)"
  },
  { code: "import:run:school", category: "PENGATURAN", description: "Jalankan impor data (Excel)" },
  { code: "import:preview:school", category: "PENGATURAN", description: "Preview hasil impor" },
  { code: "invitation:send:school", category: "PENGATURAN", description: "Kirim undangan akun" },
  {
    code: "retention:configure:school",
    category: "PENGATURAN",
    description: "Konfigurasi kebijakan retensi"
  },
  {
    code: "retention:run:school",
    category: "PENGATURAN",
    description: "Jalankan job retensi data"
  },

  // 3. Akademik
  { code: "class:read:class", category: "AKADEMIK", description: "Lihat kelas (scope kelas)" },
  { code: "class:read:school", category: "AKADEMIK", description: "Lihat semua kelas" },
  { code: "class:write:school", category: "AKADEMIK", description: "Buat/ubah kelas" },
  { code: "subject:read:school", category: "AKADEMIK", description: "Lihat mata pelajaran" },
  { code: "subject:write:school", category: "AKADEMIK", description: "Kelola mata pelajaran" },
  {
    code: "classsubject:write:school",
    category: "AKADEMIK",
    description: "Kelola guru pengampu (ClassSubject)"
  },
  { code: "schedule:read:school", category: "AKADEMIK", description: "Lihat jadwal pelajaran" },
  { code: "schedule:write:school", category: "AKADEMIK", description: "Kelola jadwal pelajaran" },
  {
    code: "academic:prodi:write",
    category: "AKADEMIK",
    description: "Kelola jurusan/kompetensi keahlian (Prodi)"
  },
  {
    code: "academic:prodi:read",
    category: "AKADEMIK",
    description: "Lihat jurusan/kompetensi keahlian (Prodi)"
  },
  {
    code: "enrollment:manage:school",
    category: "AKADEMIK",
    description: "Kelola enrollment siswa"
  },
  { code: "report:read:self", category: "AKADEMIK", description: "Lihat rapor sendiri/anak" },
  { code: "report:read:class", category: "AKADEMIK", description: "Lihat rapor per kelas" },
  { code: "report:read:school", category: "AKADEMIK", description: "Lihat rapor seluruh sekolah" },
  { code: "report:export:class", category: "AKADEMIK", description: "Ekspor rapor per kelas" },
  { code: "report:export:school", category: "AKADEMIK", description: "Ekspor rapor sekolah" },

  // 4. LMS
  { code: "material:read:class", category: "LMS", description: "Baca materi kelas" },
  { code: "material:write:class", category: "LMS", description: "Upload/publish materi" },
  { code: "assignment:read:class", category: "LMS", description: "Lihat tugas kelas" },
  { code: "assignment:write:class", category: "LMS", description: "Buat/ubah tugas" },
  { code: "assignment:publish:class", category: "LMS", description: "Publish/tutup tugas" },
  { code: "submission:submit:self", category: "LMS", description: "Submit tugas sendiri" },
  { code: "submission:read:self", category: "LMS", description: "Baca submission sendiri" },
  { code: "submission:read:class", category: "LMS", description: "Lihat submission kelas" },
  { code: "submission:grade:class", category: "LMS", description: "Nilai submission" },

  // 5. Ujian
  { code: "question:read:class", category: "UJIAN", description: "Lihat bank soal" },
  { code: "question:write:class", category: "UJIAN", description: "Kelola bank soal" },
  { code: "quiz:write:class", category: "UJIAN", description: "Kelola kuis" },
  { code: "quiz:attempt:self", category: "UJIAN", description: "Kerjakan kuis" },
  {
    code: "quiz:attempt:school",
    category: "UJIAN",
    description: "Mulai attempt kuis atas nama siswa (staff)"
  },
  { code: "exam:read:school", category: "UJIAN", description: "Lihat ujian" },
  { code: "exam:write:school", category: "UJIAN", description: "Buat/ubah ujian" },
  { code: "exam:session:write:school", category: "UJIAN", description: "Kelola sesi ujian" },
  { code: "exam:token:class", category: "UJIAN", description: "Generate token sesi (per kelas)" },
  { code: "exam:token:school", category: "UJIAN", description: "Generate token sesi (sekolah)" },
  { code: "exam:attempt:self", category: "UJIAN", description: "Kerjakan ujian" },
  {
    code: "exam:attempt:school",
    category: "UJIAN",
    description: "Mulai attempt ujian atas nama siswa (staff)"
  },
  { code: "exam:grade-esai:class", category: "UJIAN", description: "Nilai esai ujian" },
  { code: "exam:log:read:school", category: "UJIAN", description: "Lihat log aktivitas ujian" },
  { code: "exam:analysis:read:school", category: "UJIAN", description: "Analisis butir soal" },

  // 6. Absensi
  { code: "attendance:session:write:class", category: "ABSENSI", description: "Buat sesi absensi" },
  { code: "attendance:scan:self", category: "ABSENSI", description: "Scan/check-in sendiri" },
  { code: "attendance:record:class", category: "ABSENSI", description: "Catat absensi kelas" },
  { code: "attendance:rekap:self", category: "ABSENSI", description: "Rekap absensi sendiri/anak" },
  { code: "attendance:rekap:class", category: "ABSENSI", description: "Rekap absensi kelas" },
  { code: "attendance:rekap:school", category: "ABSENSI", description: "Rekap absensi sekolah" },
  { code: "permit:request:self", category: "ABSENSI", description: "Ajukan izin/sakit" },
  { code: "permit:verify:class", category: "ABSENSI", description: "Verifikasi izin/sakit" },

  // 7. Kesiswaan
  { code: "counseling:read:class", category: "KESISWAAN", description: "Baca catatan BK" },
  { code: "counseling:write:school", category: "KESISWAAN", description: "Tulis catatan BK" },
  { code: "discipline:record:class", category: "KESISWAAN", description: "Catat poin pelanggaran" },
  { code: "discipline:read:school", category: "KESISWAAN", description: "Lihat data kedisiplinan" },
  { code: "extracurricular:read:school", category: "KESISWAAN", description: "Lihat ekskul" },
  { code: "extracurricular:write:school", category: "KESISWAAN", description: "Kelola ekskul" },
  { code: "extracurricular:join:self", category: "KESISWAAN", description: "Daftar ekskul" },
  { code: "achievement:write:school", category: "KESISWAAN", description: "Kelola prestasi" },

  // 8. Keuangan
  { code: "invoice:write:school", category: "KEUANGAN", description: "Kelola tagihan" },
  { code: "invoice:read:school", category: "KEUANGAN", description: "Lihat semua tagihan" },
  { code: "invoice:read:self", category: "KEUANGAN", description: "Lihat tagihan sendiri/anak" },
  { code: "payment:record:school", category: "KEUANGAN", description: "Catat pembayaran" },
  { code: "payment:verify:school", category: "KEUANGAN", description: "Verifikasi pembayaran" },
  { code: "refund:approve:school", category: "KEUANGAN", description: "Approve refund" },
  {
    code: "reconciliation:run:school",
    category: "KEUANGAN",
    description: "Rekonsiliasi pembayaran"
  },
  { code: "cashflow:read:school", category: "KEUANGAN", description: "Lihat arus kas" },

  // 9. Aset
  { code: "asset:read:school", category: "ASET", description: "Lihat inventaris" },
  { code: "asset:write:school", category: "ASET", description: "Kelola inventaris" },
  { code: "asset:book:self", category: "ASET", description: "Booking aset" },
  { code: "asset:maintenance:write:school", category: "ASET", description: "Kelola maintenance" },
  { code: "asset:audit:school", category: "ASET", description: "Audit aset" },

  // 10. Payroll
  { code: "payroll:read:school", category: "PAYROLL", description: "Lihat payroll" },
  { code: "payroll:write:school", category: "PAYROLL", description: "Kelola payroll" },
  { code: "payroll:run:school", category: "PAYROLL", description: "Jalankan payroll" },
  { code: "payroll:approve:school", category: "PAYROLL", description: "Approve payroll" },
  { code: "payslip:read:self", category: "PAYROLL", description: "Lihat slip gaji sendiri" },
  {
    code: "payroll:component:write:school",
    category: "PAYROLL",
    description: "Kelola komponen gaji"
  },

  // 11. PPDB
  {
    code: "ppdb:register:public",
    category: "PPDB",
    description: "Daftar PPDB (public)",
    is_system: true
  },
  { code: "ppdb:read:self", category: "PPDB", description: "Lihat status pendaftaran" },
  { code: "ppdb:verify:school", category: "PPDB", description: "Verifikasi pendaftar" },
  { code: "ppdb:select:school", category: "PPDB", description: "Seleksi pendaftar" },
  { code: "ppdb:enroll:school", category: "PPDB", description: "Enroll pendaftar jadi siswa" },

  // 12. SMK
  { code: "internship:write:school", category: "SMK", description: "Kelola PKL" },
  { code: "internship:journal:self", category: "SMK", description: "Tulis/verifikasi jurnal PKL" },
  { code: "internship:grade:self", category: "SMK", description: "Nilai siswa bimbingan PKL" },
  { code: "competency:grade:school", category: "SMK", description: "Nilai UKK (rubrik)" },
  {
    code: "competency:grade:self",
    category: "SMK",
    description: "Nilai UKK penugasan sendiri (PENGUJI_EKSTERNAL)"
  },
  { code: "partner:write:school", category: "SMK", description: "Kelola mitra DUDI" },

  // 13. Sistem
  { code: "audit:read:school", category: "SISTEM", description: "Baca audit log" },
  { code: "monitor:read:school", category: "SISTEM", description: "Monitoring teknis & statistik" },
  { code: "featureflag:read:school", category: "SISTEM", description: "Lihat feature flags" },
  { code: "featureflag:write:school", category: "SISTEM", description: "Kelola feature flags" },
  {
    code: "rbac:read:school",
    category: "SISTEM",
    description: "Lihat role-permission & override RBAC"
  },
  {
    code: "rbac:write:school",
    category: "SISTEM",
    description: "Kelola role-permission & override RBAC"
  },
  {
    code: "export:run:school",
    category: "SISTEM",
    description: "Jalankan ekspor (Dapodik/ANBK/rapor)"
  },
  { code: "export:read:school", category: "SISTEM", description: "Baca hasil ekspor" },
  {
    code: "rollover:preview:school",
    category: "SISTEM",
    description: "Preview rollover tahun ajaran"
  },
  { code: "rollover:execute:school", category: "SISTEM", description: "Eksekusi rollover" },
  { code: "rollover:rollback:school", category: "SISTEM", description: "Rollback rollover" },
  {
    code: "rollover:history:read:school",
    category: "SISTEM",
    description: "Lihat riwayat rollover"
  },
  {
    code: "system:write:school",
    category: "SISTEM",
    description: "Kelola sistem sekolah",
    is_system: true
  },
  {
    code: "system:status:read",
    category: "SISTEM",
    description: "Baca status sistem global (maintenance/dev mode)",
    is_system: true
  },
  {
    code: "system:maintenance:write",
    category: "SISTEM",
    description: "Kelola mode maintenance / dev mode (SUPERADMIN)",
    is_system: true
  },

  // Kepegawaian & komunikasi (melengkapi matrix 04-api-contract §4)
  { code: "staff:read:self", category: "PENGATURAN", description: "Lihat data staf sendiri" },
  { code: "staff:read:school", category: "PENGATURAN", description: "Lihat data staf" },
  { code: "staff:write:school", category: "PENGATURAN", description: "Kelola data staf" },
  {
    code: "staffattendance:read:self",
    category: "PENGATURAN",
    description: "Lihat absensi staf sendiri"
  },
  {
    code: "staffattendance:record:school",
    category: "PENGATURAN",
    description: "Catat absensi staf"
  },
  {
    code: "notification:read:self",
    category: "SISTEM",
    description: "Baca notifikasi sendiri",
    is_system: true
  },
  {
    code: "notification:mark-read:self",
    category: "SISTEM",
    description: "Tandai notifikasi dibaca",
    is_system: true
  },
  { code: "announcement:read", category: "SISTEM", description: "Baca pengumuman" },
  { code: "announcement:write:school", category: "SISTEM", description: "Kelola pengumuman" },
  { code: "letter:request:self", category: "SISTEM", description: "Ajukan surat resmi" },
  { code: "letter:approve:school", category: "SISTEM", description: "Approve surat resmi" },
  { code: "letter:read:school", category: "SISTEM", description: "Lihat surat resmi" },
  { code: "library:read:school", category: "SISTEM", description: "Lihat katalog perpustakaan" },
  { code: "library:borrow:self", category: "SISTEM", description: "Pinjam buku" }
];

/** Permission yang termasuk "self/basic" — semua role aktif memilikinya. */
const BASIC_SELF: RolePermissionSeed[] = [
  { code: "auth:login", scope: "SENDIRI" },
  { code: "auth:me:self", scope: "SENDIRI" },
  { code: "auth:logout:self", scope: "SENDIRI" },
  { code: "auth:password:change:self", scope: "SENDIRI" },
  { code: "auth:invitation:accept:self", scope: "SENDIRI" },
  { code: "user:read:self", scope: "SENDIRI" },
  { code: "user:write:self", scope: "SENDIRI" },
  { code: "notification:read:self", scope: "SENDIRI" },
  { code: "notification:mark-read:self", scope: "SENDIRI" }
];

const s = (scope: PermissionScope, ...codes: string[]): RolePermissionSeed[] =>
  codes.map((code) => ({ code, scope }));

export const ROLE_PERMISSIONS: Record<Role, RolePermissionSeed[]> = {
  SUPERADMIN: PERMISSIONS.filter((p) => !p.code.endsWith(":self")).map((p) => ({
    code: p.code,
    scope: "SEKOLAH"
  })),

  KEPSEK: [
    ...BASIC_SELF,
    ...s(
      "SEKOLAH",
      "app:read:school",
      "class:read:school",
      "subject:read:school",
      "schedule:read:school",
      "academic:prodi:read"
    ),
    ...s("SEKOLAH", "report:read:school", "report:export:school", "report:export:class"),
    ...s("KELAS", "report:read:class"),
    ...s("KELAS", "material:read:class", "assignment:read:class"),
    ...s(
      "SEKOLAH",
      "exam:read:school",
      "exam:write:school",
      "exam:session:write:school",
      "exam:token:school",
      "exam:attempt:school"
    ),
    ...s("SEKOLAH", "exam:log:read:school", "exam:analysis:read:school"),
    ...s("SEKOLAH", "attendance:rekap:class", "attendance:rekap:school"),
    ...s("KELAS", "permit:verify:class"),
    ...s("SEKOLAH", "counseling:read:class", "counseling:write:school"),
    ...s("SEKOLAH", "discipline:read:school", "discipline:record:class"),
    ...s("SEKOLAH", "invoice:read:school", "cashflow:read:school"),
    ...s("SEKOLAH", "asset:read:school", "asset:audit:school"),
    ...s("SENDIRI", "asset:book:self"),
    ...s("SEKOLAH", "library:read:school"),
    ...s("SENDIRI", "library:borrow:self"),
    ...s("SEKOLAH", "announcement:read", "announcement:write:school"),
    ...s("SEKOLAH", "letter:read:school", "letter:approve:school"),
    ...s("SENDIRI", "letter:request:self"),
    ...s("SEKOLAH", "internship:write:school", "competency:grade:school"),
    ...s("SEKOLAH", "export:run:school", "export:read:school", "audit:read:school"),
    ...s("SEKOLAH", "payroll:read:school", "payroll:approve:school"),
    ...s(
      "SEKOLAH",
      "rollover:preview:school",
      "rollover:execute:school",
      "rollover:rollback:school",
      "rollover:history:read:school"
    ),
    ...s("SEKOLAH", "staff:read:school", "staffattendance:record:school")
  ],

  WAKEPSEK: [
    ...BASIC_SELF,
    ...s("SEKOLAH", "app:read:school", "app:write:school"),
    ...s("SEKOLAH", "import:run:school", "import:preview:school", "invitation:send:school"),
    ...s(
      "SEKOLAH",
      "class:read:school",
      "class:write:school",
      "subject:read:school",
      "subject:write:school"
    ),
    ...s("SEKOLAH", "classsubject:write:school", "schedule:read:school", "schedule:write:school"),
    ...s("SEKOLAH", "academic:prodi:write", "academic:prodi:read"),
    ...s("SEKOLAH", "enrollment:manage:school"),
    ...s("SEKOLAH", "report:read:school", "report:export:school", "report:export:class"),
    ...s("KELAS", "report:read:class"),
    ...s("KELAS", "material:read:class", "material:write:class", "assignment:read:class"),
    ...s(
      "KELAS",
      "assignment:write:class",
      "assignment:publish:class",
      "submission:read:class",
      "submission:grade:class"
    ),
    ...s("KELAS", "question:read:class", "question:write:class", "quiz:write:class"),
    ...s("KELAS", "quiz:attempt:school"),
    ...s(
      "SEKOLAH",
      "exam:read:school",
      "exam:write:school",
      "exam:session:write:school",
      "exam:token:school",
      "exam:attempt:school"
    ),
    ...s("SEKOLAH", "exam:log:read:school", "exam:analysis:read:school", "exam:grade-esai:class"),
    ...s(
      "KELAS",
      "attendance:session:write:class",
      "attendance:record:class",
      "attendance:rekap:class"
    ),
    ...s("SEKOLAH", "attendance:rekap:school"),
    ...s("KELAS", "permit:verify:class"),
    ...s("SEKOLAH", "counseling:read:class", "counseling:write:school"),
    ...s("SEKOLAH", "discipline:read:school", "discipline:record:class"),
    ...s("SEKOLAH", "extracurricular:read:school", "extracurricular:write:school"),
    ...s("SEKOLAH", "invoice:read:school"),
    ...s("SEKOLAH", "asset:read:school", "asset:write:school", "asset:maintenance:write:school"),
    ...s("SENDIRI", "asset:book:self"),
    ...s("SEKOLAH", "library:read:school"),
    ...s("SENDIRI", "library:borrow:self"),
    ...s("SEKOLAH", "announcement:read", "announcement:write:school"),
    ...s("SEKOLAH", "letter:read:school", "letter:approve:school"),
    ...s("SENDIRI", "letter:request:self"),
    ...s("SEKOLAH", "internship:write:school", "competency:grade:school"),
    ...s("SEKOLAH", "export:run:school", "export:read:school", "audit:read:school"),
    ...s("SEKOLAH", "staff:read:school", "staffattendance:record:school"),
    ...s("SEKOLAH", "user:read:school")
  ],

  OPERATOR: [
    ...BASIC_SELF,
    ...s("SEKOLAH", "app:read:school", "app:write:school"),
    ...s("SEKOLAH", "landing:write:school"),
    ...s("SEKOLAH", "import:run:school", "import:preview:school", "invitation:send:school"),
    ...s("SEKOLAH", "retention:configure:school", "retention:run:school"),
    ...s(
      "SEKOLAH",
      "user:read:school",
      "user:write:school",
      "user:list:school",
      "user:reset-password:school"
    ),
    ...s(
      "SEKOLAH",
      "class:read:school",
      "class:write:school",
      "subject:read:school",
      "subject:write:school"
    ),
    ...s("SEKOLAH", "classsubject:write:school", "schedule:read:school", "schedule:write:school"),
    ...s("SEKOLAH", "academic:prodi:write", "academic:prodi:read"),
    ...s("SEKOLAH", "enrollment:manage:school"),
    ...s("SEKOLAH", "report:read:school", "report:export:school", "report:export:class"),
    ...s("KELAS", "material:read:class", "material:write:class", "assignment:read:class"),
    ...s(
      "SEKOLAH",
      "exam:read:school",
      "exam:write:school",
      "exam:session:write:school",
      "exam:token:school",
      "exam:attempt:school"
    ),
    ...s("SEKOLAH", "quiz:attempt:school"),
    ...s("KELAS", "attendance:session:write:class", "attendance:record:class"),
    ...s("SEKOLAH", "attendance:rekap:class", "attendance:rekap:school"),
    ...s("KELAS", "permit:verify:class"),
    ...s("SEKOLAH", "discipline:read:school", "discipline:record:class"),
    ...s(
      "SEKOLAH",
      "extracurricular:read:school",
      "extracurricular:write:school",
      "achievement:write:school"
    ),
    ...s("SEKOLAH", "invoice:read:school", "invoice:write:school"),
    ...s(
      "SEKOLAH",
      "asset:read:school",
      "asset:write:school",
      "asset:maintenance:write:school",
      "asset:audit:school"
    ),
    ...s("SENDIRI", "asset:book:self"),
    ...s("SEKOLAH", "library:read:school"),
    ...s("SENDIRI", "library:borrow:self"),
    ...s("SEKOLAH", "announcement:read", "announcement:write:school"),
    ...s("SEKOLAH", "letter:read:school", "letter:approve:school"),
    ...s("SENDIRI", "letter:request:self"),
    ...s("SEKOLAH", "ppdb:verify:school", "ppdb:select:school", "ppdb:enroll:school"),
    ...s("SEKOLAH", "export:run:school", "export:read:school"),
    ...s("SEKOLAH", "staff:read:school", "staff:write:school", "staffattendance:record:school"),
    ...s("SEKOLAH", "rollover:preview:school")
  ],

  KEUANGAN: [
    ...BASIC_SELF,
    ...s("SEKOLAH", "class:read:school"),
    ...s("SEKOLAH", "academic:prodi:read"),
    ...s("SEKOLAH", "invoice:write:school", "invoice:read:school"),
    ...s("SEKOLAH", "payment:record:school", "payment:verify:school", "refund:approve:school"),
    ...s("SEKOLAH", "reconciliation:run:school", "cashflow:read:school"),
    ...s(
      "SEKOLAH",
      "payroll:read:school",
      "payroll:write:school",
      "payroll:run:school",
      "payroll:approve:school"
    ),
    ...s("SEKOLAH", "payroll:component:write:school"),
    ...s("SENDIRI", "payslip:read:self"),
    ...s("SEKOLAH", "asset:read:school"),
    ...s("SENDIRI", "asset:book:self"),
    ...s("SEKOLAH", "library:read:school"),
    ...s("SENDIRI", "library:borrow:self"),
    ...s("SEKOLAH", "announcement:read"),
    ...s("SEKOLAH", "staff:read:school", "staffattendance:record:school")
  ],

  GURU: [
    ...BASIC_SELF,
    ...s("KELAS", "class:read:class"),
    ...s("SEKOLAH", "subject:read:school", "schedule:read:school"),
    ...s("KELAS", "material:read:class", "material:write:class"),
    ...s("KELAS", "assignment:read:class", "assignment:write:class", "assignment:publish:class"),
    ...s("KELAS", "submission:read:class", "submission:grade:class"),
    ...s("KELAS", "question:read:class", "question:write:class", "quiz:write:class"),
    ...s("KELAS", "quiz:attempt:school"),
    ...s("SEKOLAH", "exam:read:school", "exam:write:school", "exam:session:write:school"),
    ...s("KELAS", "exam:attempt:school"),
    ...s("KELAS", "exam:token:class", "exam:grade-esai:class"),
    ...s("SEKOLAH", "exam:log:read:school", "exam:analysis:read:school"),
    ...s(
      "KELAS",
      "attendance:session:write:class",
      "attendance:record:class",
      "attendance:rekap:class"
    ),
    ...s("SENDIRI", "attendance:scan:self"),
    ...s("SENDIRI", "permit:request:self"),
    ...s("KELAS", "permit:verify:class"),
    ...s("KELAS", "discipline:record:class"),
    ...s("KELAS", "report:read:class", "report:export:class"),
    ...s("SEKOLAH", "extracurricular:read:school", "extracurricular:write:school"),
    ...s("SENDIRI", "asset:book:self"),
    ...s("SEKOLAH", "library:read:school"),
    ...s("SENDIRI", "library:borrow:self"),
    ...s("SEKOLAH", "announcement:read"),
    ...s("SENDIRI", "letter:request:self"),
    ...s("SENDIRI", "staff:read:self", "staffattendance:read:self"),
    ...s("SEKOLAH", "internship:write:school"),
    ...s("SEKOLAH", "competency:grade:school")
  ],

  GURU_BK: [
    ...BASIC_SELF,
    ...s("SEKOLAH", "class:read:school"),
    ...s("SEKOLAH", "academic:prodi:read"),
    ...s("SEKOLAH", "attendance:rekap:class", "attendance:rekap:school"),
    ...s("SENDIRI", "permit:request:self"),
    ...s("KELAS", "permit:verify:class"),
    ...s("SEKOLAH", "counseling:read:class", "counseling:write:school"),
    ...s("KELAS", "discipline:record:class"),
    ...s("SEKOLAH", "discipline:read:school"),
    ...s("SEKOLAH", "extracurricular:read:school", "extracurricular:write:school"),
    ...s("SENDIRI", "asset:book:self"),
    ...s("SEKOLAH", "library:read:school"),
    ...s("SENDIRI", "library:borrow:self"),
    ...s("SEKOLAH", "announcement:read"),
    ...s("SENDIRI", "letter:request:self"),
    ...s("SENDIRI", "staff:read:self", "staffattendance:read:self")
  ],

  SISWA: [
    ...BASIC_SELF,
    ...s("KELAS", "class:read:class"),
    ...s("KELAS", "material:read:class", "assignment:read:class"),
    ...s("SENDIRI", "submission:submit:self", "submission:read:self"),
    ...s("SENDIRI", "quiz:attempt:self", "exam:attempt:self"),
    ...s("SENDIRI", "academic:prodi:read"),
    ...s("SENDIRI", "attendance:scan:self", "attendance:rekap:self", "permit:request:self"),
    ...s("SENDIRI", "invoice:read:self", "report:read:self"),
    ...s("SENDIRI", "extracurricular:join:self", "library:borrow:self", "asset:book:self"),
    ...s("SEKOLAH", "announcement:read", "library:read:school"),
    ...s("SENDIRI", "letter:request:self", "internship:journal:self")
  ],

  WALI_MURID: [
    ...BASIC_SELF,
    ...s(
      "SENDIRI",
      "report:read:self",
      "invoice:read:self",
      "attendance:rekap:self",
      "permit:request:self"
    ),
    ...s("KELAS", "class:read:class"),
    ...s("SEKOLAH", "announcement:read"),
    ...s("SENDIRI", "academic:prodi:read"),
    ...s("SENDIRI", "ppdb:register:public")
  ],

  CALON_SISWA: [
    ...BASIC_SELF,
    ...s("SENDIRI", "ppdb:register:public", "ppdb:read:self"),
    ...s("SENDIRI", "academic:prodi:read")
  ],

  PEMBIMBING_INDUSTRI: [
    ...BASIC_SELF,
    ...s("SENDIRI", "internship:journal:self", "internship:grade:self"),
    ...s("SEKOLAH", "announcement:read")
  ],

  PENGUJI_EKSTERNAL: [
    ...BASIC_SELF,
    ...s("SENDIRI", "competency:grade:self"),
    ...s("SEKOLAH", "announcement:read")
  ]
};

/** Semua role yang di-seed (12 role sesuai ERD §5). */
export const ROLES_TO_SEED: Role[] = [
  "SUPERADMIN",
  "KEPSEK",
  "WAKEPSEK",
  "OPERATOR",
  "KEUANGAN",
  "GURU",
  "GURU_BK",
  "SISWA",
  "WALI_MURID",
  "CALON_SISWA",
  "PEMBIMBING_INDUSTRI",
  "PENGUJI_EKSTERNAL"
];
