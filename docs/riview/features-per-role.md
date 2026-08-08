# Analisis Feature-Gap per Role

> Ringkasan fitur yang tersedia vs yang hilang/bernilai tinggi per role, dengan rekomendasi
> effort S/M/L. Ditulis oleh performance/features coder (workstream C). Sumber: route pages
> `apps/web/src/app/*`, seed `packages/database/prisma/seed-data/permissions.ts` +
> `dashboard-config.ts`, dan endpoint API `apps/api/src/modules/*`.

## Metodologi singkat

- **Fitur tersedia** = page route yang ada di web + endpoint API yang dipanggil page tsb.
- **Gap** = fitur yang wajar untuk role tsb tapi belum ada page/endpoint, atau page masih
  memakai data placeholder (demo/hardcode) padahal endpoint nyata sudah ada.
- **Prioritas** = nilai untuk pengguna harian × kemudahan (read-only dari endpoint yang ada
  = paling murah; endpoint baru = M/L).

---

## FEATURE GAP TABLE

| Role               | Fitur saat ini (page/endpoint)                                                                                                                      | Fitur hilang bernilai tinggi                                                                       | Effort    | Rekomendasi                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| **SISWA**          | Dashboard (ujian aktif, tugas, kelas, jadwal hari ini — NEW), Kalender & Jadwal (fix mapping — NEW), Kelas, Tugas, Kuis, Ujian, Nilai, Absensi      | 1. Kalender akademik resmi (PTS/PAS/PAT, libur) — belum ada entitas di schema                      | L         | Butuh model baru `academic_calendar_event` (Unit D + endpoint)                     |
|                    |                                                                                                                                                     | 2. Rapor digital per semester (view)                                                               | M         | Endpoint rekap nilai ada (`/grades/recap/student/:id`); tambah page tampilan rapor |
|                    |                                                                                                                                                     | 3. Notifikasi tenggat tugas/ujian via badge (sudah ada event realtime)                             | S         | Pastikan assignment/exam create memanggil NotificationService                      |
|                    |                                                                                                                                                     | 4. Status tagihan SPP sendiri (siswa lihat tagihan)                                                | S         | `/finance/invoices` sudah mendukung `invoice:read:self`; tambah link               |
| **GURU / GURU_BK** | Dashboard (rekap penilaian, kelas, ujian, rekap nilai — NEW), Kelas, Materi, Bank Soal, Penilaian (prototype), Absensi QR, Ujian, Tugas             | 1. Input nilai manual cepat per kelas (grid)                                                       | M         | Endpoint `POST /grades` ada; halaman grid nilai per kelas-mapel                    |
|                    |                                                                                                                                                     | 2. **Rekap nilai kelas** — DONE (dashboard guru, read-only dari `/grades/recap/class-subject/:id`) | S         | ✅ Implemented                                                                     |
|                    |                                                                                                                                                     | 3. GURU_BK: dashboard khusus BK (konseling, kedisiplinan) — sekarang arah ke `/admin/kepsek`       | M         | Page terpisah `/guru-bk/*` memakai endpoint counseling/discipline                  |
|                    |                                                                                                                                                     | 4. Export nilai per kelas (CSV/PDF)                                                                | S         | `POST /grades/export/csv                                                           | pdf` ada; tambah tombol di halaman penilaian                    |
| **ORTU**           | Dashboard (ringkasan anak: nilai, absensi, tagihan — real), Nilai Anak, Absensi Anak, Tagihan Anak                                                  | 1. Pemilihan anak bila >1 (saat ini hanya anak pertama)                                            | S         | UI selector anak; endpoint children sudah ada                                      |
|                    |                                                                                                                                                     | 2. Detail tagihan anak (riwayat pembayaran)                                                        | M         | `/finance/invoices/:id` + payments; page baru                                      |
|                    |                                                                                                                                                     | 3. Pengajuan izin anak (permit)                                                                    | S         | `permit:request:self` bisa dipakai wali; form baru                                 |
| **OPERATOR**       | Dashboard (data induk, landing, keuangan, wakepsek, kepsek), Admin Sistem (user list), Data induk & PPDB (`/admin/operator`), Landing               | 1. Wizard impor siswa/guru yang sudah jalan (ImportBatch)                                          | M         | Endpoint import ada di onboarding; UI form+riwayat                                 |
|                    |                                                                                                                                                     | 2. Manajemen jadwal pelajaran (CRUD)                                                               | S         | `POST /schedules` ada; tambah halaman grid jadwal per kelas                        |
|                    |                                                                                                                                                     | 3. Dashboard ringkasan PPDB (pendaftar per status)                                                 | M         | `/ppdb` module ada; agregat per status                                             |
| **KEUANGAN**       | Dashboard (keuangan, data siswa, kepsek), Keuangan (tagihan, pembayaran, verifikasi, SPP, denda, refund, rekonsiliasi, arus kas — endpoint lengkap) | 1. **Ringkasan tunggakan dashboard** (KEPSEK sudah; KEUANGAN perlu serupa)                         | S         | Pakai `/finance/invoices/summary/monthly`                                          |
|                    |                                                                                                                                                     | 2. Cetak tagihan / slip per siswa                                                                  | S         | PDF sederhana dari invoice                                                         |
|                    |                                                                                                                                                     | 3. Riwayat pembayaran siswa dalam satu layar                                                       | S         | Endpoint ada; page detail siswa                                                    |
| **WAKEPSEK**       | Dashboard (akademik & kedisiplinan, data induk, keuangan, kepsek) — page `/admin/wakepsek` prototype                                                | 1. Rekap nilai per kelas semester (read-only)                                                      | S         | `GET /grades/recap/class/:classId` ada                                             |
|                    |                                                                                                                                                     | 2. Rekap kehadiran lintas kelas (discipline)                                                       | S         | `/attendance/discipline` ada                                                       |
|                    |                                                                                                                                                     | 3. Jadwal ujian semester (PTS/PAS/PAT)                                                             | M         | `/exams` + exam sessions; page kalender ujian                                      |
| **KEPSEK**         | Dashboard eksekutif (KPI tunggakan — NEW real data; payroll rekap, audit change-log real), Data Sekolah, Akademik, Keuangan                         | 1. KPI siswa aktif & kehadiran dari data nyata                                                     | M         | Butuh endpoint agregat (admin-stats dibatasi SUPERADMIN)                           |
|                    |                                                                                                                                                     | 2. Persetujuan surat/izin via dashboard                                                            | M         | `letter:approve:school` ada; workflow page                                         |
|                    |                                                                                                                                                     | 3. Ringkasan payroll per periode (read-only)                                                       | M         | `GET /payroll/runs/:id/rekap` ada; page                                            |
| **SUPERADMIN**     | Admin Sistem, Branding, Landing, RBAC, Onboarding, Rollover (prototype API mismatch), Maintenance, Change-logs, Dashboard stats (real)              | 1. **Rollover page di-wire ke API nyata** (`/rollover/draft                                        | pre-check | dry-run                                                                            | execute`) — saat ini memanggil `/app/rollover/*` yang tidak ada | M   | Ganti endpoint web ke `POST /rollover/*` |
|                    |                                                                                                                                                     | 2. Audit trail per entity (drill-down)                                                             | S         | `/admin/change-logs?entity=` ada                                                   |
|                    |                                                                                                                                                     | 3. Backup & restore UI                                                                             | L         | Infra-level, di luar API                                                           |

---

## Quick wins yang DI-IMPLEMENTASI (read-only, endpoint sudah ada)

| #   | Fitur                              | Role   | File                                                | Keterangan                                                                                                                                 |
| --- | ---------------------------------- | ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Jadwal Hari Ini** di dashboard   | SISWA  | `apps/web/src/app/(siswa)/siswa/dashboard/page.tsx` | Filter `/schedules` per `day_of_week` hari ini (maks 4 entri)                                                                              |
| 2   | **Perbaikan halaman Kalender**     | SISWA  | `apps/web/src/app/(siswa)/siswa/kalender/page.tsx`  | Mapping `day_of_week` (1–7) + `start_period/end_period` → nama hari & "Jam ke-X–Y" (sebelumnya shape mismatch → selalu "Tidak ada jadwal") |
| 3   | **Izin baca jadwal untuk SISWA**   | SISWA  | `packages/database/prisma/seed-data/permissions.ts` | Tambah `schedule:read:school` (data tetap di-scope ke kelas siswa via classIdFilter)                                                       |
| 4   | **Rekap Nilai Kelas** di dashboard | GURU   | `apps/web/src/app/(guru)/guru/dashboard/page.tsx`   | `/class-subjects` + `/grades/recap/class-subject/:id` (3 mapel pertama, rata-rata per kelas)                                               |
| 5   | **KPI Tunggakan SPP real**         | KEPSEK | `apps/web/src/app/(admin)/admin/kepsek/page.tsx`    | `/finance/invoices/summary/monthly` (jumlah overdue + outstanding rupiah) menggantikan angka hardcode                                      |

## Catatan penting (gap lain yang belum dikerjakan)

- **Rollover web → API mismatch**: `apps/web/src/app/(superadmin)/superadmin/rollover/page.tsx`
  memanggil `POST /app/rollover/drafts` + `/app/rollover/drafts/:id/execute` yang TIDAK ada;
  API nyata `POST /rollover/draft|:runId/pre-check|:runId/dry-run|:runId/execute`.
- **GURU penilaian prototype**: page memakai `GET /assignments` sebagai "submission" dan
  `PATCH /submissions/:id/grade` — kontrak belum sesuai service LMS (tidak ada controller
  submissions di modul LMS). Perlu Unit lain.
- **Admin-stats hanya SUPERADMIN**: KEPSEK tidak bisa memakai `GET /admin/dashboard/stats`;
  KPI siswa aktif/kehadiran tetap placeholder sampai endpoint agregat per-role dibuat.
- **changelog:new realtime**: event ditambahkan + emit dari `lms-audit.ts` (writeAudit);
  modul `modules/audit` (read-only) tidak disentuh per batas kepemilikan. Nama literal
  "change-log:new" tidak dipakai karena registry mewajibkan format `domain:aksi` tanpa
  hyphen di segmen pertama (lihat test notification-events.spec).
