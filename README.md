# opensis

**Super-app LMS + SIS untuk satu sekolah SMA/SMK Indonesia.** Satu platform, satu akun, satu sumber data untuk seluruh operasional sekolah — dengan fokus inti yang tidak bisa ditawar: belajar dan mengajar (LMS).

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-2140%2B-brightgreen)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933)
![License](https://img.shields.io/badge/license-MIT-blue)

> **Catatan rebranding:** proyek ini sebelumnya bernama _openlms_ (LMS+SIS) dan telah direbrand menjadi **opensis** — super-app manajemen sekolah penuh (LMS, SIS, keuangan, payroll, aset, PPDB). Paket npm, konstanta kode, cookie, dan storage keys memakai prefix `opensis`. Referensi `openlms` yang tersisa di `docs/` (PRD, review, arsitektur awal) adalah catatan sejarah.
>
> Lencana di atas adalah placeholder statis — ganti dengan lencana status pipeline CI yang sesungguhnya bila workflow sudah disambungkan ke badge service. Pipeline CI berjalan pada setiap push ke `main` dan pull request (lihat `.github/workflows/ci.yml`).

---

## Daftar Isi

- [Tentang](#tentang)
- [Fitur Utama](#fitur-utama)
- [Tangkapan Layar](#tangkapan-layar)
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
- [Roadmap](#roadmap)
- [Lisensi](#lisensi)

---

## Tentang

**opensis adalah super-app untuk SMA/SMK/sederajat Indonesia**: satu platform, satu akun, satu sumber data untuk seluruh operasional sekolah — dengan fokus inti yang tidak bisa ditawar: **belajar & mengajar (LMS)** [docs/prd/prd04.md §1](docs/prd/prd04.md).

- **Inti = LMS.** Kelas, materi, tugas, submission, kuis, bank soal, ujian online, penilaian, absensi, dan kalender adalah jantung produk.
- **Super-app, bukan kumpulan modul.** Satu login, satu navigasi per peran, satu sumber data yang saling terhubung: nilai → rapor → portal wali murid → keuangan → payroll.
- **Single-school.** Aplikasi dijalankan untuk **satu sekolah** — tanpa multi-tenant, tanpa pemisahan data antar-sekolah [docs/02-technical-architecture.md §16 ADR-001](docs/02-technical-architecture.md).
- **RBAC penuh.** 14 role standar, kontrol akses per permission `resource:action:scope` (SENDIRI/KELAS/SEKOLAH), hierarki role, dan konfigurasi RBAC oleh SUPERADMIN.
- **Selaras regulasi Indonesia.** Kurikulum Merdeka (CP/ATP/P5), e-Rapor dua-track (roadmap), PPh 21 skema TER & BPJS, dan ekspor Dapodik berbasis file (roadmap).
- **Ringan, cepat, hemat kuota.** Dirancang untuk koneksi 4G/sinyal lemah dan kuota terbatas siswa; mode hemat data + autosave offline untuk ujian dan absensi QR.
- **Kustomisasi fitur.** Setiap modul dan sub-fitur punya saklar on/off (feature flags) yang dikendalikan SUPERADMIN.
- **Tanpa dependensi API pihak ketiga untuk fitur.** Seluruh fitur diimplementasikan in-house; infrastruktur (DB, Redis) boleh managed dan swappable.

**Mengapa opensis?** Sekolah menengah di Indonesia tidak butuh tumpukan aplikasi terpisah (LMS dari vendor A, SIS dari vendor B, keuangan dari vendor C) yang datanya tidak saling bicara. opensis menggabungkan semuanya dalam satu aplikasi, satu akun, satu database — dengan biaya operasional yang masuk akal untuk skala satu sekolah (500–3.000 pengguna) dan dirancang untuk jaringan terbatas.

## Fitur Utama

| Area                      | Status  | Cakupan                                                                                                                                                                                                                                               |
| ------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LMS (inti)**            | Aktif   | Kelas, materi, tugas & submission, kuis & bank soal, ujian online (token sesi, autosave idempotent, auto-submit server-side), penilaian, absensi (manual/QR/izin)                                                                                     |
| **SIS**                   | Aktif   | Data induk siswa/guru/staf, kelas & rombel, jadwal, impor Excel, undangan user                                                                                                                                                                        |
| **Keuangan**              | Aktif   | Tagihan (SPP dkk.), pembayaran & alokasi cicilan, denda, refund, rekonsiliasi bank (CSV), arus kas                                                                                                                                                    |
| **Payroll**               | Aktif   | Run payroll bulanan (hitung → validasi → approve keuangan → rekap → approve kepsek), komponen gaji, slip digital, PPh 21 TER & BPJS                                                                                                                   |
| **Aset**                  | Aktif   | Inventaris, peminjaman (cek bentrok jadwal), penyusutan, pemeliharaan, opname                                                                                                                                                                         |
| **PPDB**                  | Aktif   | Pendaftaran publik tanpa login, upload dokumen, tracking status, verifikasi, seleksi/waitlist, enroll ke kelas                                                                                                                                        |
| **Absensi**               | Aktif   | Manual bulk idempotent, sesi QR + token sekali pakai, geofencing, izin/sakit online + verifikasi, rekap & dashboard kedisiplinan                                                                                                                      |
| **e-Rapor**               | Roadmap | Konsolidasi nilai → rapor dua-track Kurikulum Merdeka (mapel + P5) [prd05 G-49](docs/prd/prd05.md)                                                                                                                                                    |
| **Branding config**       | Aktif   | Identitas visual sekolah (nama, logo, warna) dikelola via API + UI SUPERADMIN                                                                                                                                                                         |
| **RBAC configurable**     | Aktif   | CRUD permission/role per SUPERADMIN (`/superadmin/rbac`)                                                                                                                                                                                              |
| **Maintenance mode**      | Aktif   | Mode pemeliharaan global dikontrol SUPERADMIN (`system:maintenance:write`)                                                                                                                                                                            |
| **Landing CMS**           | Aktif   | 10 halaman mandiri + berita (home & berita + tentang, program keahlian, fasilitas, ekstrakurikuler, prestasi, galeri, testimoni, faq, kontak) dengan design system v2 — data per halaman via modul API `public-content` (12 endpoint GET `/public/*`) |
| **UI aplikasi**           | Aktif   | App Design System v3 (shadcn/ui) — 53 halaman role diredesain: AppShell v2, `components/ui` (12 komponen shared), login split-screen, token additif v3                                                                                                |
| **Portal wali murid**     | Aktif   | Read-only: nilai, absensi, tagihan anak                                                                                                                                                                                                               |
| **Realtime**              | Aktif   | Socket.IO namespace `/ws` — notifikasi, event ujian (`exam:force-submit`, `exam:tick`), pengumuman; Redis adapter untuk multi-instance                                                                                                                |
| **Rollover tahun ajaran** | Aktif   | Preview/execute/rollback tutup tahun ajaran (draft → pre-check → dry-run → execute → rollback)                                                                                                                                                        |

## Tangkapan Layar

> **TODO:** Tambahkan tangkapan layar aplikasi di bawah ini. Gunakan gambar dari environment staging (bukan production) dan pastikan tidak menampilkan data pribadi siswa/guru.

<!--
| Halaman | Preview |
| ------- | ------- |
| Dashboard siswa | ![Dashboard siswa](docs/screenshots/dashboard-siswa.png) |
| Ujian online | ![Ujian online](docs/screenshots/ujian-online.png) |
| Keuangan (tagihan & pembayaran) | ![Keuangan](docs/screenshots/keuangan.png) |
| Portal wali murid | ![Portal wali](docs/screenshots/portal-wali.png) |
| Landing page | ![Landing](docs/screenshots/landing.png) |
-->

## Teknologi

| Komponen           | Path                | Teknologi                                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API                | `apps/api`          | NestJS 11, REST prefix `/api/v1`, Socket.IO namespace `/ws`, Prisma                                                                                                                                                                                                                        |
| Web                | `apps/web`          | Next.js App Router, Tailwind CSS v4, shadcn/ui, **App Design System v3** (AppShell v2, `components/ui` 12 ekspor), hook `useApi`/`useAsyncData` (client data fetching), React Context, localStorage/sessionStorage (offline queue)                                                         |
| Database           | `packages/database` | Prisma + PostgreSQL (skema tunggal, single-school)                                                                                                                                                                                                                                         |
| UI kit             | `packages/ui`       | Komponen shared (shadcn/ui primitives)                                                                                                                                                                                                                                                     |
| Types              | `packages/types`    | Enum & tipe bersama (satu sumber kebenaran)                                                                                                                                                                                                                                                |
| Orchestrasi        | root                | Turborepo, npm workspaces, Node.js ≥ 20                                                                                                                                                                                                                                                    |
| Antrean (opsional) | `apps/api`          | BullMQ via Redis (`REDIS_URL`); fallback in-process tanpa Redis                                                                                                                                                                                                                            |
| Testing            | API / Web           | Jest + Supertest (API); Vitest + Testing Library (web); Playwright (E2E, scaffold). Angka terverifikasi: API unit **2.140** (100 suite) + integration **10** + public-content **20**; web Vitest **99** — catatan eksekusi 2026-08-10 ([docs/riview/riview05.md](docs/riview/riview05.md)) |
| Reverse proxy      | `deploy/nginx.conf` | Nginx — rate limit, security headers, gzip, WebSocket                                                                                                                                                                                                                                      |

## Arsitektur

```
                        ┌──────────────────────────────────────────────┐
                        │                apps/web (Next.js)            │
                        │  Route groups: (siswa) (guru) (admin) (ortu) │
                        │  (superadmin) (ppdb) (landing) (auth)        │
                        │  (calonsiswa) (pembimbing) (penguji)         │
                        │  Server Components + Client Components       │
                        │  useApi/useAsyncData · React Context ·       │
                        │  localStorage/sessionStorage (offline queue) │
                        └───────┬───────────────────────┬──────────────┘
                                │ HTTPS (REST /api/v1)  │ WSS (Socket.IO)
                                │ (JWT httpOnly cookie) │ namespace /ws
                                ▼                       ▼
        ┌───────────────────────────────────────────────────────────────┐
        │                      apps/api (NestJS)                         │
        │  JWT middleware → RBAC guard → Controller → Service → Repo    │
        │  Guard: @RequirePermission + scope SENDIRI/KELAS/SEKOLAH      │
        │  Rate limiter · Request ID · pino · AuditLog · Helmet         │
        │  34 modul domain (auth, lms, quiz, exam, finance, payroll,    │
        │  asset, ppdb, attendance, smk, parent-portal, rollover,       │
        │  public-content, metrics, dll.)                               │
        └──────┬──────────────┬──────────────┬──────────────┬───────────┘
               │              │              │              │
        ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼──────┐ ┌─────▼──────────┐
        │ PostgreSQL │ │ Redis      │ │ Storage     │ │ Queue (BullMQ) │
        │ skema      │ │ (opsional) │ │ lokal       │ │ (opsional)     │
        │ tunggal,   │ │ cache/rate │ │ STORAGE_    │ │ in-process     │
        │ RLS ops.   │ │ lock/socket│ │ LOCAL_DIR   │ │ fallback       │
        └────────────┘ └────────────┘ └─────────────┘ └────────────────┘
```

**Alur request production:** Nginx → `apps/web` (:3000) untuk halaman → `apps/api` (:3001) untuk REST `/api/v1` dan Socket.IO `/ws`. Konfigurasi lengkap di [`deploy/nginx.conf`](deploy/nginx.conf) (gzip, security headers, rate limiting login/API, cache immutable `/_next/static`, proxy WebSocket). Alur request per-request di API:

```
HTTP request
  → JWT middleware (verify JWT in-house, resolve UserRole, build RequestContext)
  → Rate limiter (login/ujian/scan QR lebih ketat)
  → Global guard RBAC (@RequirePermission + scope, @Public)
  → Controller → Service → Repository (filter scope SENDIRI/KELAS/SEKOLAH)
  → Response + requestId + audit log (jika sensitif)
```

Diagram detail dan alur data ujian online: [docs/02-technical-architecture.md §15](docs/02-technical-architecture.md).

**Catatan arsitektur 2026-08-10:** API kini **34 modul** — tambah `public-content` (12 endpoint publik `GET /public/*`, `@Public()` + cache 300s, [README.public-content.md](apps/api/src/modules/public-content/README.public-content.md)) dan `metrics` (`GET /metrics`, SUPERADMIN, [README.metrics.md](apps/api/src/modules/metrics/README.metrics.md)). Frontend memakai **App Design System v3** (AppShell v2 + `components/ui` 12 ekspor) untuk halaman role dan **Landing v2** (10 halaman mandiri) untuk publik — [docs/app-design-system-v3.md](docs/app-design-system-v3.md), [docs/landing-design-v2.md](docs/landing-design-v2.md).

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

### Menjalankan Aplikasi dengan Docker (split mode: DEV infra-only, PROD full-stack)

Docker Compose dipakai **split mode**:

- **DEV (default)** — `docker compose up -d` menjalankan HANYA infra di
  container (postgres, redis, nginx). Aplikasi (`apps/api` + `apps/web`)
  dijalankan di HOST via `npm run dev`; nginx mem-proxy ke app di host lewat
  `host.docker.internal` (`deploy/nginx.dev.conf`).
- **PROD** — overlay `docker-compose.prod.yml` menambah service `api` + `web`
  di container dan mengalihkan nginx ke `deploy/nginx.docker.conf`
  (upstream `web:3000` / `api:3001`).

Prasyarat: Docker Engine + Docker Compose v2.

**Mode DEV (ringan — infra Docker, app di host):**

```bash
# 1. Environment — salin lalu isi secret (JWT, POSTGRES_PASSWORD, dll)
cp .env.example .env

# 2. Start infra: postgres + redis + nginx (3 service)
docker compose up -d

# 3. Jalankan aplikasi di HOST (Turbo dev: api :3001 + web :3000)
npm run dev

# 4. Migrasi + seed dari HOST (postgres terekspos di localhost:5432)
npm run db:migrate:deploy
npm run db:seed
```

**Mode PROD (full-stack, 5 service di container):**

```bash
# 1. Environment — isi secret production (JWT acak, CORS asli, COOKIE_SECURE=true)
cp .env.example .env

# 2. Build image & jalankan semua service (overlay)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3. Migrasi + seed dari HOST (pastikan DATABASE_URL di .env menunjuk localhost:5432)
npm run db:migrate:deploy
npm run db:seed

# 4. Cek status & log
docker compose ps
docker compose logs -f api web nginx
```

Akses aplikasi di **http://localhost** (Nginx :80). Resource limits DEV/PROD
diringkas di [deploy/README.deploy.md](deploy/README.deploy.md): DEV — postgres
1 CPU/512 MB, redis 0,25/128 MB, nginx 0,25/128 MB (app di host); PROD — api
2 CPU/1 GB, web 1 CPU/768 MB, nginx 0,5/256 MB. Storage unggahan: DEV di host
(`STORAGE_LOCAL_DIR=./storage`); PROD di volume `opensis-storage`
(`/app/storage`, terpisah dari container).

Detail prasyarat, alur pertama kali, dan troubleshooting: [deploy/README.deploy.md](deploy/README.deploy.md).

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
| `NEXT_PUBLIC_APP_NAME`                                             | Tidak    | Nama aplikasi runtime (override branding default)                 |
| `PORT`                                                             | Tidak    | Default `3000` (web); konvensi production API di `3001`           |
| `STORAGE_LOCAL_DIR`                                                | Tidak    | Direktori upload lokal (default `./storage`)                      |
| `LOG_LEVEL`                                                        | Tidak    | Level log pino (default `info`)                                   |
| `CACHE_TTL_MS`                                                     | Tidak    | TTL cache in-memory (default `30000`)                             |
| `RATE_LIMIT_*`                                                     | Tidak    | Ambang rate limiting per-IP/identitas/login/refresh               |
| `TRUST_PROXY`                                                      | Tidak    | `true` bila API di belakang reverse proxy (Nginx)                 |

> **Storage: LOKAL saja — S3/MinIO TIDAK dipakai.** Semua unggahan (branding, avatar, materi) disimpan di filesystem backend lewat `STORAGE_LOCAL_DIR`. Tidak ada variabel `S3_*` maupun layanan object storage di seluruh repo — jangan menambahkan dependensi object storage tanpa persetujuan arsitek [docs/02-technical-architecture.md §8](docs/02-technical-architecture.md).

## Struktur Proyek

```
opensis/
├── apps/
│   ├── api/                    # NestJS backend (REST + Socket.IO gateway)
│   │   ├── src/common/         # guard, middleware, interceptor, filter
│   │   └── src/modules/        # 34 modul domain + README.<modul>.md (termasuk public-content, metrics)
│   └── web/                    # Next.js App Router (frontend)
│       ├── src/app/            # 11 route group per role & halaman publik (64 page.tsx: 11 landing + 53 role/publik)
│       └── src/components/     # komponen shared web; components/ui (FE v3): 12 ekspor App Design System v3
├── packages/
│   ├── database/               # Prisma schema (90 model), migrasi, seed, RLS opsional
│   ├── ui/                     # komponen shared (shadcn/ui)
│   └── types/                  # enum & tipe bersama
├── deploy/
│   ├── nginx.conf              # reverse proxy production (host)
│   ├── nginx.docker.conf       # reverse proxy PROD container (web:3000/api:3001)
│   ├── nginx.dev.conf          # reverse proxy DEV (host.docker.internal)
│   └── README.deploy.md        # panduan deployment (mode DEV & PROD)
│
│   # docker-compose.yml (DEV infra-only) + docker-compose.prod.yml (overlay PROD) di root
├── docs/                       # PRD, arsitektur, ERD, kontrak API, riset, UX, KB
│   ├── 01-master-prd.md … 08-knowledge-base.md
│   ├── landing-design-v2.md    # design system Landing v2 (10 halaman mandiri)
│   ├── app-design-system-v3.md # design system FE aplikasi v3 (AppShell v2, components/ui)
│   └── prd/                    # prd01–prd07
├── .github/
│   ├── workflows/ci.yml        # 7 gate: lint → typecheck → unit → integration → build → audit → secret scan
│   └── ISSUE_TEMPLATE/         # template issue & PR
├── .gitleaks.toml              # konfigurasi secret scanning
├── turbo.json
└── package.json
```

## Sistem Role & RBAC

**14 role standar** (keputusan RBAC [docs/prd/prd04.md §3.1](docs/prd/prd04.md), diperbarui per 2026-08-08: role BK, tambah `KAPRODI` & `AUDITOR` — sumber: `packages/database/prisma/schema.prisma` enum `Role`). Role adalah kumpulan **permission**, bukan sekadar label; wali kelas bukan role tersendiri melainkan scope override lewat `Class.homeroom_teacher_id`.

| #   | Role                    | Deskripsi                                                                                                                                          | Scope default   |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | **SUPERADMIN**          | Admin sistem aplikasi sekolah — pengaturan, feature flags, RBAC, manajemen user, audit                                                             | SEKOLAH         |
| 2   | **KEPSEK**              | Kepala sekolah — dashboard eksekutif, laporan, rekap payroll                                                                                       | SEKOLAH         |
| 3   | **AUDITOR**             | Tim audit sekolah — akses read-only luas: audit log, data siswa/nilai/keuangan/payroll/absensi/staf/aset, riwayat rollover; tanpa permission tulis | SEKOLAH         |
| 4   | **WAKEPSEK**            | Wakil kepala sekolah (kurikulum/kesiswaan) — pengawasan akademik & ujian                                                                           | SEKOLAH         |
| 5   | **KAPRODI**             | Kepala Program Keahlian SMK — baca kurikulum/jadwal/prodi, rekap nilai & rapor program, rekap absensi, disiplin, PKL & UKK                         | SEKOLAH / KELAS |
| 6   | **OPERATOR**            | Staf administrasi/TU — data induk, impor, undangan, verifikasi PPDB, surat                                                                         | SEKOLAH         |
| 7   | **KEUANGAN**            | Staf keuangan — tagihan, pembayaran, denda, refund, rekonsiliasi, payroll                                                                          | SEKOLAH         |
| 8   | **GURU**                | Pengajar mapel — materi, tugas, kuis, ujian, absensi, penilaian                                                                                    | KELAS           |
| 9   | **BK**                  | Guru bimbingan konseling — catatan konseling (field-level), kedisiplinan                                                                           | SEKOLAH / KELAS |
| 10  | **SISWA**               | Peserta didik — materi, tugas, kuis, ujian, absensi, nilai, jadwal                                                                                 | SENDIRI + KELAS |
| 11  | **WALI_MURID**          | Orang tua/wali — portal read-only: nilai, absensi, tagihan anak                                                                                    | SENDIRI         |
| 12  | **CALON_SISWA**         | Pendaftar PPDB — formulir, upload dokumen, cek status                                                                                              | SENDIRI         |
| 13  | **PEMBIMBING_INDUSTRI** | Pembimbing PKL dari DUDI — jurnal PKL siswa bimbingan                                                                                              | SENDIRI         |
| 14  | **PENGUJI_EKSTERNAL**   | Penguji UKK dari industri — penilaian rubrik kompetensi                                                                                            | SENDIRI         |

**Model RBAC** — tiga dimensi kontrol akses [docs/02-technical-architecture.md §4](docs/02-technical-architecture.md):

1. **Permission-based**: aksi dikendalikan izin `resource:action[:scope]` (contoh: `payroll:read:school`, `grade:write:class`, `payslip:read:self`).
2. **Role hierarchy**: role mewarisi permission dari hierarki; permission tambahan/dibatalkan via `RolePermission` dan `UserPermissionOverride`.
3. **Scope**: batas data — **SENDIRI**, **KELAS**, atau **SEKOLAH**.

Otoritas role adalah tabel `UserRole` (bukan klaim JWT), sehingga perubahan role berlaku instan. SUPERADMIN dapat mengelola permission per role via UI `/superadmin/rbac`. Detail lengkap: [docs/04-api-contract.md §4](docs/04-api-contract.md) dan [docs/02-technical-architecture.md §4.3–4.5](docs/02-technical-architecture.md).

### Fitur Utama per Role

| Role                                        | Fitur utama di aplikasi                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **SUPERADMIN**                              | Admin sistem, feature flags, RBAC, branding, landing CMS, onboarding, maintenance mode, rollover, audit |
| **KEPSEK / WAKEPSEK**                       | Dashboard eksekutif, pengawasan akademik & ujian, rekap                                                 |
| **AUDITOR**                                 | Akses read-only luas: audit log, data siswa/nilai/keuangan/payroll/absensi/staf/aset, riwayat rollover  |
| **KAPRODI**                                 | Baca kurikulum/jadwal/prodi, rekap nilai & rapor program, rekap absensi, disiplin, PKL & UKK            |
| **OPERATOR**                                | Data induk siswa/guru/staf, impor Excel, undangan user, verifikasi PPDB                                 |
| **KEUANGAN**                                | Tagihan & pembayaran, rekap, payroll run & slip                                                         |
| **GURU / BK**                               | Kelas, materi, tugas, kuis, ujian, absensi QR, penilaian, konseling                                     |
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

### Opsi A — Docker Compose (split mode: DEV infra-only / PROD full-stack)

Prasyarat: Docker Engine + Compose v2, dan file `.env` hasil `cp .env.example .env`.

**A.1 — Mode DEV (ringan, direkomendasikan untuk pengembangan):** infra di
container, aplikasi di host.

```bash
# Infra saja: postgres + redis + nginx (3 service)
docker compose up -d

# Aplikasi di HOST (api :3001 + web :3000)
npm run dev

# Migrasi & seed dari host (postgres terekspos di localhost:5432)
npm run db:migrate:deploy
npm run db:seed
```

**A.2 — Mode PROD (full-stack, 5 service di container):**

```bash
# Build + start semua service (overlay prod menambah api + web)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Migrasi & seed dari host
npm run db:migrate:deploy
npm run db:seed

# Log
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api web nginx
```

Akses: **http://localhost** (Nginx :80). DEV memuat `deploy/nginx.dev.conf`
(upstream `host.docker.internal:3000/:3001`); PROD memuat
`deploy/nginx.docker.conf` (upstream `web:3000` / `api:3001`). Keduanya:
rate limit per-IP API & login, security headers, gzip, cache immutable
`/_next/static`, proxy WebSocket `/socket.io/` + `/ws` (versi dev menambah
`/_nginx_health` untuk healthcheck). Resource limits DEV/PROD:
[deploy/README.deploy.md](deploy/README.deploy.md).

### Opsi B — Host langsung + Nginx (tanpa Docker untuk aplikasi)

1. **Build & jalankan aplikasi**: `npm ci`, `npm run build`, lalu jalankan API (`:3001`) dan Web (`:3000`) sebagai service (systemd/PM2). PostgreSQL/Redis tetap bisa memakai `docker compose up -d postgres redis` (service pendukung tetap tersedia di compose).
2. **Pasang reverse proxy**:

   ```bash
   cp deploy/nginx.conf /etc/nginx/conf.d/opensis.conf
   nginx -t
   systemctl reload nginx
   ```

   File ini mengatur: rate limit per-IP (API & login), security headers, gzip, cache immutable `/_next/static`, dan proxy WebSocket `/socket.io/` + `/ws`.

3. **TLS**: tambahkan blok `:443` (mis. certbot) dan set `COOKIE_SECURE=true`; tambahkan `Strict-Transport-Security` di blok HTTPS.
4. **Redis untuk BullMQ**: `docker compose up -d redis` — tanpa `REDIS_URL`, `QueueModule` memakai in-process fallback (single-instance).

## Keamanan

Praktik keamanan yang diterapkan di proyek (detail: [docs/02-technical-architecture.md §13](docs/02-technical-architecture.md)):

- **Auth in-house**: Argon2id untuk hash password; JWT di httpOnly cookie; refresh rotation; role di-resolve dari tabel `UserRole` (bukan dari JWT) — perubahan role instan.
- **RBAC fail-closed**: `AuthGuard` global → `PermissionsGuard` (`@RequirePermission`, scope SENDIRI/KELAS/SEKOLAH) → `FeatureFlagGuard`. Fitur OFF ditolak di API, bukan hanya disembunyikan di UI.
- **Hardening putaran 5 (riview05)**: JWT canonical signature ditolak (base64url non-kanonik + `timingSafeEqual`, `jwt.util.ts:88-96`); RBAC scope enforcement di service (SEC-001/002/007); refresh token di-revoke saat ganti password; `COOKIE_SECURE` fail-fast di production (`main.ts:21-23`); audit failure logging (`lms-audit.ts:65,93`); mapping error Prisma P2002/P2025/P2003 (`all-exceptions.filter.ts:111-125`).
- **Anti-impersonation**: aktor dibaca dari `request.requestContext`, bukan header klien.
- **Helmet** aktif di `main.ts`; CORS dibatasi `CORS_ORIGINS`; cookie `SameSite=Lax`.
- **Rate limiting** login & API + security headers di Nginx (`deploy/nginx.conf`); aplikasi juga menegakkan rate limit per-IP/identitas (`RATE_LIMIT_*`) + brute-force lockout (5 gagal/15 menit).
- **Audit trail**: `AuditLog` untuk perubahan data sensitif (nilai, absensi, pembayaran, data siswa); endpoint baca `GET /admin/change-logs` (SUPERADMIN/KEPSEK).
- **Storage lokal** (tanpa S3) dengan bucket per jenis dokumen, validasi magic bytes/MIME, batas per-bucket, dan akses berbasis RBAC scope.
- **Jangan pernah commit `.env`** (lihat `.gitignore` + `.gitleaks.toml`); ganti semua secret placeholder sebelum production.

Lihat [SECURITY.md](SECURITY.md) untuk kebijakan keamanan dan cara melaporkan kerentanan.

## Pengujian

```bash
npm run lint              # ESLint semua workspace
npm run typecheck         # TypeScript --noEmit semua workspace
npm run test:unit         # unit test (tanpa database)
npm run test:integration  # integration test (butuh PostgreSQL)
npm run audit             # npm audit --audit-level=high
```

Status terkini: **API unit 2.140** (100 suite, 0 gagal), **web Vitest 99**, **integration 10**, **public-content 20** — catatan eksekusi orkestrator 2026-08-10 ([docs/riview/riview05.md](docs/riview/riview05.md), juga di [docs/08-knowledge-base.md §7.1](docs/08-knowledge-base.md)). Target roadmap **coverage ≥ 80%** dan **E2E Playwright di CI** masih terbuka ([docs/prd/prd06.md](docs/prd/prd06.md), [docs/prd/prd07.md](docs/prd/prd07.md)).

Pipeline CI (`.github/workflows/ci.yml`) menjalankan **7 gate**: lint → typecheck → unit → integration (dengan service PostgreSQL) → build → npm audit → secret scan (gitleaks), pada setiap push ke `main` dan pull request. Panduan berkontribusi: [CONTRIBUTING.md](CONTRIBUTING.md).

## Perintah Umum (root)

| Perintah                                                         | Fungsi                                |
| ---------------------------------------------------------------- | ------------------------------------- |
| `npm run dev`                                                    | Turbo dev (semua workspace)           |
| `npm run build`                                                  | Build semua workspace                 |
| `npm run lint`                                                   | ESLint semua workspace                |
| `npm run typecheck`                                              | TypeScript `--noEmit` semua workspace |
| `npm run test:unit`                                              | Unit test                             |
| `npm run test:integration`                                       | Integration test (butuh PostgreSQL)   |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:validate` | Prisma (via `@opensis/database`)      |
| `npm run audit`                                                  | `npm audit` dengan ambang high        |

## Dokumentasi

- `docs/01-master-prd.md` … `docs/08-knowledge-base.md` — PRD, arsitektur, ERD, kontrak API, rencana implementasi, riset, desain UX, basis pengetahuan.
- `docs/08-knowledge-base.md` — **Project Knowledge Base**: peta arsitektur, peta data, alur bisnis kritis, RBAC, realtime/queue/storage, status kesehatan.
- `docs/landing-design-v2.md` & `docs/app-design-system-v3.md` — design system Landing v2 (10 halaman mandiri) dan FE aplikasi v3 (AppShell v2 + `components/ui`).
- `docs/prd/prd01.md` … `docs/prd/prd07.md` — PRD terpisah (produk & development roadmap).
- `docs/riview/` — laporan review berkala (`riview01.md` … `riview05.md`).
- `apps/api/src/modules/*/README.<modul>.md` — kontrak endpoint per modul.
- Indeks dokumen: [docs/README.docs.md](docs/README.docs.md).

## Roadmap

Prioritas pengembangan (detail: [docs/prd/prd05.md](docs/prd/prd05.md) dan [docs/prd/prd06.md](docs/prd/prd06.md)):

- **Performa & kapasitas**: target 1.500–2.000 pengguna ujian bersamaan (load test k6, p95 autosave < 300 ms), optimasi autosave, indeks hot-path. **Selesai 2026-08-10:** indeks hot-path + dedupe token sesi ujian (migrasi `20260808000000_add_perf_indexes`, `20260809010000_exam_attempt_token_dedupe`, PERF-01/04/05/06).
- **Keamanan**: proteksi CSRF penuh, rate limit upload, sanitasi konten landing, gate `DEMO_MODE`. **Selesai 2026-08-10:** JWT canonical signature, RBAC scope enforcement, revoke refresh saat ganti password, COOKIE_SECURE fail-fast, audit failure logging (SEC-001/002/007, REL-*, CFG-02).
- **Integritas data**: idempotensi pembayaran, payroll PAID transaksional, rollback rollover PPDB. **Sebagian:** race payment verify & idempotensi rollover processor diperbaiki (REL-003/006/009); sisa roadmapped.
- **Fitur bisnis**: e-Rapor dua-track Kurikulum Merdeka, ekspor Dapodik. **Belum dimulai.**
- **Testing & kualitas**: kampanye 2.000+ test (tercapai: API 2.140 + web 99 + integration 10 + public-content 20), coverage ≥ 80% (**tersisa — gate belum aktif di CI**), E2E Playwright (**tersisa — scaffold `apps/web/e2e/` siap, belum di CI**), gate coverage di CI.
- **Ops/infra**: backup/restore & drill (RPO ≤ 24 jam / RTO ≤ 4 jam), observability lengkap (metrik, slow query, alerting). **Selesai 2026-08-10:** `deploy/scripts/backup.sh` + `restore.sh` + [deploy/BACKUP.md](deploy/BACKUP.md), `GET /metrics`, overlay staging [deploy/README.staging.md](deploy/README.staging.md). **Tersisa:** drill backup belum diverifikasi, staging belum live, slow query & alerting.

## Lisensi

Distributed under the [MIT License](LICENSE).
