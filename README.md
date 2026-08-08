# openlms

**Super-app LMS + SIS untuk sekolah SMA/SMK Indonesia.** Satu platform, satu akun, satu sumber data untuk seluruh operasional sekolah — dengan fokus inti yang tidak bisa ditawar: belajar dan mengajar (LMS).

![Build status](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-unit%20%26%20integration-yellow)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

> Lencana di atas adalah placeholder dan menyesuaikan status CI terbaru. Pipeline CI berjalan pada setiap push ke `main` dan pull request (lihat `.github/workflows/ci.yml`).

---

## Daftar Isi

- [Tentang](#tentang)
- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Arsitektur](#arsitektur)
- [Quick Start (Pengembangan)](#quick-start-pengembangan)
- [Variabel Environment](#variabel-environment)
- [Struktur Proyek](#struktur-proyek)
- [Sistem Role & RBAC](#sistem-role--rbac)
- [Dokumentasi API](#dokumentasi-api)
- [Deployment](#deployment)
- [Keamanan](#keamanan)
- [Pengujian](#pengujian)
- [Perintah Umum](#perintah-umum)
- [Dokumentasi](#dokumentasi)
- [Lisensi](#lisensi)

---

## Tentang

**openlms adalah SUPER-APP untuk SMA/SMK/sederajat Indonesia**: satu platform, satu akun, satu sumber data untuk seluruh operasional sekolah — dengan fokus inti yang tidak bisa ditawar: **belajar & mengajar (LMS)** [docs/prd/prd04.md §1].

- **Inti = LMS.** Kelas, materi, tugas, submission, kuis, bank soal, ujian online, penilaian, absensi, dan kalender adalah jantung produk.
- **Super-app, bukan kumpulan modul.** Satu login, satu navigasi per peran, satu sumber data yang saling terhubung: nilai → rapor → portal wali murid → keuangan → payroll.
- **Single-school.** Aplikasi dijalankan untuk SATU sekolah — tanpa multi-tenant, tanpa pemisahan data antar-sekolah [docs/02-technical-architecture.md §16 ADR-001].
- **RBAC penuh.** 12 role standar, kontrol akses per permission `resource:action:scope` (SENDIRI/KELAS/SEKOLAH), hierarki role, dan konfigurasi RBAC oleh SUPERADMIN.
- **Selaras regulasi Indonesia.** Kurikulum Merdeka (CP/ATP/P5), e-Rapor dua-track (roadmap), PPh 21 skema TER & BPJS, dan ekspor Dapodik berbasis file (roadmap).
- **Ringan, cepat, hemat kuota.** Dirancang untuk koneksi 4G/sinyal lemah dan kuota terbatas siswa.
- **Kustomisasi fitur.** Setiap modul dan sub-fitur punya saklar on/off (feature flags) yang dikendalikan SUPERADMIN.
- **Tanpa dependensi API pihak ketiga untuk fitur.** Seluruh fitur diimplementasikan in-house; infrastruktur (DB, Redis) boleh managed dan swappable.

## Fitur Utama

| Area                      | Status        | Cakupan                                                                                                                                                           |
| ------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LMS (inti)**            | Aktif         | Kelas, materi, tugas & submission, kuis & bank soal, ujian online (token sesi, autosave idempotent, auto-submit server-side), penilaian, absensi (manual/QR/izin) |
| **SIS**                   | Aktif         | Data induk siswa/guru/staf, kelas & rombel, jadwal, impor Excel, undangan user                                                                                    |
| **Keuangan**              | Aktif         | Tagihan (SPP dkk.), pembayaran, verifikasi bukti, rekap                                                                                                           |
| **Payroll**               | Aktif (modul) | Run payroll bulanan, komponen gaji, slip digital, PPh 21 TER & BPJS sebagai nilai terkonfigurasi per periode                                                      |
| **Aset**                  | Aktif (modul) | Inventaris, peminjaman, pemeliharaan, opname                                                                                                                      |
| **PPDB**                  | Aktif         | Pendaftaran publik, upload dokumen, cek status, verifikasi                                                                                                        |
| **e-Rapor**               | Roadmap       | Konsolidasi nilai → rapor dua-track Kurikulum Merdeka (mapel + P5) [prd05 G-49]                                                                                   |
| **Branding config**       | Aktif         | Identitas visual sekolah (nama, logo, warna) dikelola via API + UI SUPERADMIN                                                                                     |
| **RBAC configurable**     | Aktif         | CRUD permission/role per SUPERADMIN (`/superadmin/rbac`)                                                                                                          |
| **Maintenance mode**      | Aktif         | Mode pemeliharaan global dikontrol SUPERADMIN (`system:maintenance:write`)                                                                                        |
| **Landing CMS**           | Aktif         | Kelola konten halaman landing (hero, tentang, piagam, kontak, berita)                                                                                             |
| **Portal wali murid**     | Aktif         | Read-only: nilai, absensi, tagihan anak                                                                                                                           |
| **Realtime**              | Aktif         | Socket.IO namespace `/ws` — notifikasi, event ujian, pengumuman                                                                                                   |
| **Rollover tahun ajaran** | Aktif         | Preview/execute/rollback tutup tahun ajaran                                                                                                                       |

## Teknologi

| Komponen           | Path                | Teknologi                                                           |
| ------------------ | ------------------- | ------------------------------------------------------------------- |
| API                | `apps/api`          | NestJS 11, REST prefix `/api/v1`, Socket.IO namespace `/ws`, Prisma |
| Web                | `apps/web`          | Next.js App Router, Tailwind CSS v4, shadcn/ui, TanStack Query      |
| Database           | `packages/database` | Prisma + PostgreSQL (skema tunggal, single-school)                  |
| UI kit             | `packages/ui`       | Komponen shared (shadcn/ui primitives)                              |
| Types              | `packages/types`    | Enum & tipe bersama (satu sumber kebenaran)                         |
| Orchestrasi        | root                | Turborepo, npm workspaces, Node.js ≥ 20                             |
| Antrean (opsional) | `apps/api`          | BullMQ via Redis (`REDIS_URL`); fallback in-process tanpa Redis     |
| Reverse proxy      | `deploy/nginx.conf` | Nginx — rate limit, security headers, gzip, WebSocket               |

## Arsitektur

```
                        ┌──────────────────────────────────────────────┐
                        │                apps/web (Next.js)            │
                        │  Route groups: (siswa) (guru) (admin) (ortu) │
                        │  (superadmin) (ppdb) (landing)               │
                        │  Server Components + Client Components       │
                        └───────┬───────────────────────┬──────────────┘
                                │ HTTPS (REST /api/v1)  │ WSS (Socket.IO)
                                │ (JWT httpOnly cookie) │ namespace /ws
                                ▼                       ▼
        ┌───────────────────────────────────────────────────────────────┐
        │                      apps/api (NestJS)                         │
        │  JWT middleware → RBAC guard → Controller → Service → Repo    │
        │  Guard: @RequirePermission + scope SENDIRI/KELAS/SEKOLAH      │
        │  Rate limiter · Request ID · pino · AuditLog · Helmet         │
        │  29 modul (auth, lms, quiz, exam, finance, payroll, asset,    │
        │  ppdb, attendance, smk, parent-portal, maintenance, dll.)     │
        └──────┬──────────────┬──────────────┬──────────────┬───────────┘
               │              │              │              │
        ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼──────┐ ┌─────▼──────────┐
        │ PostgreSQL │ │ Redis      │ │ Storage     │ │ Queue (BullMQ) │
        │ skema      │ │ (opsional) │ │ lokal       │ │ (opsional)     │
        │ tunggal    │ │ cache/rate │ │ STORAGE_    │ │ in-process     │
        │ RLS ops.   │ │ lock/socket│ │ LOCAL_DIR   │ │ fallback       │
        └────────────┘ └────────────┘ └─────────────┘ └────────────────┘
```

Alur request production: **Nginx → `apps/web` (:3000) / `apps/api` (:3001)**. Konfigurasi lengkap di [`deploy/nginx.conf`](deploy/nginx.conf) (gzip, security headers, rate limiting login/API, cache immutable `/_next/static`, WebSocket `/ws`). Diagram detail: [docs/02-technical-architecture.md §15](docs/02-technical-architecture.md).

## Quick Start (Pengembangan)

**Prasyarat:**

- Node.js ≥ 20 (rekomendasi 22)
- PostgreSQL ≥ 16
- Redis (opsional — hanya untuk BullMQ; aplikasi tetap jalan tanpa Redis)

```bash
# 1. Instal dependensi
npm install

# 2. Environment — salin lalu isi nilai (lihat tabel variabel di bawah)
cp .env.example .env

# 3. Database
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev
npm run db:seed       # seed data dev (idempotent — aman dijalankan berulang)

# 4. Jalankan semua workspace (Turbo dev)
npm run dev
```

Setelah seed, login sebagai SUPERADMIN dev:

- Username: `admin`
- Password: `password` (hanya untuk development lokal; **wajib** diganti di production)

> Kredensial dev didokumentasikan di `packages/database/prisma/seed.ts`. Jangan pernah memakai password ini di environment nyata.

### Menjalankan PostgreSQL & Redis (Docker, opsional)

```bash
# PostgreSQL saja (default)
docker compose up -d

# PostgreSQL + Redis (antrean BullMQ aktif)
docker compose --profile full up -d
```

## Variabel Environment

Lihat [`.env.example`](.env.example) sebagai referensi lengkap.

| Variabel                                                           | Wajib    | Keterangan                                                        |
| ------------------------------------------------------------------ | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                                                     | Ya       | URL PostgreSQL (Prisma)                                           |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_INVITATION_SECRET` | Ya       | Secret acak **32+ byte** di production                            |
| `COOKIE_SECURE`                                                    | —        | `true` wajib saat HTTPS (production)                              |
| `CORS_ORIGINS`                                                     | Tidak    | Origin diizinkan (koma-pisah), REST + Socket.IO                   |
| `REDIS_URL`                                                        | Tidak    | Aktifkan BullMQ bila diisi; tanpa ini memakai in-process fallback |
| `NEXT_PUBLIC_API_BASE`                                             | Ya (web) | Base URL API untuk `apps/web`                                     |
| `NEXT_PUBLIC_APP_NAME`                                             | Tidak    | Nama aplikasi runtime (override branding default `openlms`)       |
| `PORT`                                                             | Tidak    | Default `3000` (web); konvensi production API di `3001`           |
| `STORAGE_LOCAL_DIR`                                                | Tidak    | Direktori upload lokal (default `./storage`)                      |
| `LOG_LEVEL`                                                        | Tidak    | Level log pino (default `info`)                                   |
| `CACHE_TTL_MS`                                                     | Tidak    | TTL cache in-memory (default `30000`)                             |
| `RATE_LIMIT_*`                                                     | Tidak    | Ambang rate limiting per-IP/identitas/login/refresh               |
| `TRUST_PROXY`                                                      | Tidak    | `true` bila API di belakang reverse proxy (Nginx)                 |

> **Storage: LOKAL saja — S3/MinIO TIDAK dipakai.** Semua unggahan (branding, avatar, materi) disimpan di filesystem backend lewat `STORAGE_LOCAL_DIR`. Tidak ada variabel `S3_*` maupun layanan object storage di seluruh repo — jangan menambahkan dependensi object storage tanpa persetujuan arsitek [docs/02-technical-architecture.md §8].

## Struktur Proyek

```
openlms/
├── apps/
│   ├── api/                    # NestJS backend (REST + Socket.IO gateway)
│   │   └── src/modules/        # 29 modul domain + README.<modul>.md
│   └── web/                    # Next.js App Router (frontend)
│       └── src/app/            # route groups per role & halaman publik
├── packages/
│   ├── database/               # Prisma schema, migrasi, seed, RLS opsional
│   ├── ui/                     # komponen shared (shadcn/ui)
│   └── types/                  # enum & tipe bersama
├── deploy/
│   ├── nginx.conf              # reverse proxy production
│   └── README.deploy.md        # panduan deployment
├── docs/                       # PRD, arsitektur, ERD, kontrak API, riset, UX
│   ├── 01-master-prd.md … 07-ux-design.md
│   └── prd/                    # prd01–prd05
├── .github/
│   ├── workflows/ci.yml        # lint → typecheck → unit → integration → build → audit
│   └── ISSUE_TEMPLATE/         # template issue & PR
├── .gitleaks.toml              # konfigurasi secret scanning
├── turbo.json
└── package.json
```

## Sistem Role & RBAC

**12 role standar** (keputusan RBAC [docs/prd/prd04.md §3.1]). Role adalah kumpulan **permission**, bukan sekadar label; wali kelas bukan role tersendiri melainkan scope override lewat `Class.homeroom_teacher_id`.

| #   | Role                    | Deskripsi                                                                              | Scope default   |
| --- | ----------------------- | -------------------------------------------------------------------------------------- | --------------- |
| 1   | **SUPERADMIN**          | Admin sistem aplikasi sekolah — pengaturan, feature flags, RBAC, manajemen user, audit | SEKOLAH         |
| 2   | **KEPSEK**              | Kepala sekolah — dashboard eksekutif, laporan, rekap payroll                           | SEKOLAH         |
| 3   | **WAKEPSEK**            | Wakil kepala sekolah (kurikulum/kesiswaan) — pengawasan akademik & ujian               | SEKOLAH         |
| 4   | **OPERATOR**            | Staf administrasi/TU — data induk, impor, undangan, verifikasi PPDB, surat             | SEKOLAH         |
| 5   | **KEUANGAN**            | Staf keuangan — tagihan, pembayaran, denda, refund, rekonsiliasi, payroll              | SEKOLAH         |
| 6   | **GURU**                | Pengajar mapel — materi, tugas, kuis, ujian, absensi, penilaian                        | KELAS           |
| 7   | **GURU_BK**             | Guru bimbingan konseling — catatan konseling (field-level), kedisiplinan               | SEKOLAH / KELAS |
| 8   | **SISWA**               | Peserta didik — materi, tugas, kuis, ujian, absensi, nilai, jadwal                     | SENDIRI + KELAS |
| 9   | **WALI_MURID**          | Orang tua/wali — portal read-only: nilai, absensi, tagihan anak                        | SENDIRI         |
| 10  | **CALON_SISWA**         | Pendaftar PPDB — formulir, upload dokumen, cek status                                  | SENDIRI         |
| 11  | **PEMBIMBING_INDUSTRI** | Pembimbing PKL dari DUDI — jurnal PKL siswa bimbingan                                  | SENDIRI         |
| 12  | **PENGUJI_EKSTERNAL**   | Penguji UKK dari industri — penilaian rubrik kompetensi                                | SENDIRI         |

**Model RBAC** — tiga dimensi kontrol akses [docs/02-technical-architecture.md §4]:

1. **Permission-based**: aksi dikendalikan izin `resource:action[:scope]` (contoh: `payroll:read:school`, `grade:write:class`, `payslip:read:self`).
2. **Role hierarchy**: role mewarisi permission dari hierarki; permission tambahan/dibatalkan via `RolePermission`.
3. **Scope**: batas data — **SENDIRI**, **KELAS**, atau **SEKOLAH**.

Otoritas role adalah tabel `UserRole` (bukan klaim JWT), sehingga perubahan role berlaku instan. SUPERADMIN dapat mengelola permission per role via UI `/superadmin/rbac`. Detail lengkap: [docs/04-api-contract.md §4](docs/04-api-contract.md) dan [docs/02-technical-architecture.md §4.3–4.5](docs/02-technical-architecture.md).

### Fitur Utama per Role

| Role                                        | Fitur utama di aplikasi                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **SUPERADMIN**                              | Admin sistem, feature flags, RBAC, branding, landing CMS, onboarding, maintenance mode, rollover, audit |
| **KEPSEK / WAKEPSEK**                       | Dashboard eksekutif, pengawasan akademik & ujian, rekap                                                 |
| **OPERATOR**                                | Data induk siswa/guru/staf, impor Excel, undangan user, verifikasi PPDB                                 |
| **KEUANGAN**                                | Tagihan & pembayaran, rekap, payroll run & slip                                                         |
| **GURU / GURU_BK**                          | Kelas, materi, tugas, kuis, ujian, absensi QR, penilaian, konseling                                     |
| **SISWA**                                   | Kelas, materi, tugas, kuis, ujian online, nilai, absensi, kalender                                      |
| **WALI_MURID**                              | Portal read-only: nilai, absensi, tagihan anak                                                          |
| **CALON_SISWA**                             | Pendaftaran PPDB & cek status                                                                           |
| **PEMBIMBING_INDUSTRI / PENGUJI_EKSTERNAL** | Penilaian PKL/UKK (modul SMK)                                                                           |

## Dokumentasi API

- **Kontrak API lengkap**: [docs/04-api-contract.md](docs/04-api-contract.md) — format error standar, RBAC matrix, contoh payload.
- **Kontrak per modul**: `apps/api/src/modules/<modul>/README.<modul>.md` — endpoint, permission, dan deskripsi per modul (contoh: [auth](apps/api/src/modules/auth/README.auth.md), [lms](apps/api/src/modules/lms/README.lms.md), [exam](apps/api/src/modules/exam/README.exam.md), [finance](apps/api/src/modules/finance/README.finance.md), [payroll](apps/api/src/modules/payroll/README.payroll.md), [asset](apps/api/src/modules/asset/README.asset.md), [ppdb](apps/api/src/modules/ppdb/README.ppdb.md), [attendance](apps/api/src/modules/attendance/README.attendance.md)).
- **Struktur API**: [apps/api/src/README.api-src.md](apps/api/src/README.api-src.md).

## Deployment

Panduan lengkap: [deploy/README.deploy.md](deploy/README.deploy.md).

1. **Siapkan infrastruktur**: PostgreSQL 16 (wajib) dan Redis (opsional) — `docker compose up -d` / `docker compose --profile full up -d`.
2. **Build & jalankan aplikasi**: `npm ci`, `npm run build`, lalu jalankan API (`:3001`) dan Web (`:3000`) sebagai service (systemd/PM2/docker). Catatan: Dockerfile aplikasi belum tersedia (lihat [prd05 G-62](docs/prd/prd05-development.md)); service `api`/`web` di `docker-compose.yml` dikomentari sampai Dockerfile dibuat.
3. **Pasang reverse proxy**:

   ```bash
   cp deploy/nginx.conf /etc/nginx/conf.d/openlms.conf
   nginx -t
   systemctl reload nginx
   ```

   File ini mengatur: rate limit per-IP (API & login), security headers, gzip, cache immutable `/_next/static`, dan proxy WebSocket `/socket.io/` + `/ws`.

4. **TLS**: tambahkan blok `:443` (mis. certbot) dan set `COOKIE_SECURE=true`; tambahkan `Strict-Transport-Security` di blok HTTPS.
5. **(Opsional) Redis untuk BullMQ**: `docker compose --profile full up -d redis` — tanpa `REDIS_URL`, `QueueModule` memakai in-process fallback (single-instance).

## Keamanan

Praktik keamanan yang diterapkan di proyek (detail: [docs/02-technical-architecture.md §13](docs/02-technical-architecture.md)):

- **Auth in-house**: Argon2id untuk hash password; JWT di httpOnly cookie; refresh rotation; role di-resolve dari tabel `UserRole` (bukan dari JWT) — perubahan role instan.
- **RBAC fail-closed**: `AuthGuard` global → `PermissionsGuard` (`@RequirePermission`, scope SENDIRI/KELAS/SEKOLAH) → `FeatureFlagGuard`. Fitur OFF ditolak di API, bukan hanya disembunyikan di UI.
- **Anti-impersonation**: aktor dibaca dari `request.requestContext`, bukan header klien.
- **Helmet** aktif di `main.ts`; CORS dibatasi `CORS_ORIGINS`; cookie `SameSite=Lax`.
- **Rate limiting** login & API + security headers di Nginx (`deploy/nginx.conf`); aplikasi juga menegakkan rate limit per-IP/identitas (`RATE_LIMIT_*`).
- **Audit trail**: `AuditLog` untuk perubahan data sensitif (nilai, absensi, pembayaran, data siswa).
- **Storage lokal** (tanpa S3) dengan bucket per jenis dokumen dan akses berbasis RBAC scope.
- **Jangan pernah commit `.env`** (lihat `.gitignore` + `.gitleaks.toml`); ganti semua secret placeholder sebelum production.

Lihat [SECURITY.md](SECURITY.md) untuk kebijakan keamanan dan cara melaporkan kerentanan.

## Pengujian

```bash
npm run lint              # ESLint semua workspace
npm run typecheck         # TypeScript --noEmit semua workspace
npm run test:unit         # unit test
npm run test:integration  # integration test (butuh PostgreSQL)
npm run audit             # npm audit --audit-level=high
```

Pipeline CI (`.github/workflows/ci.yml`) menjalankan: lint → typecheck → unit → integration (dengan service PostgreSQL) → build → npm audit, pada setiap push ke `main` dan pull request. Panduan berkontribusi: [CONTRIBUTING.md](CONTRIBUTING.md).

## Perintah Umum (root)

| Perintah                                                         | Fungsi                                |
| ---------------------------------------------------------------- | ------------------------------------- |
| `npm run dev`                                                    | Turbo dev (semua workspace)           |
| `npm run build`                                                  | Build semua workspace                 |
| `npm run lint`                                                   | ESLint semua workspace                |
| `npm run typecheck`                                              | TypeScript `--noEmit` semua workspace |
| `npm run test:unit`                                              | Unit test                             |
| `npm run test:integration`                                       | Integration test (butuh PostgreSQL)   |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:validate` | Prisma (via `@openlms/database`)      |
| `npm run audit`                                                  | `npm audit` dengan ambang high        |

## Dokumentasi

- `docs/01-master-prd.md` … `docs/07-ux-design.md` — PRD, arsitektur, ERD, kontrak API, rencana implementasi, riset, desain UX.
- `docs/prd/prd01.md` … `docs/prd/prd05-development.md` — PRD terpisah (produk & development roadmap).
- `docs/riview/` — laporan review berkala.
- `apps/api/src/modules/*/README.<modul>.md` — kontrak endpoint per modul.
- Indeks dokumen: [docs/README.docs.md](docs/README.docs.md).

## Lisensi

Distributed under the [MIT License](LICENSE).
