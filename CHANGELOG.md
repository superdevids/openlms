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

### Rencana (roadmap — lihat [docs/prd/prd05-development.md](docs/prd/prd05-development.md))

- **Performa & scaling 1.500–2.000 user**: rate limit berbasis identitas untuk
  NAT sekolah (G-06), cache resolusi scope/permission (G-07), optimasi autosave
  ujian (G-08), perbaikan race jawaban kuis (G-09), indeks hot-path (G-18),
  konfigurasi pool koneksi database (G-16), timer ujian berbasis server (G-17).
- **Keamanan**: proteksi CSRF (G-21), validasi magic bytes/MIME upload (G-23),
  IDOR finance (G-24), pesan error login generik (G-25), sanitasi konten
  landing (G-28).
- **Integritas data**: idempotency pembayaran (G-35), race `invoice_no` (G-36),
  payroll PAID transaksional (G-37), rollback rollover PPDB (G-39).
- **Observability**: health check dinamis (G-30), metrik/tracing/alerting
  (G-31), slow query log (G-32).
- **Fitur bisnis**: modul e-Rapor dua-track (G-49), ekspor Dapodik (G-50).
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
