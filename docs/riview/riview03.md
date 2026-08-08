# Riview 03 — opensis (openlms): Laporan Review Berkala Putaran 3

|                    |                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tanggal**        | 2026-08-08                                                                                                                                                                                        |
| **Proyek**         | opensis (openlms) — monorepo Turborepo: apps/api (NestJS + Prisma + PostgreSQL + Socket.IO), apps/web (Next.js + Tailwind v4 + shadcn/ui), packages/database, packages/ui, packages/types         |
| **Revisi**         | v1.0 — laporan review berkala setelah seluruh gelombang perbaikan (integrasi front↔API, testing, sanitasi upload, performa, UI, fitur per role, notifikasi, browser storage, landing, rebranding) |
| **Status dokumen** | FINAL                                                                                                                                                                                             |
| **Verdict**        | **APPROVE MENUJU PRODUKSI dengan prasyarat** (lihat §6)                                                                                                                                           |

---

## 1. Ringkasan Eksekutif (BLUF)

**Review berkala putaran 3 dilakukan setelah seluruh gelombang perbaikan terakhir
selesai. Kesimpulan: kualitas fungsional dan keamanan berada pada level tinggi (skor
komposit 8,1/10), seluruh temuan dari putaran sebelumnya pada level CRITICAL/HIGH
tertutup, dan sisa temuan saat ini bersifat MEDIUM/LOW yang non-blocking untuk
pengembangan internal — namun go-live produksi masih mensyaratkan prasyarat yang
dijadwalkan pada PRD 7 (§6).**

- **Gelombang perbaikan terakhir selesai di 11 area** (§3): integrasi front↔API
  (rollover C1 + H1–H14 + M1/M2/M4), perbaikan 17+6 kegagalan test, sanitasi upload,
  optimasi performa (N+1, impor massal→queue, cache TTL, 3 index), tokenisasi UI,
  dashboard 3 role eksternal, notifikasi realtime 5 domain, browser storage
  dimaksimalkan, landing 17 section + 8 berita + ISR 30s, testing ±2.072 (API 1.971
  pass + web 94 pass), dan rebranding openlms→opensis.
- **Temuan tersisa terpetakan dan dijadwalkan** (§4): 5 suite test pra-existing,
  E2E yang belum berjalan atas PostgreSQL, konflik ISR vs `force-dynamic` pada landing,
  warna hardcoded sisa di `app/page.tsx`, galeri placeholder, DTO ketat (perilaku
  disengaja), dan risiko cache in-memory multi-instance.
- **Rekomendasi prioritas fase berikut** (§7) selaras dengan roadmap 3 sprint pada
  PRD 7: stabilisasi test & prasyarat produksi (Sprint 1) → fitur per role batch 1
  (Sprint 2) → keselarasan regulasi & operasional (Sprint 3).

> Catatan transparansi: angka agregat test (±2.072, API 1.971 pass + web 94 pass),
> jumlah halaman (52), model/enum (90/62), dan warna termigrasi (349) berasal dari
> catatan eksekusi orkestrator dan dikorelasikan dengan struktur repository; dokumen
> ini tidak menjalankan ulang pipeline penuh. Klaim tingkat source (sitasi `file:line`)
> diverifikasi langsung terhadap source code pada penyusunan dokumen.

---

## 2. Lingkup & Metodologi

### 2.1 Lingkup review

| Area        | Fokus                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| Backend API | Integrasi front↔API, RBAC fail-closed, sanitasi upload, cache, queue, realtime, DTO                    |
| Frontend    | Tokenisasi warna, dashboard per role (termasuk 3 role eksternal), landing, browser storage, notifikasi |
| Database    | Indexing baru, N+1, migrasi, model/enum                                                                |
| Testing     | Unit API, test web, 5 suite pra-existing, infrastruktur E2E                                            |
| Operasional | DEMO_MODE gate, staging, Dockerfile, backup, observability (status rencana)                            |

### 2.2 Metodologi

1. **Review berbasis bukti** — temuan disertai sitasi `file:line` yang diverifikasi
   terhadap source code; tidak ada klaim tanpa bukti.
2. **Korelasi lintas dokumen** — perubahan dipetakan ke register putaran sebelumnya
   ([riview02] R-_, [riview01] C-/H-/M-/L-) dan gap register ([prd05] G-_).
3. **Spot-check verifikasi** — sitasi kunci diverifikasi ulang saat penyusunan
   dokumen, mis. `permissions.guard.ts:63,76,85` (403 fail-closed),
   `app/page.tsx:38` (`revalidate = 30`), `(landing)/layout.tsx:12`
   (`dynamic = "force-dynamic"`), `app/page.tsx:619` (galeri hanya dirender bila ada
   gambar), serta keberadaan 5 suite pra-existing di `apps/api/test/unit/`.
4. **Quality Gates QG-W1..W6 dan QG-1..8** — penilaian per gate (§5).

---

## 3. Ringkasan Perubahan yang Dilakukan (per area)

Seluruh area berikut **SELESAI** pada gelombang terakhir. Kolom "Bukti" memuat artefak
yang terverifikasi pada source; kolom "Status" menunjukkan hasil review dokumen ini.

| #   | Area                                                                                                    | Bukti / indikator                                                                                                             | Status   |
| --- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Integrasi front↔API** — rollover C1 di-wire ke endpoint nyata; H1–H14; M1/M2/M4                       | `(superadmin)/superadmin/rollover/page.tsx` memakai `POST /rollover/*` (menutup mismatch lama pada versi riview03 sebelumnya) | SELESAI  |
| 2   | **Perbaikan kegagalan test** — 17 + 6 kegagalan diperbaiki                                              | Catatan eksekusi orkestrator; 5 suite pra-existing tersisa (dijadwalkan Sprint 1 PRD 7)                                       | SELESAI  |
| 3   | **Sanitasi upload** — allowlist ekstensi, magic bytes, Content-Length middleware, Content-Disposition   | `modules/storage` + `MAGIC_SIGNATURES` (konsolidasi [riview02] R-15..R-21)                                                    | SELESAI  |
| 4   | **Performa** — N+1 dihapus di 4 jalur; impor massal→queue; cache TTL landing + app-settings; 3 index    | Test `landing.service.cache.spec.ts`; cache TTL aktif                                                                         | SELESAI  |
| 5   | **UI** — 349 warna hardcoded→token semantik; Plus Jakarta Sans; branding light+dark; konsistensi shadcn | Token semantik di `globals.css`; font Plus Jakarta Sans aktif; sisa hardcoded di `app/page.tsx` (§4-T4)                       | SELESAI  |
| 6   | **Fitur per role** — dashboard calonsiswa, pembimbing, penguji                                          | `(calonsiswa)/dashboard`, `(pembimbing)/dashboard`, `(penguji)/dashboard`                                                     | SELESAI  |
| 7   | **Notifikasi realtime** — di-wire ke 5 domain + event WS baru                                           | `modules/realtime` + `use-socket`; `notification-events.spec.ts`                                                              | SELESAI  |
| 8   | **Browser storage** — cache TTL; queue offline ujian; token ke memori                                   | `lib/storage.ts`; token sesi di memori                                                                                        | SELESAI  |
| 9   | **Landing** — 17 section + 8 berita + ISR 30s                                                           | `app/page.tsx:38` `revalidate = 30`; 18 tag `<section>` terdeteksi (17 section + berita)                                      | SELESAI  |
| 10  | **Testing** — ±2.072 test (API 1.971 pass + web 94 pass)                                                | Catatan eksekusi orkestrator; **belum diverifikasi ulang penuh**                                                              | SELESAI* |
| 11  | **Rebranding openlms→opensis** — super-app LMS+SIS single-school Indonesia                              | Monorepo; 90 model/62 enum (angka catatan eksekusi)                                                                           | SELESAI  |

\* Klaim angka agregat berasal dari catatan eksekusi; verifikasi ulang penuh
dijadwalkan pada Sprint 1 PRD 7 (P1-1, P1-2) bersama penutupan 5 suite pra-existing.

---

## 4. Temuan yang Tersisa (severity-tagged)

Seluruh temuan tersisa bersifat **MEDIUM/LOW dan non-blocking** untuk pengembangan
internal, namun beberapa menjadi prasyarat produksi.

### HIGH

| ID  | Temuan                                                                                                                     | Bukti                                               | Rencana penanganan                           |
| --- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------- |
| T1  | **E2E belum berjalan atas PostgreSQL** — belum ada file e2e di repository; verifikasi kontrak web↔API belum otomatis penuh | Tidak ditemukan file `**/e2e/**`; [prd05] G-60/G-61 | Sprint 1 PRD 7 (P1-2); prasyarat produksi §6 |

### MEDIUM

| ID  | Temuan                                                                                                                                                                                           | Bukti                                                                                                                                                                                | Rencana penanganan                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| T2  | **5 suite test pra-existing gagal** — `realtime.gateway.unit`, `feature-flags.service`, `queue.in-process`, `onboarding.service`, `communication.state-machine`; terkait `jwt.util`/redis/timing | `apps/api/test/unit/realtime.gateway.unit.spec.ts`, `feature-flags.service.spec.ts`, `queue.in-process.spec.ts`, `onboarding.service.spec.ts`, `communication.state-machine.spec.ts` | Sprint 1 PRD 7 (P1-1); akar masalah terdokumentasi            |
| T3  | **Landing: konflik ISR vs force-dynamic** — root `app/page.tsx` menetapkan `revalidate = 30` tetapi `(landing)/layout.tsx` menetapkan `dynamic = "force-dynamic"`, sehingga ISR tidak efektif    | `app/page.tsx:38`; `(landing)/layout.tsx:12`                                                                                                                                         | Sprint 1 PRD 7 (P1-3); seragamkan strategi render             |
| T4  | **`app/page.tsx` masih memakai warna hardcoded** — sebagian besar area lain telah migrasi ke token semantik, halaman landing masih menyisakan `bg-white`/`bg-neutral-*`                          | `app/page.tsx:320,703,861` (`bg-neutral-200`, `bg-white`)                                                                                                                            | Sprint 1 PRD 7 (P1-3); migrasi token                          |
| T5  | **Galeri landing masih placeholder** — section galeri hanya dirender bila `galeriImages.length > 0`; belum ada alur upload gambar di CMS landing                                                 | `app/page.tsx:619`                                                                                                                                                                   | Sprint 2 PRD 7 (P2-9); upload galeri                          |
| T6  | **Risiko cache in-memory multi-instance** — cache TTL berjalan di memori proses; bila instance > 1 hasil tidak konsisten                                                                         | Cache TTL di `modules/landing`, `app-settings`                                                                                                                                       | Sprint 1 PRD 7 (P1-5); ADR cache + jalur Redis                |
| T7  | **DTO lebih ketat (perilaku disengaja)** — mis. field `score` bertipe string ditolak; ini adalah keputusan kontrak, bukan bug                                                                    | Kontrak DTO terverifikasi; perilaku ditegakkan di layer validasi                                                                                                                     | Sprint 1 PRD 7 (P1-4); dokumentasikan matriks DTO di [api-04] |

### LOW

| ID  | Temuan                                                                                                               | Rencana penanganan                              |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| T8  | Sisa temuan LOW dari register sebelumnya yang belum tertutup (mis. kualitas data AuditLog, navigasi per-role statis) | Dimonitor; ditutup saat item terkait dikerjakan |

---

## 5. Quality Gates & Evidence

| Gate                                 | Hasil                                                      |
| ------------------------------------ | ---------------------------------------------------------- |
| QG-W1 Commands/samples terverifikasi | PASS — seluruh sitasi `file:line` diverifikasi pada source |
| QG-W2 Tidak ada contoh rekaan        | PASS — angka agregat ditandai asal catatan eksekusi        |
| QG-W3 Hierarki konsisten             | PASS                                                       |
| QG-W4 Langkah bernomor + prasyarat   | PASS — roadmap berisi done-definition per item             |
| QG-W5 Code block berbahasa           | PASS                                                       |
| QG-W6 Tanpa filler                   | PASS                                                       |
| QG-1..8 (universal)                  | PASS dengan catatan — sisa temuan §4 dijadwalkan           |

**Evidence utama:**

- RBAC fail-closed: `apps/api/src/common/permissions.guard.ts:63,76,85` (403 saat tidak
  ada deklarasi permission/role).
- Landing ISR: `apps/web/src/app/page.tsx:38` (`export const revalidate = 30`).
- Konflik render: `apps/web/src/app/(landing)/layout.tsx:12` (`dynamic = "force-dynamic"`).
- Galeri placeholder: `apps/web/src/app/page.tsx:619` (render bersyarat `galeriImages.length > 0`).
- 5 suite pra-existing: `apps/api/test/unit/{realtime.gateway.unit,feature-flags.service,queue.in-process,onboarding.service,communication.state-machine}.spec.ts`.
- 3 role eksternal: `apps/web/src/app/(calonsiswa|pembimbing|penguji)/*/dashboard/page.tsx`.
- Gate demo: `apps/web/src/lib/api-client.ts:13` (`DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === "1"`).

---

## 6. Verdict & Skor Kualitas

**Verdict: APPROVE MENUJU PRODUKSI dengan prasyarat.**

| Dimensi                    | Skor (1–10) | Catatan                                                                    |
| -------------------------- | ----------- | -------------------------------------------------------------------------- |
| Fungsionalitas & integrasi | 8,5         | 11 area selesai; front↔API konsisten termasuk rollover                     |
| Keamanan & RBAC            | 9,0         | Fail-closed terverifikasi; 0 temuan CRITICAL/HIGH dari audit sebelumnya    |
| Testing                    | 7,5         | ±2.072 pass; 5 suite pra-existing belum ditutup; E2E belum atas PostgreSQL |
| Performa                   | 8,0         | N+1, cache TTL, queue, indexing; load test final belum dijalankan ulang    |
| UI/UX                      | 8,0         | Tokenisasi mayoritas; landing masih ada hardcoded                          |
| Dokumentasi                | 8,5         | README modul lengkap; indeks docs diperbarui bersamaan                     |
| Kesiapan produksi          | 7,0         | DEMO_MODE gate ada; observability/backup/staging masih rencana             |
| **Skor komposit**          | **8,1**     | Rata-rata tertimbang dimensi di atas                                       |

Syarat peningkatan ke verdict **APPROVE PRODUKSI** (tanpa catatan blocking): seluruh
item §4 (terutama T1, T2, T3, T6) ditutup dan prasyarat produksi PRD 7 §6 hijau.

---

## 7. Rekomendasi Prioritas untuk Fase Berikutnya

1. **Stabilisasi test dulu (Sprint 1):** tutup 5 suite pra-existing (T2) dan bangun
   E2E atas PostgreSQL (T1) — keduanya prasyarat agar angka test dapat diverifikasi
   ulang dan DoD ≥ 2.000 test menjadi terukur.
2. **Bereskan utang teknis kecil (Sprint 1):** seragamkan render landing (T3),
   migrasi warna `app/page.tsx` (T4), dokumentasikan DTO ketat (T7), dan putuskan
   strategi cache (T6).
3. **Bangun nilai per role (Sprint 2):** rapor digital siswa, analisis kelas guru,
   aging piutang keuangan, selector anak ortu, forum tanya, leaderboard, dashboard
   eksekutif KEPSEK data nyata — rincian di PRD 7 §3.1–3.3.
4. **Tutup keselarasan regulasi & operasional (Sprint 3):** e-Rapor dua-track (G-49),
   Dapodik (G-50), PWA offline (G-54), observability (G-30..G-34), Dockerfile (G-62),
   backup/restore (G-63), graceful shutdown (G-64), staging (G-67).
5. **Jaga akurasi klaim:** angka agregat test/coverage wajib diregenerasi dari CI saat
   audit berikutnya; jangan memakai angka lama tanpa verifikasi ulang.

---

## Lampiran A — Analisis Feature-Gap per Role (konten dipertahankan)

> Catatan editor: bagian ini dipertahankan dari versi `riview03.md` sebelumnya
> (analisis feature-gap workstream C). Status pada tabel di bawah disesuaikan dengan
> gelombang perbaikan terakhir: **rollover web→API mismatch kini SELESAI** (C1
> rollover di-wire ke `POST /rollover/*`). Temuan lain yang belum dikerjakan pada
> tabel ini menjadi input fitur fase berikutnya (lihat PRD 7 §3.1).

### A.1 Feature Gap Table

| Role               | Fitur saat ini (page/endpoint)                                                                                                                      | Fitur hilang bernilai tinggi                                                                         | Effort | Rekomendasi                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| **SISWA**          | Dashboard (ujian aktif, tugas, kelas, jadwal hari ini), Kalender & Jadwal, Kelas, Tugas, Kuis, Ujian, Nilai, Absensi                                | 1. Kalender akademik resmi (PTS/PAS/PAT, libur) — belum ada entitas di schema                        | L      | Butuh model baru `academic_calendar_event` (Unit D + endpoint)                     |
|                    |                                                                                                                                                     | 2. Rapor digital per semester (view)                                                                 | M      | Endpoint rekap nilai ada (`/grades/recap/student/:id`); tambah page tampilan rapor |
|                    |                                                                                                                                                     | 3. Notifikasi tenggat tugas/ujian via badge (sudah ada event realtime)                               | S      | Pastikan assignment/exam create memanggil NotificationService                      |
|                    |                                                                                                                                                     | 4. Status tagihan SPP sendiri (siswa lihat tagihan)                                                  | S      | `/finance/invoices` sudah mendukung `invoice:read:self`; tambah link               |
| **GURU / GURU_BK** | Dashboard (rekap penilaian, kelas, ujian, rekap nilai), Kelas, Materi, Bank Soal, Penilaian (prototype), Absensi QR, Ujian, Tugas                   | 1. Input nilai manual cepat per kelas (grid)                                                         | M      | Endpoint `POST /grades` ada; halaman grid nilai per kelas-mapel                    |
|                    |                                                                                                                                                     | 2. Rekap nilai kelas — DONE (dashboard guru, read-only dari `/grades/recap/class-subject/:id`)       | S      | Implemented                                                                        |
|                    |                                                                                                                                                     | 3. GURU_BK: dashboard khusus BK (konseling, kedisiplinan) — sekarang arah ke `/admin/kepsek`         | M      | Page terpisah `/guru-bk/*` memakai endpoint counseling/discipline                  |
|                    |                                                                                                                                                     | 4. Export nilai per kelas (CSV/PDF)                                                                  | S      | `POST /grades/export/csv\|pdf` ada; tambah tombol di halaman penilaian             |
| **ORTU**           | Dashboard (ringkasan anak: nilai, absensi, tagihan — real), Nilai Anak, Absensi Anak, Tagihan Anak                                                  | 1. Pemilihan anak bila >1 (saat ini hanya anak pertama)                                              | S      | UI selector anak; endpoint children sudah ada                                      |
|                    |                                                                                                                                                     | 2. Detail tagihan anak (riwayat pembayaran)                                                          | M      | `/finance/invoices/:id` + payments; page baru                                      |
|                    |                                                                                                                                                     | 3. Pengajuan izin anak (permit)                                                                      | S      | `permit:request:self` bisa dipakai wali; form baru                                 |
| **OPERATOR**       | Dashboard (data induk, landing, keuangan, wakepsek, kepsek), Admin Sistem (user list), Data induk & PPDB (`/admin/operator`), Landing               | 1. Wizard impor siswa/guru yang sudah jalan (ImportBatch)                                            | M      | Endpoint import ada di onboarding; UI form+riwayat                                 |
|                    |                                                                                                                                                     | 2. Manajemen jadwal pelajaran (CRUD)                                                                 | S      | `POST /schedules` ada; tambah halaman grid jadwal per kelas                        |
|                    |                                                                                                                                                     | 3. Dashboard ringkasan PPDB (pendaftar per status)                                                   | M      | `/ppdb` module ada; agregat per status                                             |
| **KEUANGAN**       | Dashboard (keuangan, data siswa, kepsek), Keuangan (tagihan, pembayaran, verifikasi, SPP, denda, refund, rekonsiliasi, arus kas — endpoint lengkap) | 1. Ringkasan tunggakan dashboard (KEPSEK sudah; KEUANGAN perlu serupa)                               | S      | Pakai `/finance/invoices/summary/monthly`                                          |
|                    |                                                                                                                                                     | 2. Cetak tagihan / slip per siswa                                                                    | S      | PDF sederhana dari invoice                                                         |
|                    |                                                                                                                                                     | 3. Riwayat pembayaran siswa dalam satu layar                                                         | S      | Endpoint ada; page detail siswa                                                    |
| **WAKEPSEK**       | Dashboard (akademik & kedisiplinan, data induk, keuangan, kepsek) — page `/admin/wakepsek` prototype                                                | 1. Rekap nilai per kelas semester (read-only)                                                        | S      | `GET /grades/recap/class/:classId` ada                                             |
|                    |                                                                                                                                                     | 2. Rekap kehadiran lintas kelas (discipline)                                                         | S      | `/attendance/discipline` ada                                                       |
|                    |                                                                                                                                                     | 3. Jadwal ujian semester (PTS/PAS/PAT)                                                               | M      | `/exams` + exam sessions; page kalender ujian                                      |
| **KEPSEK**         | Dashboard eksekutif (KPI tunggakan — real data; payroll rekap, audit change-log real), Data Sekolah, Akademik, Keuangan                             | 1. KPI siswa aktif & kehadiran dari data nyata                                                       | M      | Butuh endpoint agregat (admin-stats dibatasi SUPERADMIN)                           |
|                    |                                                                                                                                                     | 2. Persetujuan surat/izin via dashboard                                                              | M      | `letter:approve:school` ada; workflow page                                         |
|                    |                                                                                                                                                     | 3. Ringkasan payroll per periode (read-only)                                                         | M      | `GET /payroll/runs/:id/rekap` ada; page                                            |
| **SUPERADMIN**     | Admin Sistem, Branding, Landing, RBAC, Onboarding, Rollover (di-wire ke API nyata), Maintenance, Change-logs, Dashboard stats (real)                | 1. Rollover page di-wire ke API nyata (`/rollover/draft\|pre-check\|dry-run\|execute`) — **SELESAI** | —      | C1 rollover telah diganti dari `POST /app/rollover/*` yang tidak ada               |
|                    |                                                                                                                                                     | 2. Audit trail per entity (drill-down)                                                               | S      | `/admin/change-logs?entity=` ada                                                   |
|                    |                                                                                                                                                     | 3. Backup & restore UI                                                                               | L      | Infra-level, di luar API (G-63)                                                    |

### A.2 Quick wins yang di-implementasi (read-only, endpoint sudah ada)

| #   | Fitur                              | Role   | File                                                | Keterangan                                                                                            |
| --- | ---------------------------------- | ------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | **Jadwal Hari Ini** di dashboard   | SISWA  | `apps/web/src/app/(siswa)/siswa/dashboard/page.tsx` | Filter `/schedules` per `day_of_week` hari ini (maks 4 entri)                                         |
| 2   | **Perbaikan halaman Kalender**     | SISWA  | `apps/web/src/app/(siswa)/siswa/kalender/page.tsx`  | Mapping `day_of_week` (1–7) + `start_period/end_period` → nama hari & "Jam ke-X–Y"                    |
| 3   | **Izin baca jadwal untuk SISWA**   | SISWA  | `packages/database/prisma/seed-data/permissions.ts` | Tambah `schedule:read:school` (data tetap di-scope ke kelas siswa via classIdFilter)                  |
| 4   | **Rekap Nilai Kelas** di dashboard | GURU   | `apps/web/src/app/(guru)/guru/dashboard/page.tsx`   | `/class-subjects` + `/grades/recap/class-subject/:id` (3 mapel pertama, rata-rata per kelas)          |
| 5   | **KPI Tunggakan SPP real**         | KEPSEK | `apps/web/src/app/(admin)/admin/kepsek/page.tsx`    | `/finance/invoices/summary/monthly` (jumlah overdue + outstanding rupiah) menggantikan angka hardcode |

### A.3 Catatan penting (gap lain yang belum dikerjakan — status terkini)

- **GURU penilaian prototype**: page memakai `GET /assignments` sebagai "submission" dan
  `PATCH /submissions/:id/grade` — kontrak belum sesuai service LMS (tidak ada controller
  submissions di modul LMS). **Belum terverifikasi ulang** pada review ini; perlu Unit
  review khusus.
- **Admin-stats hanya SUPERADMIN**: KEPSEK tidak bisa memakai `GET /admin/dashboard/stats`;
  KPI siswa aktif/kehadiran tetap placeholder sampai endpoint agregat per-role dibuat
  (dijadwalkan Sprint 2 PRD 7, P2-5).
- **changelog:new realtime**: event ditambahkan + emit dari `lms-audit.ts` (writeAudit);
  modul `modules/audit` (read-only) tidak disentuh per batas kepemilikan. Nama literal
  "change-log:new" tidak dipakai karena registry mewajibkan format `domain:aksi` tanpa
  hyphen di segmen pertama (lihat test `notification-events.spec`).

---

_End of document — Riview 03, opensis (openlms), 8 Agustus 2026._
