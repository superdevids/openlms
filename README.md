# openlms

**LMS + SIS super-app untuk SATU sekolah (SMA/SMK Indonesia).** Monorepo Turborepo:
satu backend NestJS, satu frontend Next.js, dan paket bersama untuk database (Prisma),
UI, dan tipe.

> Rebrand dari `eclass` — semua paket kini memakai namespace `@openlms/*`.
> Jika masih ada referensi `eclass` di kode, laporkan ke tim (target nol referensi).

## Arsitektur

| Komponen | Path                | Teknologi                                                   |
| -------- | ------------------- | ----------------------------------------------------------- |
| API      | `apps/api`          | NestJS 11, REST prefix `/api/v1`, Socket.IO namespace `/ws` |
| Web      | `apps/web`          | Next.js App Router, Tailwind v4, shadcn/ui                  |
| Database | `packages/database` | Prisma + PostgreSQL (schema tunggal, single-school)         |
| UI       | `packages/ui`       | Komponen shared                                             |
| Types    | `packages/types`    | Tipe bersama                                                |

Alur request: Nginx → `apps/web` (:3000) / `apps/api` (:3001). Lihat
[`deploy/nginx.conf`](deploy/nginx.conf) untuk konfigurasi reverse-proxy production
(gzip, security headers, rate limiting login/API, cache immutable `/_next/static`,
WebSocket `/ws`).

## Quick start (development)

Prasyarat: Node.js ≥ 20 (rekomendasi 22), PostgreSQL ≥ 16.

```bash
npm install

# 1. Environment
cp .env.example .env        # lalu isi nilai (lihat tabel env di bawah)

# 2. Database
npm run db:generate         # prisma generate
npm run db:migrate          # prisma migrate dev
npm run db:seed             # seed data dev (idempotent)

# 3. Jalankan semua workspace (Turbo dev; port sesuai `PORT` di .env —
#    konvensi production: Web :3000, API :3001)
npm run dev
```

Setelah seed, login sebagai SUPERADMIN dev:

- Username: `admin`
- Password: `password` (hanya dev; `must_change_password=true` — ganti segera)

> `npm run db:seed` aman dijalankan berulang (idempotent).

## Daftar modul (apps/api)

Semua modul terdaftar di `apps/api/src/app.module.ts`:

| Kelompok            | Modul                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infrastruktur       | Health, Auth (guard global RBAC fail-closed), Realtime (Socket.IO `/ws`), Notifications, Storage (upload + signed URL), Branding (identitas visual), RbacAdmin (CRUD RBAC SUPERADMIN), Queue (BullMQ opsional), Jobs (processor + cron) |
| Pengaturan          | FeatureFlags, AppSettings, Onboarding (wizard 5 langkah + impor)                                                                                                                                                                        |
| Akademik & LMS      | Academic, Lms, Quiz, Exam, Attendance (manual/QR/izin)                                                                                                                                                                                  |
| Keuangan            | Finance (SPP/tagihan), Payroll (PPh 21/BPJS), Asset                                                                                                                                                                                     |
| Siklus & admisi     | Rollover (tahun ajaran), Ppdb                                                                                                                                                                                                           |
| Komunikasi & portal | Communication (pengumuman/surat), ParentPortal (wali murid), Alumni, Smk (PKL/UKK/DUDI)                                                                                                                                                 |

Halaman landing/publik (mis. PPDB) disajikan oleh `apps/web` pada route group
`(ppdb)`; identitas visual dikelola modul Branding + AppSettings di API.

## Redis & antrean (opsional)

- Tanpa `REDIS_URL` → `QueueModule` memakai **in-process fallback** (single-instance).
- Dengan `REDIS_URL` → BullMQ aktif (`@nestjs/bullmq`), job antre via Redis.
- Jalankan Redis dev: `docker compose --profile full up -d redis` (atau
  `docker compose up -d` tanpa profile bila tidak butuh Redis).
- Socket.IO siap multi-instance via Redis adapter (lihat
  `apps/api/README.registration.md`).

## Environment (lihat `.env.example`)

| Variabel                                                                                                | Wajib    | Keterangan                                         |
| ------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------- |
| `DATABASE_URL`                                                                                          | Ya       | URL PostgreSQL (Prisma)                            |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_INVITATION_SECRET`                                      | Ya       | Secret acak **32+ byte** di production             |
| `JWT_ACCESS_TTL_MINUTES`, `JWT_REFRESH_TTL_DAYS`, `JWT_INVITATION_TTL_DAYS`                             | Tidak    | TTL token                                          |
| `COOKIE_SECURE`                                                                                         | —        | `true` wajib saat HTTPS (production)               |
| `COOKIE_SAME_SITE`                                                                                      | Tidak    | `lax` (default)                                    |
| `CORS_ORIGINS`                                                                                          | Tidak    | Origin diizinkan (koma-pisah), REST + Socket.IO    |
| `LOG_LEVEL`                                                                                             | Tidak    | pino (default `info`)                              |
| `STORAGE_LOCAL_DIR`                                                                                     | Tidak    | Direktori upload lokal                             |
| `REDIS_URL`                                                                                             | Tidak    | Aktifkan BullMQ bila diisi                         |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_PREFIX`, `S3_REGION`, `S3_FORCE_PATH_STYLE` | Tidak    | Object storage self-managed (MinIO/S3, signed URL) |
| `NEXT_PUBLIC_API_BASE`                                                                                  | Ya (web) | Base URL API untuk `apps/web`                      |
| `PORT`                                                                                                  | Tidak    | Default `3000` (web); API production di `3001`     |

## Keamanan

- Auth in-house: Argon2id, JWT di httpOnly cookie, refresh rotation; role di-resolve
  dari tabel `UserRole` (bukan dari JWT) — perubahan role instan.
- RBAC fail-closed: `AuthGuard` global → `PermissionsGuard` (`@RequirePermission`,
  scope SENDIRI/KELAS/SEKOLAH) → `FeatureFlagGuard`.
- Helmet aktif di `main.ts`; CORS dibatasi `CORS_ORIGINS`.
- Anti-impersonation: aktor dibaca dari `request.requestContext`, bukan header klien.
- Jangan pernah commit `.env` (lihat `.gitignore` + `.gitleaks.toml`); ganti semua
  secret placeholder sebelum production.
- Rate limiting login & API + security headers di Nginx (`deploy/nginx.conf`).

## Deployment

1. Build & jalankan API (`:3001`) dan Web (`:3000`) sebagai service (systemd/PM2/docker).
2. Pasang reverse-proxy: `cp deploy/nginx.conf /etc/nginx/conf.d/openlms.conf && nginx -t && systemctl reload nginx`.
3. TLS: tambahkan blok `:443` (mis. certbot) dan set `COOKIE_SECURE=true`; tambahkan
   `Strict-Transport-Security` di blok HTTPS.
4. (Opsional) Redis untuk BullMQ: `docker compose --profile full up -d redis`.

## Perintah umum (root)

| Perintah                                                         | Fungsi                                |
| ---------------------------------------------------------------- | ------------------------------------- |
| `npm run dev`                                                    | Turbo dev (semua workspace)           |
| `npm run build`                                                  | Build semua workspace                 |
| `npm run lint`                                                   | ESLint semua workspace                |
| `npm run typecheck`                                              | TypeScript `--noEmit` semua workspace |
| `npm run test:unit`                                              | Unit test                             |
| `npm run test:integration`                                       | Integration test (butuh PostgreSQL)   |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:validate` | Prisma (via `@openlms/database`)      |

## Dokumentasi

- `docs/01-master-prd.md` … `docs/07-ux-design.md` — PRD, arsitektur, ERD, kontrak API, rencana implementasi.
- `apps/api/README.registration.md` + `apps/api/src/modules/*/README.registration.md` — kontrak registrasi modul.
- `docs/riview/` — laporan review berkala.
