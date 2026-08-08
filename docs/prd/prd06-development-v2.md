# PRD 6: Development PRD v2 — Fitur Baru, Roadmap, dan Strategi Performa

**Versi:** 1.0
**Tanggal:** 8 Agustus 2026
**Status:** Draft final untuk eksekusi development
**Pemilik Produk:** Aditya
**Dokumen Sumber:**

- docs/prd/prd05-development.md (v1.0) — penutupan gap audit G-01..G-67, roadmap 3 sprint — disebut **[prd05]**
- docs/riview/riview02.md (v1.0) — audit & review putaran 2 (register R-01..R-48, 9 dimensi; seluruh CRITICAL/HIGH ditutup) — disebut **[riview02]**
- docs/riview/riview01.md — laporan audit putaran 1 (7 CRITICAL + 5 HIGH diperbaiki) — disebut **[riview01]**
- docs/04-api-contract.md — kontrak API & matriks RBAC — disebut **[api-04]**
- docs/02-technical-architecture.md — arsitektur monorepo, auth, storage, realtime — disebut **[tek-02]**

> **Sifat dokumen:** PRD development putaran kedua. Berisi daftar fitur yang selesai di
> putaran ini, rencana fitur baru dari pengguna (font, ukuran font per-user, notifikasi
> realtime, analisis per-role, global settings, clean code, performa), target kapasitas,
> roadmap 3 sprint, dan definisi selesai yang terukur. Seluruh evidence `file:line`
> mengacu kondisi source code 2026-08-07; nomor baris dapat bergeser setelah perbaikan
> diterapkan (asumsi §6).

---

## 1. Ringkasan Eksekutif (BLUF)

**PRD development v2 ini menetapkan program putaran berikutnya agar openlms siap
memenuhi empat target sekaligus: kapasitas 500 pengguna idle / 1.500–2.000 pengguna
ujian bersamaan tanpa 429/timeout, 2.000+ tes (API + web) hijau, codebase bersih
(clean code pass), dan performa terukur (p95 autosave < 300 ms, coverage ≥ 80%,
0 temuan CRITICAL/HIGH).**

- **Putaran sebelumnya tuntas:** audit putaran 2 [riview02] menutup **seluruh 3 temuan
  CRITICAL dan 10 HIGH** (register R-01..R-48). Fondasi kini stabil: dark mode,
  dashboard per-role yang dapat dikonfigurasi, change-log SUPERADMIN/KEPSEK, upload
  tervalidasi magic bytes, browser storage terkelola, websocket realtime, landing page
  diperkaya, dan PrismaClient singleton. PRD ini berangkat dari kondisi tersebut.
- **Fitur baru dari pengguna diprioritaskan pada personalisasi & keterbacaan:** font
  "Plus Jakarta Sans" sebagai tema default, pengaturan ukuran font per-user (3 level)
  yang berlaku untuk SEMUA role (guru sangat membutuhkan teks besar), notifikasi
  realtime per-user yang relevan, global settings web (warna/font/logo) oleh
  SUPERADMIN, dan analisis fitur per-role untuk menutup gap tiap peran.
- **Performa adalah target keras:** optimasi dilakukan sistematis — cache route/app
  config, eager loading & eliminasi N+1, cache hasil query, database indexing, kompresi
  aset, cache driver cepat, state management ringan (zustand/konteks), dan import
  minimal. Seluruhnya diuji dengan load test k6 1.500–2.000 VU.
- **Definisi selesai (DoD) terukur:** ≥ 1.500 pengguna ujian bersamaan tanpa
  429/timeout, p95 autosave < 300 ms, coverage ≥ 80%, 2.000+ tes hijau, 0 temuan
  CRITICAL/HIGH terbuka, dan dokumentasi teknis sinkron dengan source (§4).

---

## 2. Fitur yang Selesai di Putaran Ini

Seluruh fitur berikut sudah diimplementasikan dan terverifikasi pada audit putaran 2
[ riview02 §4–§5 ]. Kolom referensi menautkan ID register R- (audit putaran 2) dan
G- (PRD putaran 1) untuk traceability.

| #   | Fitur                                                                                                                                                                                                                | Referensi              | Status                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------- |
| F1  | **Dark mode lengkap** — varian `dark` (Tailwind v4 `@custom-variant`), token `.dark`, `ThemeProvider` + `ThemeToggle`; kontras token AA (`--muted-foreground: #6b7280`)                                              | R-01, R-03, R-48; G-57 | SELESAI                                            |
| F2  | **Dashboard per-role configurable** — model `RoleDashboardConfig` (`schema.prisma:2550`), API konfigurasi, editor SUPERADMIN; KPI dashboard memakai `GET /admin/dashboard/stats` data nyata                          | R-05, R-06             | SELESAI                                            |
| F3  | **Change log (audit)** — modul `AuditLogModule`, endpoint baca `GET /admin/change-logs` (SUPERADMIN/KEPSEK), gap-fill penulisan AuditLog di 8 modul                                                                  | R-11, R-12             | SELESAI                                            |
| F4  | **Upload sanitasi** — validasi magic bytes `MAGIC_SIGNATURES`, batas per-bucket `STORAGE_MAX_<BUCKET>_MB`, allowlist mimetype per bucket, konsolidasi `modules/storage`, `StorageCleanupJob`                         | R-15..R-21; G-23, G-56 | SELESAI                                            |
| F5  | **Browser storage terkelola** — helper `lib/storage.ts`, draft PPDB pindah ke `sessionStorage` + tombol hapus draft, resume ujian terbaca                                                                            | R-23, R-24             | SELESAI                                            |
| F6  | **WebSocket realtime** — hook `use-socket` + badge notifikasi live, Redis adapter saat `REDIS_URL`, event `exam:force-submit` + `exam:tick` server-authoritative, CORS terkonsolidasi, auto-submit batching + indeks | R-26..R-31; G-12, G-17 | SELESAI                                            |
| F7  | **Landing page expansion** — 8 section baru (sambutan, visi-misi, program-keahlian, ekstrakurikuler, prestasi, fasilitas, galeri, faq), render gambar, CTA PPDB, fallback generik                                    | R-33..R-36             | SELESAI (R-35: SEBAGIAN — form kontak menyusul)    |
| F8  | **PrismaClient singleton** — `DatabaseModule` global menggantikan 7 `new PrismaClient()` (mitigasi exhaust pool)                                                                                                     | R-37; G-16             | SELESAI                                            |
| F9  | **Dokumentasi & higiene** — 38+ file README (kontrak modul + registrasi), dokumentasi GitHub, perbaikan CI, sinkronisasi env docs, bootstrap test web (Vitest)                                                       | R-38..R-45             | SELESAI (R-44: SEBAGIAN — 1 TODO dokumentasi xlsx) |

Catatan: item yang tersisa terbuka dari register (R-07, R-09, R-10, R-13, R-14, R-22,
R-41, R-46, R-47) tidak termasuk dalam daftar selesai di atas dan menjadi input bagi
roadmap §5 (Sprint 2–3).

---

## 3. Rencana Fitur Baru (Roadmap)

### 3.1 Font "Plus Jakarta Sans" dari Google Fonts

- Font tema default aplikasi: **Plus Jakarta Sans** (Google Fonts), dipasang via
  `next/font` dengan fallback sistem (mis. `-apple-system`, `Segoe UI`, `sans-serif`).
- **Alasan:** keterbacaan untuk produk sekolah; identitas visual modern namun netral.
- **Kriteria selesai:** font aktif di seluruh tema (light/dark); fallback sistem
  bekerja saat offline/terblokir; tidak menambah CLS (pengukuran CWV dipertahankan);
  dokumentasi font family di konfigurasi tema.

### 3.2 Pengaturan Ukuran Font Per-User (3 level)

- **Level:** `normal` (100%), `large` (112,5%), `big` (125%).
- **Penyimpanan:** kolom `UserProfile.font_scale` (migrasi Prisma + API `GET`/`PUT`
  preferensi, RBAC scope SENDIRI).
- **Penerapan:** CSS variable `--font-scale` pada elemen `html` (atau class
  `font-scale-large` / `font-scale-big`); seluruh komponen memakai `font-size` berbasis
  variabel sehingga skala berlaku seragam.
- **Cakupan:** **semua role** — SISWA, GURU, ORTU, KEUANGAN, WAKEPSEK, KEPSEK,
  OPERATOR, SUPERADMIN (guru dengan beban teks tinggi menjadi pengguna utama fitur ini).
- **Kriteria selesai:** pemilihan 3 level tersedia di pengaturan profil; persistensi
  lintas sesi; skala diterapkan konsisten tanpa merusak layout; aksesibilitas terjaga.

### 3.3 Notifikasi Realtime Per-User yang Relevan (lanjutan use-socket)

Melanjutkan fondasi F6 [riview02 §4.6], kirim notifikasi realtime yang relevan per role:

| Jenis notifikasi                 | Penerima                     | Event WS                                     |
| -------------------------------- | ---------------------------- | -------------------------------------------- |
| Ujian force-submit / waktu habis | SISWA (pengerja ujian)       | `exam:force-submit`, `exam:tick` (sudah ada) |
| Pengumuman kelas                 | SISWA + GURU (anggota kelas) | event baru `class:announcement`              |
| Tagihan / jatuh tempo            | SISWA + ORTU                 | event baru `finance:invoice`                 |
| Absensi tercatat                 | ORTU + SISWA                 | event baru `attendance:recorded`             |
| Change-log untuk admin           | SUPERADMIN, KEPSEK           | event baru `audit:change`                    |
| Penilaian/tugas selesai dinilai  | SISWA                        | event baru `lms:graded`                      |

- **Kriteria selesai:** event relevan terkirim via gateway dengan room validation
  (pola `sanitizeRoom`/`canAccessRoom` dipertahankan); badge live ter-update; test
  event per jenis; fallback polling bila WS tidak tersedia.

### 3.4 Analisis Fitur Per-Role: Existing vs Proposed

Analisis gap fitur per role untuk menentukan prioritas penambahan fitur (detail
implementasi dijadwalkan Sprint 3, §5). "Existing" mengacu modul yang terverifikasi
[ riview02 §2.1 ]; "Proposed" adalah usulan yang belum dibangun.

| Role       | Fitur existing (terverifikasi)                                                                                               | Fitur kurang (proposed)                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| SISWA      | Ujian/kuis online, autosave + auto-submit, tugas/materi LMS, absensi, tagihan (finance), PPDB pendaftaran, notifikasi in-app | Riwayat nilai & rapor digital, notifikasi jadwal/pengumuman, font scale, kartu identitas digital             |
| GURU       | Kelas & materi, penilaian, kuis/ujian, absensi input, antrean penilaian, komunikasi                                          | Dashboard kelas ringkas, ekspor nilai, pengingat jadwal mengajar, font scale                                 |
| ORTU       | Parent portal (nilai, absensi, tagihan anak)                                                                                 | Notifikasi tagihan/absensi realtime, komunikasi wali kelas                                                   |
| KEUANGAN   | Invoice/payment/SPP, payroll, dashboard keuangan                                                                             | Dashboard tunggakan & rekap ekspor, notifikasi jatuh tempo                                                   |
| WAKEPSEK   | Dashboard, laporan akademik, rollover                                                                                        | Laporan kehadiran & kemajuan, notifikasi ringkasan; **akses change-log (saat ini tidak — [riview02] §8-R1)** |
| KEPSEK     | Dashboard, laporan, change-log (R-11), persetujuan payroll                                                                   | Laporan eksekutif, notifikasi approval                                                                       |
| OPERATOR   | Data master, branding, landing CMS, users-admin, operasional PPDB                                                            | Impor data massal, audit data, font scale                                                                    |
| SUPERADMIN | RBAC admin, app-settings, feature-flags, dashboard-config, users-admin, audit/change-log, onboarding                         | Global settings web (font family + ukuran dasar), monitoring performa                                        |

### 3.5 Web Global Settings (warna, font, logo)

- Fondasi sudah ada: modul **branding** (warna, radius, logo, favicon, app_name) dan
  **app-settings**.
- **Tambahan:** pengaturan **font family** dan **ukuran font dasar** (base font-size)
  oleh SUPERADMIN melalui UI global settings; diterapkan sebagai CSS variable di root,
  dengan override per-user (3.2) di atasnya.
- **Kriteria selesai:** setting global dipersist dan di-cache (Cache-Control),
  diterapkan ke seluruh halaman, RBAC `app:write:school` (SUPERADMIN/OPERATOR).

### 3.6 Clean Code Pass

Refaktor higienis di seluruh codebase (apps/api, apps/web, packages/*):

- **One-line if/continue** — pola `if (cond) continue;` / guard clause konsisten.
- **Destructuring imports** — import bernama, hindari default import yang tidak perlu.
- **Hapus unused code** — variabel, parameter, komentar usang (target: 0 warning ESLint).
- **Rapikan formatting** — konsisten dengan konfigurasi lint/format workspace.
- **Kriteria selesai:** lint 0 warning/0 error; tidak ada regresi fungsional (test
  tetap hijau); `grep` marker `TODO`/`FIXME` turun menjadi 0 (sisa dokumentasi xlsx
  [riview02] R-44 diselesaikan atau dipindah ke dokumentasi).

### 3.7 Optimisasi Performa

Strategi bertingkat untuk target 1.500–2.000 pengguna ujian bersamaan:

| Area                     | Aksi                                                                                                 | Target                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Cache config             | Cache route/app config (branding, app-settings, feature-flags) dengan TTL + invalidasi               | Hit API statis turun; landing cepat                     |
| Query                    | Eager loading (`include`/`select` minimal), eliminasi N+1 (rollover, attendance, payroll, grades)    | Query count per request turun; test dataset besar       |
| Cache hasil query        | Cache resolusi scope/permission guard + statistik dashboard (TTL 60 s, invalidasi saat role berubah) | ≤ 2 query/request terautentikasi (lanjut [prd05] G-07)  |
| Database                 | Database indexing lengkap (status/submitted_at hot path, lanjut [prd05] G-18); konfigurasi pool      | EXPLAIN tanpa seq scan pada hot path; koneksi stabil    |
| Queue untuk proses berat | Pertahankan queue/cron untuk SPP, notifikasi, payroll, rollover, auto-submit (sudah ada)             | Proses berat tidak memblokir request                    |
| Aset                     | Kompresi aset (gzip/brotli + immutable cache Nginx), cache driver cepat (Redis saat `REDIS_URL`)     | CWV LCP/INP/CLS dalam target [prd04 §7]                 |
| State management React   | Evaluasi **zustand** atau konteks ringan untuk state global (tema, notifikasi, preferensi)           | Bundle size terukur; tidak ada state sinkronisasi ulang |
| Import minimal           | Tree-shaking, hapus dependency tak terpakai, dynamic import halaman berat                            | Bundle size turun; build hijau                          |
| Ekspor berat             | Pindah dari memoryStorage ke disk/streaming untuk bucket `exports` (risiko [riview02] §8-R3)         | Upload/ekspor besar tidak membebani RAM                 |

### 3.8 Dokumentasi Teknis

- Perbarui `02-technical-architecture.md`, `03-database-erd.md`, `04-api-contract.md`
  (model baru `RoleDashboardConfig`, endpoint change-log, preferensi `font_scale`).
- Perbarui README modul yang berubah dan indeks `docs/README.docs.md`
  (tambahkan riview02 dan prd06).
- **Kriteria selesai:** seluruh klaim dokumentasi sinkron dengan source (tidak ada
  drift); bagian yang belum terverifikasi ditandai eksplisit.

---

## 4. Target Kapasitas & Definisi Selesai (Definition of Done)

Target terukur yang menjadi syarat go-live dan sesi ujian sungguhan (memperkuat
[ prd05 §15 ]):

| #   | Kriteria                    | Target                                                                                            | Alat Ukur                                                |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Kapasitas pengguna ujian    | **≥ 1.500 user bersamaan (puncak 2.000, satu shift)** tanpa 429/timeout; baseline idle 500 stabil | Load test k6 (autosave + submit massal 5 menit terakhir) |
| 2   | Latensi autosave            | **p95 < 300 ms**                                                                                  | k6 + metrik API                                          |
| 3   | Latensi end-to-end ujian    | p95 < 3 s                                                                                         | k6                                                       |
| 4   | Error rate puncak           | < 1% pada beban ujian                                                                             | k6 + alerting                                            |
| 5   | Test                        | **2.000+ tes hijau** (API 335+ eksisting tanpa regresi + test baru web/komponen/E2E)              | CI pipeline (vitest/jest + RTL + Playwright)             |
| 6   | Test coverage               | **≥ 80%** (line/branch) untuk apps/api dan apps/web modul inti                                    | Gate coverage CI                                         |
| 7   | Temuan keamanan/kualitas    | **0 temuan CRITICAL/HIGH terbuka** (register R-01..R-48 + audit lanjutan)                         | Audit ulang pasca-perbaikan (file:line terbaru)          |
| 8   | Clean code                  | lint 0 warning/error; `TODO`/`FIXME` = 0; tidak ada unused import/parameter                       | ESLint + grep + review                                   |
| 9   | Performa database           | Hot path tanpa seq scan (indeks lengkap); ≤ 2 query/request terautentikasi                        | `EXPLAIN` + metrik query                                 |
| 10  | Dokumentasi                 | `02/03/04`, README modul, indeks docs sinkron dengan source                                       | Review dokumentasi per perubahan                         |
| 11  | Keterbacaan & personalisasi | Font Plus Jakarta Sans aktif; font scale 3 level untuk semua role; global settings berfungsi      | Test visual + a11y + E2E preferensi                      |
| 12  | Notifikasi realtime         | Semua jenis notifikasi §3.3 terkirim via WS dengan room validation; badge live akurat             | Test event + skenario puncak                             |

Kriteria go/no-go ujian live: **kriteria 1–4, 7, 9 wajib hijau**; kriteria 5–6, 8, 10–12
dikejar paralel dan wajib hijau sebelum rilis production skala penuh.

---

## 5. Roadmap 3 Sprint

Urutan eksekusi: **fondasi UX & personalisasi (Sprint 1) → clean code & performa
(Sprint 2) → fitur per-role, kualitas & dokumentasi (Sprint 3).** Estimasi mengikuti
[prd05 §14]: S < 2 hari, M 2–5 hari, L 1–2 minggu (tim 1–3 orang). Kolom "Owner" adalah
peran yang disarankan; dalam tim kecil peran dapat dirangkap, namun review (reviewer)
dan verifikasi (tester) tidak boleh dilakukan oleh pembuat perubahan yang sama.

### 5.1 Sprint 1 — Fondasi UX, Personalisasi & Notifikasi

| ID   | Task                                                                                    | Effort | Owner                | Done-Definition                                                                        |
| ---- | --------------------------------------------------------------------------------------- | ------ | -------------------- | -------------------------------------------------------------------------------------- |
| S1-1 | Pasang font "Plus Jakarta Sans" via `next/font` + fallback sistem                       | S      | coder                | Font aktif di light/dark; fallback saat offline; CWV tidak turun                       |
| S1-2 | Migrasi `UserProfile.font_scale` + API `GET`/`PUT` preferensi (RBAC SENDIRI)            | S      | coder                | Migrasi bersih; endpoint teruji; tidak ada regresi auth                                |
| S1-3 | Terapkan CSS var `--font-scale` + class pada `html` (normal/large/big)                  | M      | coder + reviewer     | Skala 100/112,5/125% konsisten lintas role; layout tidak rusak; a11y terjaga           |
| S1-4 | UI pemilihan ukuran font per-user (dropdown 3 level di profil/app-shell)                | S      | coder                | Pemilihan persist; diterapkan lintas sesi                                              |
| S1-5 | Event notifikasi per-user: pengumuman kelas, tagihan, absensi, graded, change-log admin | M      | coder + tester       | Event terkirim via WS dengan room validation; badge live akurat; test event per jenis  |
| S1-6 | Analisis fitur per-role (matriks §3.4) + prioritisasi gap                               | M      | architect + reviewer | Matriks tervalidasi stakeholder; daftar gap terprioritaskan untuk Sprint 3             |
| S1-7 | Global settings web: font family + ukuran dasar oleh SUPERADMIN (lanjutan branding)     | M      | coder                | Setting global dipersist + cache; override per-user berfungsi; RBAC `app:write:school` |

**Pintu keluar Sprint 1:** font & font scale aktif untuk semua role; notifikasi realtime
per-user berfungsi; matriks per-role disetujui; global settings SUPERADMIN berjalan.

### 5.2 Sprint 2 — Clean Code & Performa

| ID    | Task                                                                                  | Effort | Owner             | Done-Definition                                                                          |
| ----- | ------------------------------------------------------------------------------------- | ------ | ----------------- | ---------------------------------------------------------------------------------------- |
| S2-1  | Clean code pass: one-line if/continue + guard clause di seluruh codebase              | M      | coder             | Pola konsisten; lint/test tetap hijau                                                    |
| S2-2  | Clean code pass: destructuring imports + hapus unused (variabel, parameter, komentar) | S      | coder             | 0 warning ESLint; `TODO`/`FIXME` = 0 (selesaikan catatan xlsx [riview02] R-44)           |
| S2-3  | Cache route/app config (branding, app-settings, feature-flags) TTL + invalidasi       | M      | coder + architect | Hit API statis turun; landing cepat; invalidasi bekerja saat config berubah              |
| S2-4  | Eager loading & eliminasi N+1 (rollover, attendance, payroll, grades)                 | M      | coder             | Query count turun (EXPLAIN); test dataset besar benar & cepat                            |
| S2-5  | Cache hasil query guard (scope/permission) + statistik dashboard (TTL 60 s)           | M      | coder             | ≤ 2 query/request terautentikasi; invalidasi saat role berubah (lanjut [prd05] G-07)     |
| S2-6  | Lengkapi database indexing hot path (status, submitted_at) + konfigurasi pool         | S      | coder + tester    | EXPLAIN tanpa seq scan; pool stabil di load test                                         |
| S2-7  | Kompresi aset + cache driver cepat (Redis saat `REDIS_URL`)                           | M      | coder             | CWV dalam target; cache Redis terverifikasi saat tersedia                                |
| S2-8  | State management React: evaluasi zustand/konteks ringan untuk state global            | M      | architect + coder | Store terpusat (tema, notifikasi, preferensi); bundle size terukur; tidak ada state drif |
| S2-9  | Import minimal: tree-shaking, hapus dep tak terpakai, dynamic import halaman berat    | S      | coder             | Bundle size turun; build hijau                                                           |
| S2-10 | Ekspor berat: pindah exports dari memoryStorage ke disk/streaming + ceiling aman      | M      | coder + reviewer  | Ekspor besar tidak membebani RAM (menutup [riview02] §8-R3)                              |

**Pintu keluar Sprint 2:** clean code gate hijau (0 warning); query count ≤ 2/request;
load test 1.500 VU lulus p95 autosave < 300 ms; bundle size terukur turun.

### 5.3 Sprint 3 — Fitur Per-Role, Kualitas & Dokumentasi

| ID   | Task                                                                                                                                                          | Effort | Owner             | Done-Definition                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------- | ---------------------------------------------------------------------------------------- |
| S3-1 | Implementasi fitur prioritas per-role dari matriks S1-6 (mis. riwayat nilai siswa, ekspor nilai guru, dashboard tunggakan keuangan, laporan eksekutif kepsek) | L      | coder + reviewer  | Fitur teruji + tervalidasi pilot; RBAC sesuai [api-04]                                   |
| S3-2 | Keputusan akses change-log untuk WAKEPSEK (permission `audit:read:school` atau scope view)                                                                    | S      | architect         | Keputusan eksplisit terdokumentasi; permission di-seed bila disetujui ([riview02] §8-R1) |
| S3-3 | Kampanye test menuju 2.000+ (unit/komponen web + E2E alur inti + ekspansi API)                                                                                | L      | tester            | 2.000+ tes hijau; coverage ≥ 80% (api+web modul inti)                                    |
| S3-4 | Load test final k6 1.500–2.000 VU (autosave, submit massal, notifikasi)                                                                                       | M      | tester + reviewer | Skema lulus: 0 429, p95 autosave < 300 ms, error < 1%                                    |
| S3-5 | Audit ulang keamanan & kualitas (dark mode selesai di landing/dashboard, gate DEMO_MODE)                                                                      | M      | reviewer          | 0 CRITICAL/HIGH; R-07/R-41 (data demo) ditutup; R-02 tuntas                              |
| S3-6 | Rate limit khusus upload + error isolation fetch ortu + perbaikan UX (bottom nav)                                                                             | S      | coder             | R-22, R-47, R-46 ditutup; test terkait                                                   |
| S3-7 | Perbarui dokumentasi teknis (02/03/04, README modul, indeks docs)                                                                                             | M      | writer + coder    | Seluruh klaim sinkron source; `docs/README.docs.md` memuat riview02 & prd06              |
| S3-8 | Aktifkan gate coverage & seluruh quality gate di CI                                                                                                           | M      | tester + coder    | QG-1..QG-8 hijau; coverage gate aktif; pipeline CI stabil                                |

**Pintu keluar Sprint 3 (go-live):** seluruh item §5.3 selesai; DoD §4 terpenuhi;
audit lanjutan 0 CRITICAL/HIGH; dokumentasi sinkron; staging hijau sebelum produksi.

---

## 6. Risiko & Asumsi

### 6.1 Risiko

| #   | Risiko                                                                                  | Severity | Mitigasi                                                                                                   |
| --- | --------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| R1  | Google Fonts memerlukan koneksi internet; offline/terblokir dapat mengubah tampilan     | MEDIUM   | Fallback sistem wajib (S1-1); self-host font via `next/font`; uji offline                                  |
| R2  | `font_scale` (125%) dapat merusak layout bila tidak diuji lintas role & viewport        | MEDIUM   | Test visual per role + viewport; aksesibilitas WCAG; batasi skala maksimal 125%                            |
| R3  | Notifikasi realtime bergantung koneksi stabil; tanpa Redis multi-instance tidak sinkron | MEDIUM   | Redis adapter sudah ada (F6); fallback polling bila WS gagal; test skenario puncak                         |
| R4  | Scope fitur per-role (S3-1) membengkak dan menunda target performa                      | MEDIUM   | Prioritas matriks §3.4 disetujui stakeholder di S1-6; cut-line: fitur non-inti digeser ke rilis berikutnya |
| R5  | Kampanye 2.000+ tes & coverage 80% adalah pekerjaan besar                               | HIGH     | Kampanye bertahap sejak Sprint 2 (done-definition tiap item membawa test); G-60/G-61 [prd05] sebagai dasar |
| R6  | Ekspor besar masih menggunakan memoryStorage bila S2-10 tertunda                        | MEDIUM   | Kerjakan S2-10 di awal Sprint 2; batasi ukuran ekspor sementara                                            |
| R7  | Perubahan state management (S2-8) berisiko regresi halaman yang banyak memakai state    | MEDIUM   | Adopsi bertahap + test regresi; pertahankan API hook kompatibel                                            |
| R8  | Evidence `file:line` adalah snapshot 2026-08-07; nomor baris bergeser setelah perbaikan | MEDIUM   | Regenerate referensi saat audit lanjutan; jaga traceability per ID (R-/G-/S-)                              |

### 6.2 Asumsi

| #   | Asumsi                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Aplikasi melayani SATU sekolah (single-school, satu NPSN) tanpa multi-tenant [prd04 §2.4][tek-02 ADR-001].                                                                              |
| A2  | Target 1.500–2.000 pengguna puncak = satu shift ujian (PTS/PAS/PAT); beban autosave ±100 req/s; baseline idle 500 pengguna stabil.                                                      |
| A3  | Redis tersedia sejak Sprint 2 untuk cache/socket/lock/rate-limit terdistribusi; fallback in-process tetap didukung dan terdokumentasi.                                                  |
| A4  | Font "Plus Jakarta Sans" dipakai sebagai tema default; sekolah dapat mengganti font family melalui global settings (S1-7) — tidak dikunci.                                              |
| A5  | Ukuran font per-user berlaku untuk semua role termasuk GURU (kebutuhan teks besar); level default `normal` (100%).                                                                      |
| A6  | Bahasa dokumen dan UI: Bahasa Indonesia; mata uang Rupiah.                                                                                                                              |
| A7  | Dokumen ini membangun di atas kondisi [riview02] (semua CRITICAL/HIGH putaran 2 tertutup); item terbuka register (R-07/R-09/R-13/R-14/R-22/R-41/R-46/R-47) dituntaskan pada Sprint 2–3. |

---

_End of document — PRD 6 Development v2, openlms, 8 Agustus 2026._
