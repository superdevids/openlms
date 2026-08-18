# Changelog — opensis

Semua perubahan penting pada proyek **opensis** (sebelumnya `openlms`) dicatat di dokumen ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/) dan
versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

Konvensi tipe perubahan:

- **Added** — fitur baru.
- **Changed** — perubahan pada fitur/perilaku yang sudah ada.
- **Deprecated** — fitur yang akan dihapus di versi mendatang.
- **Removed** — fitur yang dihapus.
- **Fixed** — perbaikan bug.
- **Security** — perbaikan keamanan.

## [Unreleased]

### Added (gelombang 20-item — multi-role, squash migrasi, optimasi N+1, UI v2, dead code — 2026-08-18, lihat [riview05 Addendum 5](docs/riview/riview05.md))

- **Multi-role switcher (item 18)**: user non-siswa/non-superadmin dapat
  **rangkap role**; dropdown **"Ganti peran"** di AppShell
  (`apps/web/src/components/layout/app-shell.tsx:390`); peran aktif disimpan
  di localStorage **`opensis_active_role`** (`apps/web/src/lib/active-role.ts:16`)
  dan HANYA mengatur UI/navigasi — **izin backend tetap union seluruh roles**
  (`switchableRoles`/`resolveActiveRole` di `apps/web/src/lib/roles.ts:52-67`);
  seed user dev baru **`kepsek1`** (KEPSEK + GURU,
  `packages/database/prisma/seed.ts:221-255`); login tetap **username
  (NIS/NIP)**, email opsional.
- **Squash migrasi (item 17)**: **17 folder migrasi → 1 baseline
  `20260818000000_init_squashed`** (`packages/database/prisma/migrations/`) —
  **92 tabel + 65 enum + 136 index (85 CREATE INDEX + 51 CREATE UNIQUE INDEX) + 133 FK**; DB dev di-reset & seed ulang.
  ⚠️ Belum di-apply ke env produksi (BLOCKER go-live).
- **Optimasi N+1 (item 19)**: rollover buildPlan/execute batch
  (`rollover.service.ts:503-712`), asset list tanpa N+1, payroll payslip
  batch, finance late-fee/refresh batch (`late-fee.service.ts:213`,
  `payment.service.ts:384-400`), PDP anonimisasi `updateMany`
  (`pdp-anonymize.service.ts:66-110`), impor chunk `$transaction`
  (`import.service.ts:65,221-283`); pagination `skip/take` pada
  exam/alumni/smk/ppdb; **4 index baru** PERF-02 (`Grade.academic_year`,
  `Invoice.status`, `Enrollment.academic_year_id`, `Attendance.status`).
- **UI v2 + gambar asli (item 12/16/19-UI)**: landing memakai gambar JPG
  (`apps/web/public/landing/school/*.jpg`) via script **`images:landing`**
  (`package.json:27` → `scripts/generate-landing-images.mjs`); **JSON-LD**
  (`app/page.tsx:268-296`), **OG image** (`layout.tsx:66`), anti-CLS, tagline
  default **"Platform Digital Terpadu Sekolah"**, shadow token `--shadow-app-*`.
- **Dead code (item 20)**: hapus `galeri-section.tsx`, `login_*.txt`, ekspor
  `FormPage` dari `components/ui/index.ts`, seed-data `finance.ts`/`assets.ts`,
  deps `cva`/`clsx`/`tailwind-merge` dari `apps/web`. `api-dev.log` di root
  sudah dihapus (kosong; `*.log` di `.gitignore`).
- **Angka test (catatan eksekusi 2026-08-18)**: API **~2.412 (118 suite)**,
  web **109** — bukan angka final, regenerasi CI tetap wajib (Rv5-14).

### Changed

- **Rebranding `openlms` → `opensis`**: nama produk kini **opensis** (super-app
  manajemen sekolah: LMS + SIS + keuangan + payroll + aset + PPDB).
  - Paket npm & workspace: `@openlms/*` → `@opensis/*`.
  - Cookie sesi: `openlms_session`/`openlms_access`/`openlms_refresh` →
    `opensis_*` (semua sesi aktif akan logout — disengaja).
  - Storage keys (theme, font scale, demo, draft PPDB, exam, branding cache,
    dashboard config, data saver, onboarding) → prefix `opensis_`.
  - Metadata keys decorator: `openlms:feature`/`public`/`permissions`/`roles` →
    `opensis:*`.
  - Email placeholder: `*@openlms.local` → `*@opensis.local`.
  - Nama tampilan/identitas: `NEXT_PUBLIC_APP_NAME`, branding default,
    health service (`opensis-api`), header ekspor nilai, onboarding, dsb.
  - Infrastruktur: `DATABASE_URL` template → DB `opensis`; Nginx `opensis.conf`;
    gitleaks rule-id & allowlist; Docker compose names.
  - Catatan: nama repository GitHub & folder lokal tetap `openlms` (belum
    direname); referensi `openlms` di `docs/prd`, `docs/riview`, `docs/01`–`07`,
    dan riwayat changelog di bawah adalah catatan sejarah.

### Changed (auth login-by-username & branding — 2026-08-18)

- **Login HANYA memakai `username` (NIS untuk siswa / NIP untuk guru)**: DTO
  backend `LoginDto` kini `{ username, password }` (bukan `emailOrUsername`);
  lookup user di `auth.service.ts` hanya via `User.username`; email tidak
  dipakai untuk login — opsional, hanya untuk notifikasi
  (`apps/api/src/modules/auth/dto/login.dto.ts`, `auth.service.ts:100-112`).
- **Form login frontend**: label "Username" + placeholder "NIS (siswa) / NIP
  (guru)", kirim `{ username, password }` ke `POST /auth/login`
  (`apps/web/src/components/auth/login-form.tsx:39,66-79`).
- **Invitation**: `username` **wajib** (NIS/NIP — identifier akun), `email`
  **opsional** (notifikasi); `fullName` + `role` wajib
  (`apps/api/src/modules/auth/dto/invitation.dto.ts`).
- **Branding default "Opensis"** (`DEFAULT_APP_NAME` di
  `apps/web/src/lib/constants.ts:17`, override `NEXT_PUBLIC_APP_NAME`) dan
  tagline **"Platform Digital Terpadu Sekolah"** di footer halaman login
  (`apps/web/src/app/(auth)/login/page.tsx:69`).
- **Sinkronisasi dokumentasi**: referensi "Email/Username" / `emailOrUsername`
  di `docs/02`, `docs/03`, `docs/04`, `docs/05`, `docs/07`, `docs/08`,
  `README.md`, `README.auth.md`, `README.registration.md` diperbarui ke
  login-by-username (NIS/NIP); kontrak invitation di `docs/04-api-contract.md`
  diselaraskan dengan implementasi (`POST /auth/invitations`,
  `POST /auth/invitations/accept`).

### Added (gelombang fitur & desain — 2026-08-10, lihat [riview05](docs/riview/riview05.md))

- **FE redesign v3 — App Design System v3**: AppShell v2 (`components/layout/app-shell.tsx` — sidebar per role, topbar + CommandPalette, drawer mobile, focus trap), 12 komponen shared di `apps/web/src/components/ui/` (PageContainer, PageHeader, StatCard/StatGrid/Sparkline, StatusBadge, DataTable, EmptyStateV3, FormPage/FormSection/ValidationAlert, CommandPalette), 53 halaman role diredesain + login split-screen (`(auth)/login/page.tsx`); token additif v3 ([docs/app-design-system-v3.md](docs/app-design-system-v3.md)).
- **Landing v2**: 10 halaman mandiri (home, tentang, program-keahlian, fasilitas, ekstrakurikuler, prestasi, galeri, testimoni, faq, kontak + berita) dengan design system v2 dan 21 SVG playful di `public/landing/playful/` ([docs/landing-design-v2.md](docs/landing-design-v2.md)).
- **Modul API `public-content`**: 12 endpoint publik GET `/public/*` (`@Public()` + `Cache-Control: public, max-age=300`), 20 test unit ([README.public-content.md](apps/api/src/modules/public-content/README.public-content.md)).
- **Modul API `metrics`**: `GET /metrics` — uptime, memori, event loop lag; SUPERADMIN + `system:status:read` ([README.metrics.md](apps/api/src/modules/metrics/README.metrics.md)).
- **Ops**: script backup/restore (`deploy/scripts/backup.sh`, `restore.sh`) + [deploy/BACKUP.md](deploy/BACKUP.md); overlay staging `docker-compose.staging.yml` + [deploy/README.staging.md](deploy/README.staging.md); scaffold E2E Playwright `apps/web/e2e/`.

### Added (gelombang e-Rapor v1 & go-live — 2026-08-16, lihat [riview05 Addendum 2](docs/riview/riview05.md))

- **Modul API `rapor` — e-Rapor Kurikulum Merdeka v1 (G-49)**: komputasi nilai

akhir on-the-fly dari `Grade` (bobot default TUGAS 20 / KUIS 20 / UJIAN 30 /
SUMATIF 30) + predikat; endpoint `GET /rapor/:studentId`, `GET /rapor/class/:classId`,
`GET /rapor/students`, `GET/PUT /rapor/settings`, `POST/DELETE /rapor/p5`;
track proyek P5 manual (`RaporP5`); scope RBAC SENDIRI/KELAS/SEKOLAH +
`ParentStudentLink` APPROVED untuk WALI_MURID ([README.rapor.md](apps/api/src/modules/rapor/README.rapor.md)).
Halaman baru `/siswa/rapor` (pemilih semester, tabel mapel + proyek P5).

- **PPh21 TER kategori B/C per pegawai**: kolom `Staff.ter_category` (PMK
  168/2023, default `A`) + endpoint `PATCH /payroll/staff/:staffId/ter-category`
  (`payroll:write:school`); dipakai payroll run (`payroll-run.service.ts:199-204`).
  **Catatan:** nilai bracket perlu review pajak sebelum produksi.
- **Idempotensi pembayaran**: `Idempotency-Key` klien dipersist
  (`Payment.idempotency_key` unique) + alokasi lintas invoice di
  `Payment.allocations` JSONB — replay aman, tidak dobel.
- **Kurikulum persist di database**: CP/TP/ATP kini tersimpan di model
  `CurriculumReference` (sebelumnya store `Map` in-memory).
- **Anti-IDOR jurnal PKL & cancel booking aset**: `assertJournalActor`
  (`smk/internship.service.ts:199`); ownership booking aset
  (`asset/services/asset-booking.service.ts:178-185`).
- **Test infra**: script test diselaraskan CI — `test:unit` tanpa e2e,
  `test:integration` termasuk e2e, `+test:unit:coverage` (`apps/api/package.json`);
  coverage web vitest ditambahkan (floor 0, `apps/web/vitest.config.ts`).

### Added (gelombang Wave 2 — modul PDP, e-Rapor v2 & Dapodik — 2026-08-16, lihat [riview05 Addendum 3](docs/riview/riview05.md))

- **Modul API `pdp` — kepatuhan UU PDP (G12/G13)**: **14 endpoint `/pdp/*`**
  — data pribadi sendiri (`GET /pdp/me/data`), perbaikan profil (`PUT /pdp/me`),
  ekspor data pribadi (`POST /pdp/me/export` → `DataExportLog` `ExportType.PERSONAL` +
  daftar/unduh `GET /pdp/me/exports[/:id/download]`), permintaan hapus data
  (`POST /pdp/me/delete-request`, daftar `GET /pdp/me/requests`), admin
  (list `GET /pdp/requests`, `POST /pdp/requests/:id/approve|reject`),
  consent (`GET /pdp/consents`), retensi (`GET /pdp/retention`,
  `PUT /pdp/retention/:entity`, `POST /pdp/retention/run`). Model `PdpRequest` +
  enum `PdpRequestType`/`PdpRequestStatus` (migrasi `20260816030000_add_pdp_module`);
  4 permission baru `pdp:*` (+ `report:export:self`); anonimisasi PII
  (`pdp-anonymize.service.ts`, placeholder `[dihapus]`); cron retensi bulanan
  **`pdp-retention-monthly` (`0 3 1 * *`)** + 5 kebijakan retensi default
  **60 bulan** (`retention-policies.ts`).
- **e-Rapor v2 — ekspor PDF per siswa (G-49)**: `POST /rapor/:studentId/export-pdf`
  (`report:export:self/class/school`) — PDF **hand-rolled** `rapor-pdf.ts` tanpa
  dependency (footer **"Draft Sistem"**, seksi P5), job `report.generate` →
  `RaporExportService`, unduh via `GET /exports/:id` + `GET /exports/:id/download`;
  halaman baru `/guru/rapor` & `/admin/rapor` + tombol unduh di `/siswa/rapor`.
  Approval rapor oleh KEPSEK = **v2.1 (roadmap, belum)**.
- **Ekspor Dapodik v1 (G-50)**: `POST /dapodik/export` (`export:run:school`) via
  job — **3 CSV ber-BOM UTF-8** (`peserta_didik.csv`, `pendidik.csv`,
  `rombongan_belajar.csv`) ke `storage/exports/dapodik_<stamp>/`; halaman
  `/admin/dapodik`. **GAP v1:** `User`/`Staff` belum punya kolom
  `nisn`/`nik`/`nuptk` — NISN dari `PpdbApplicant` (nullable), NUPTK kosong
  ber-catatan; ekspor best-effort, migrasi **v1.1 dijadwalkan**.
- **`ReportProcessor` bukan lagi skeleton**: dispatcher `export_type`
  RAPOR/DAPODIK/NILAI (`jobs/processors/report.processor.ts:58-70`, idempoten
  terhadap status COMPLETED/PROCESSING); `ExportModule` kini generator ekspor
  nyata (`rapor-export.service.ts`, `dapodik-export.service.ts`).
- **Gate CI aktif**: **prettier** (`npx prettier --check .`),
  **web coverage** (vitest `--coverage`, floor 0), **import-no-restricted-paths**
  (ESLint) — di samping lint/typecheck/unit/integration/web-e2e/build/audit/secrets.

### Changed (gelombang Wave 2 — 2026-08-16)

- **Migrasi DB 15 → 16**: tambah `20260816030000_add_pdp_module` (tabel
  `pdp_request`, enum `PdpRequestType`/`PdpRequestStatus`, nilai `PERSONAL` pada
  enum `ExportType`). Model Prisma 91 → **92** (tambah `PdpRequest`); **enum
  63 → 65** (tambah `PdpRequestType`, `PdpRequestStatus`).
- **Jumlah modul API 35 → 37** (tambah `pdp`, `export`); **permission seed
  141 → 146** (tambah `pdp:data:self`, `pdp:export:self`,
  `pdp:delete-request:self`, `pdp:review:school`, `report:export:self`);
  halaman web 65 → **68** (tambah `/guru/rapor`, `/admin/rapor`, `/admin/dapodik`).
- **Angka test catatan eksekusi 2026-08-16 (Wave 2)**: API **2.353 test (111
  suite)** + integration 10; web Vitest **99** — **bukan angka final** — wajib
  diregenerasi dari CI (Rv5-14).

### Changed (sinkronisasi dokumentasi putaran 2 — 2026-08-17, 16 gap)

- **README modul baru**: `apps/api/src/modules/pdp/README.pdp.md` (kontrak
  modul UU PDP — 14 endpoint `/pdp/*`, 4 permission `pdp:*`, kebijakan retensi
  5 entity 60 bulan + cron, model `PdpRequest`/enum) dan
  `apps/api/src/modules/export/README.export.md` (kontrak ekspor — `GET /exports/:id`,
  `GET /exports/:id/download`, `POST /dapodik/export`, generator
  rapor-pdf & dapodik 3 CSV, dispatcher `ReportProcessor`).
- **`README.jobs.md` diperbarui**: 7 `JOB_NAMES` (tambah `IMPORT_COMMIT`,
  `AUTO_SUBMIT_EXPIRED`), 9 kelas processor + 11 file di `processors/`
  (termasuk `pdp-retention`, `storage-cleanup`, `import`, `exam-autosubmit`);
  trigger `REPORT_GENERATE` = `RaporController.exportPdf` + `DapodikController`
  (NILAI via job melempar error).
- **`docs/04-api-contract.md`**: path desain `/reports/*` ditandai riwayat dan
  diganti path aktual `/rapor/:studentId`, `/rapor/class/:classId`,
  `POST /rapor/:studentId/export-pdf`; `/exports/dapodik` → `/dapodik/export`;
  tambah `GET /exports/:id` (metadata) dan **section baru §2.11 `/pdp/*`
  (14 endpoint)** — diberi label "Pembaruan 2026-08-17: path aktual".
- **Hitungan CI 9 → 10 job** (ci.yml aktual: lint, prettier, typecheck, unit,
  web-test, integration, web-e2e, build, audit, secrets) di `README.md:293,441`
  dan `docs/02:73,609`; referensi footer `rapor-pdf.ts:160` → **`:177`** di
  `docs/02:174`, `docs/08:207`, `README.md:152`.
- **`docs/08-knowledge-base.md`**: §2.1 model 91 → **92** (tambah baris domain
  PDP `PdpRequest`); §2.2 enum 63 → **65** (tambah `PdpRequestType`,
  `PdpRequestStatus`); `docs/03-database-erd.md:762` total enum **63 → 65** +
  nilai `PERSONAL` pada `ExportType`.
- **`README.registration.md`** academic/alumni/communication/ppdb/rollover/smk
  diberi banner **STATUS: IMPLEMENTED — catatan historis** (pola finance/asset)
  di atas klaim "TODO RBAC"/"BELUM ada di schema" yang sudah usang.
- **Drift storage ditandai** (`docs/08 §5.3`, `docs/02 §8.1`): bucket
  `payment-proofs`, `permits`, `counseling-attachments`, `official-letters`
  belum terdaftar di `BUCKET_POLICIES` (hanya 8 bucket terdaftar).
- **Nama rule ESLint diklarifikasi** (`docs/02 §3`): aktual
  **`import-x/no-restricted-paths`** (`eslint.config.mjs:53`), bukan
  `import-no-restricted-paths`.

### Changed

- **Migrasi DB 9 → 11**: tambah `20260809000000_audit_fixes` (unique `invoice(student_id, type, period)` + index hot-path exam + unique `exam_attempt(exam_session_id, token_used)`) dan `20260809010000_exam_attempt_token_dedupe` (pre-dedupe duplikat token historis).
- **Migrasi DB 11 → 12**: `20260810000000_parent_link_approval` — kolom `status ParentLinkStatus` pada `parent_student_link` untuk alur persetujuan tautan wali-anak oleh OPERATOR (Rv5-17); enum Prisma 62 → **63**.
- **CI 7 gate → 9 job**: tambah `web-test` (Vitest) dan `web-e2e` (Playwright, 4 test scaffold) — E2E kini berjalan di CI.
- **Permission seed 138** (13 kategori) — dokumentasi sinkron; ErrorCode 10 nilai (tambah `SERVICE_DEGRADED`).
- **Jumlah modul API 32 → 34** (tambah `public-content`, `metrics`); seed baru: extracurricular 8, achievement 5, user siswa1.
- **Angka test final** (catatan eksekusi 2026-08-10): API unit **2.140** (100 suite) + integration **10** + public-content **20**; web Vitest **99** — menggantikan estimasi ±2.000.

### Changed (gelombang e-Rapor & go-live — 2026-08-16)

- **Sinkronisasi dokumentasi (24 gap)** — penyesuaian klaim stale ke implementasi
  aktual: jumlah halaman web `README.md` (64 → **65** page.tsx: 11 landing + 54
  role/publik); daftar halaman per route group di `apps/web/src/app/README.app.md`
  (tambah `rapor`, `maintenance`, `dashboard-config`, `change-logs`, 11 halaman
  landing); endpoint baru didokumentasikan (`GET /exam/list-for-student`,
  `PATCH /payroll/staff/:staffId/ter-category`, `GET /storage/files/landing/*`,
  `POST /storage/files/public/:bucket` + permission storage yang lengkap);
  `README.registration.md` payroll/finance/asset diberi header
  **STATUS: IMPLEMENTED (2026-08-16)** (entitas sudah ada di schema.prisma —
  §4 bawah adalah catatan historis); marker `TODO RBAC` usang diganti catatan
  implementasi di 8 README.registration (parent-portal lengkap 9 endpoint);
  daftar `lib/` web jadi 19 file akurat; nama folder migrasi
  `20260809010000_exam_attempt_token_dedupe` → `20260808235959` di
  `docs/03-database-erd.md`.
- **Migrasi DB 12 → 15**: tambah `20260816000000_staff_ter_category` (TER PPh21
  PMK 168/2023 per pegawai), `20260816010000_payment_idempotency`
  (`Payment.idempotency_key` unique + `allocations` JSONB),
  `20260816020000_add_rapor_p5` (tabel `rapor_p5`); folder
  `20260809010000_exam_attempt_token_dedupe` **di-rename → `20260808235959`**.
  Model Prisma 90 → **91** (tambah `RaporP5`); **enum tetap 63** (tanpa enum baru).
- **Jumlah modul API 34 → 35** (tambah `rapor`); **permission seed 138 → 141**
  (tambah `rapor:p5:write:class`, `rapor:p5:write:school`, `rapor:write:school`);
  halaman web 64 → **65** (tambah `/siswa/rapor`).
- **Angka test catatan eksekusi 2026-08-16**: API unit **±2.228** (101 suite —
  ±2.203/99 suite sebelum modul rapor + 25 test rapor); web Vitest **99**;
  **bukan angka final** — wajib diregenerasi dari CI (Rv5-14).

### Security

- **JWT canonical signature** ditolak (base64url non-kanonik + `timingSafeEqual`, `jwt.util.ts:88-96`).
- **RBAC scope enforcement** di service (SEC-001/002/007); **refresh token di-revoke saat ganti password** (SEC-007).
- **`COOKIE_SECURE` fail-fast** di production (`main.ts:21-23`, CFG-02).
- **Audit failure logging** (`lms-audit.ts:65,93`) dan mapping error Prisma P2002/P2025/P2003 (`all-exceptions.filter.ts:111-125`).
- Perbaikan reliability: race payment verify, idempotensi rollover processor (REL-001/002/003/006/009), dedupe token sesi ujian (PERF-05).

### Security (gelombang go-live — 2026-08-16)

- **Keamanan go-live hardening**:
  - **Redis wajib password** — `REDIS_PASSWORD` fail-fast di production
    (`docker-compose.prod.yml:37`); API memakai `REDIS_URL` berpassword; container
    redis `requirepass` sama.
  - **Port service prod hanya 127.0.0.1** — postgres/redis/api/web terikat
    loopback; publik hanya Nginx :80 (`docker-compose.prod.yml:30-64,111`).
  - **Gate `DEMO_MODE`** — jalur data demo hanya aktif saat `NEXT_PUBLIC_DEMO=1`;
    API fail-fast bila `NEXT_PUBLIC_DEMO=1` di production (`apps/api/src/main.ts:31`).
  - **Anti-IDOR jurnal PKL & cancel booking aset** (SMK/asset ownership);
    `backup.sh` fallback storage dev + smoke check dump; `deploy/backups/` di
    `.gitignore`.

### Rencana (roadmap — lihat [docs/prd/prd05-development.md](docs/prd/prd05-development.md))

- **Performa & scaling 1.500–2.000 user**: rate limit berbasis identitas untuk
  NAT sekolah (G-06), cache resolusi scope/permission (G-07), optimasi autosave
  ujian (G-08), perbaikan race jawaban kuis (G-09), indeks hot-path (G-18),
  konfigurasi pool koneksi database (G-16), timer ujian berbasis server (G-17).
- **Keamanan**: proteksi CSRF (G-21), validasi magic bytes/MIME upload (G-23),
  IDOR finance (G-24), pesan error login generik (G-25), sanitasi konten
  landing (G-28).
- **Integritas data**: idempotency pembayaran (G-35 — **selesai 2026-08-16**, lihat Added di atas), race `invoice_no` (G-36),
  payroll PAID transaksional (G-37), rollback rollover PPDB (G-39).
- **Observability**: health check dinamis (G-30), metrik/tracing/alerting
  (G-31), slow query log (G-32).
- **Fitur bisnis**: modul e-Rapor dua-track (G-49 — **v1+v2 selesai 2026-08-16**:
  konsolidasi + track P5 + ekspor PDF; sisa **v2.1 approval KEPSEK** & integrasi
  file e-Rapor resmi), ekspor Dapodik (G-50 — **v1 selesai 2026-08-16**: 3 CSV;
  sisa migrasi **v1.1** kolom `nisn`/`nik`/`nuptk`).
- **Ops/infra**: Dockerfile aplikasi (G-62), backup/restore & drill (G-63),
  graceful shutdown (G-64), secret scanning di CI (G-65).
- **Testing**: web test, E2E Playwright, load test k6 (G-60, G-61).

## [0.5.0] — 2026-08-07

### Added

- **Maintenance mode**: status sistem publik (`GET /public/system-status`) yang
  selalu bekerja, serta kontrol nyala/mati mode pemeliharaan oleh SUPERADMIN
  (`PUT /admin/system/maintenance`, permission `system:maintenance:write`,
  tercatat di AuditLog). Cache status in-memory 5 detik agar middleware tidak
  menyentuh database per request
  (`apps/api/src/modules/maintenance/README.maintenance.md`).
- **Onboarding**: wizard setup 5 langkah + impor data untuk sekolah baru
  (`apps/api/src/modules/onboarding/README.onboarding.md`).
- **Landing CMS**: kelola konten halaman landing (hero, tentang, piagam,
  kontak, berita) dengan fallback offline di web
  (`apps/web/src/app/(landing)/`, `apps/web/src/lib/constants.ts`).
- **Branding config**: identitas visual sekolah (nama aplikasi, logo, favicon,
  warna) dikelola via API dan UI SUPERADMIN
  (`apps/api/src/modules/branding/README.branding.md`).
- **RBAC admin**: CRUD permission/role oleh SUPERADMIN
  (`apps/api/src/modules/rbac-admin/README.rbac-admin.md`, halaman
  `/superadmin/rbac`).
- **shadcn/ui**: komponen UI shared di `packages/ui` dan integrasi di
  `apps/web` (Tailwind CSS v4).

### Fixed

- **Kontrak web↔API ujian & kuis** (Cluster A, [prd05 §3](docs/prd/prd05-development.md)):
  - Autosave ujian ditolak 400 karena payload batch vs single (G-01).
  - Daftar ujian siswa 404: path `/exams` vs `/exam` + enum status tidak
    sinkron (G-02).
  - Alur kuis rusak: start attempt, id submission, jawaban ter-strip (G-03).
  - Cookie sesi `openlms_session` tidak dibuat saat login (G-04).
  - Tidak ada scheduler auto-submit server-side untuk ujian/kuis (G-05).

### Changed

- Nama cookie sesi dan konvensi kontrak diselaraskan antara `apps/web` dan
  `apps/api`.

## [0.4.0] — 2026

### Security

- **Rebrand `eclass` → `openlms`**: seluruh paket memakai namespace
  `@openlms/*`; target nol referensi `eclass`.
- Penguatan auth in-house: Argon2id, JWT di httpOnly cookie, refresh rotation;
  role di-resolve dari tabel `UserRole` (perubahan role instan, tidak bergantung
  klaim JWT).
- RBAC fail-closed: `AuthGuard` global → `PermissionsGuard`
  (`@RequirePermission`, scope SENDIRI/KELAS/SEKOLAH) → `FeatureFlagGuard`.
- Anti-impersonation: aktor dibaca dari `request.requestContext`, bukan header
  klien.
- Rate limiting login & API + security headers di Nginx (`deploy/nginx.conf`);
  secret scanning via `.gitleaks.toml`; `npm audit` di CI.

### Changed

- Penegasan storage lokal (`STORAGE_LOCAL_DIR`) — tanpa S3/MinIO.
- Konfigurasi CORS terbatas via `CORS_ORIGINS` (REST + Socket.IO).

## [0.3.0] — 2026

### Added

- **Wave 2 — modul penunjang**: Finance (SPP/tagihan & pembayaran), Payroll
  (PPh 21 TER/BPJS sebagai nilai terkonfigurasi, slip digital), Asset
  (inventaris & peminjaman), Ppdb, ParentPortal (wali murid read-only), Smk
  (PKL/UKK/DUDI), Rollover tahun ajaran, Communication (pengumuman/surat),
  Alumni.
- Realtime Socket.IO namespace `/ws`: notifikasi, event ujian
  (`exam:start`, `exam:autosave-ok`, `exam:force-submit`), pengumuman.
- Storage upload lokal + signed URL per bucket; antrean BullMQ opsional dengan
  fallback in-process bila `REDIS_URL` tidak diisi.

## [0.2.0] — 2026

### Added

- **Wave 1 — implementasi inti**: modul Auth, School/AppSettings, Academic
  (kelas, mapel, enrollment), Lms (materi, tugas, submission, penilaian), Quiz
  (bank soal, kuis, attempt), Exam (paket, sesi, token, attempt, autosave),
  Attendance (manual/QR/izin), Notifications.
- RBAC permission-based + scope dengan seed ~120 permission untuk 12 role
  (`packages/database/prisma/seed-data/permissions.ts`).
- Halaman web per route group role: `(siswa)`, `(guru)`, `(admin)`, `(ortu)`,
  `(superadmin)`, `(ppdb)`.

## [0.1.0] — 2026

### Added

- **Fase 0 — fondasi & dokumentasi**: monorepo Turborepo (apps/api, apps/web,
  packages/database, packages/ui, packages/types).
- Dokumentasi produk & teknis: PRD (docs/01…07, docs/prd/), arsitektur,
  ERD, kontrak API, rencana implementasi.
- CI dasar (`.github/workflows/ci.yml`): lint → typecheck → unit →
  integration (PostgreSQL) → build → npm audit.
- `docker-compose.yml` untuk PostgreSQL 16 (Redis 7 opsional, profile `full`);
  `deploy/nginx.conf` reverse proxy production.

<!--

Catatan rilis: tanggal untuk 0.1.0–0.4.0 tidak tercatat lengkap dalam riwayat
repository; baris `[0.x.0] — 2026` ditulis berdasarkan urutan roadmap
implementasi (Fase 0 → Wave 1 → Wave 2 → hardening/rebrand). Perbarui tanggal
akurat bila tersedia. Versi `package.json` saat ini masih `0.1.0` — bump
bersamaan dengan tag rilis resmi pertama.

-->
