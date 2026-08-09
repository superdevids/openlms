# README.staging.md — Staging (deploy/)

## Tujuan

Lingkungan **staging** adalah mirror produksi untuk verifikasi **sebelum go-live**
(prasyarat G-67): topologi service sama (5 service di container), konfigurasi
Nginx sama (`deploy/nginx.docker.conf` — rate limit, security headers, proxy
WebSocket), migrasi + seed nyata, dan alur smoke test utama (login SUPERADMIN,
feature flags, landing, PPDB, ujian). Perbedaannya hanya di **skala resource,
branding, dan mode cookie** — agar jelas ini bukan produksi.

## Beda Staging vs PROD

| Aspek              | PROD (overlay `prod`)               | STAGING (overlay `staging`)                                                                                                                                         |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resource `api`     | limit 2 CPU / 1 GB (res 1/512m)     | limit **1 CPU / 768m** (res 0,5/384m)                                                                                                                               |
| Resource `web`     | limit 1 CPU / 768m (res 0,5/384m)   | limit **0,5 CPU / 512m** (res 0,25/256m)                                                                                                                            |
| Resource `nginx`   | limit 0,5 CPU / 256m                | limit **0,25 CPU / 128m**                                                                                                                                           |
| Image tag          | default `opensis-api`/`opensis-web` | **`opensis-api:staging`** / `opensis-web:staging`                                                                                                                   |
| Branding           | `NEXT_PUBLIC_APP_NAME` dari `.env`  | **"opensis (Staging)"** (ter-bake saat build)                                                                                                                       |
| Cookie             | `COOKIE_SECURE=true` saat HTTPS     | **`COOKIE_SECURE=false`** (staging = HTTP)                                                                                                                          |
| CORS               | origin produksi asli                | **`http://localhost,http://localhost:80`**                                                                                                                          |
| Port ter-publish   | 80, 3000, 3001                      | **80 (app) + 5432/6379 (infra untuk migrasi/seed dari host)** — 3000/3001 TIDAK dipublish (staging hanya `!reset` port api/web; port infra tetap dari base compose) |
| `env_file` service | `.env`                              | **`.env.staging`** (terpisah dari prod)                                                                                                                             |

Selain itu staging **identik dengan prod**: Nginx memakai
`deploy/nginx.docker.conf` (upstream `web:3000` / `api:3001`), depends_on
berantai (postgres→redis→api→web→nginx), healthcheck sama, volume
`opensis-storage`, dan `NODE_ENV=production`.

## Mengapa Overlay Staging Dipakai BERSAMA Overlay PROD

Base (`docker-compose.yml`) **tidak punya service `api`/`web`** — hanya infra
(postgres, redis, nginx). Definisi `api`+`web` dan pengalihan nginx ke
`nginx.docker.conf` ada di overlay **prod**. Overlay **staging** ditumpuk
di atasnya untuk menimpa resource/branding/env sesuai tabel di atas.

Cara pakai (semua file di-root repo):

```bash
cp .env.example .env.staging          # isi secret staging (lihat di bawah)
docker compose -f docker-compose.yml \
             -f docker-compose.prod.yml \
             -f docker-compose.staging.yml \
             up -d --build
```

> Urutan overlay penting: **staging di urutan TERAKHIR** (nilainya yang
> menang). Overlay staging memakai tag YAML Compose `!override` (env_file) dan
> `!reset` (ports) — butuh **Docker Compose v2.24+** (v5.1.4 sudah mendukung).

Prasyarat lain: Docker Engine + Node ≥ 20 (untuk migrasi/seed dari host),
dan port 80 (nginx), 5432 (postgres), 6379 (redis) bebas di host — port
infra tetap dipublish dari base compose di staging (lihat tabel di atas).

## Setup Environment (.env.staging)

```bash
cp .env.example .env.staging
```

Lalu isi/ubah di `.env.staging`:

- **Secret wajib diisi** (jangan pakai nilai contoh): `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `JWT_INVITATION_SECRET` (32+ byte acak), dan
  `POSTGRES_PASSWORD`.
- **`COOKIE_SECURE` tidak perlu diubah** — overlay staging memaksa `false`
  (HTTP). Bila staging suatu saat diakses via HTTPS, set `true`.
- **`DATABASE_URL` (host)**: biarkan menunjuk `localhost:5432` — dipakai
  migrasi/seed **dari HOST**. Container `api` mendapat URL ke service
  `postgres:5432` dari overlay (bukan dari env file), jadi pastikan
  `DATABASE_URL` konsisten dengan nilai `POSTGRES_USER/PASSWORD/DB` di
  **root `.env`** (interpolasi compose memakai root `.env`).
- **Opsional — isolasi penuh**: supaya `POSTGRES_*` juga terpisah dari prod,
  jalankan semua perintah compose dengan `--env-file .env.staging`:
  `docker compose --env-file .env.staging -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml up -d --build`.
  Dalam mode ini `DATABASE_URL`/`POSTGRES_*` di `.env.staging` harus konsisten
  satu sama lain.

> ⚠️ **Keamanan**: `.env.staging` dan `.env.staging.*` sudah tercakup
> `.gitignore` (bagian Environment). Tetap jangan pernah `git add -f .env.staging`
> dan jangan commit secret apa pun.

## Migrasi + Seed (dari HOST)

```bash
# Pastikan DATABASE_URL di .env.staging menunjuk localhost:5432 (lihat di atas)
$env:DATABASE_URL = (Select-String -Path .env.staging -Pattern '^DATABASE_URL=').Line -replace '^DATABASE_URL="?', '' -replace '"$',''
npm run db:migrate:deploy
npm run db:seed
```

Atau set `DATABASE_URL` eksplisit dari nilai `.env.staging` sebelum menjalankan
`npm run db:migrate:deploy` / `npm run db:seed` (Prisma CLI hanya ada di
devDependencies — migrasi dijalankan dari host, bukan di container).

Seed idempotent (aman diulang). Setelah seed, container `api` membaca skema
yang sama lewat `postgres:5432` — tidak perlu restart bila hanya migrasi.

## Menjalankan & Memeriksa

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml ps     # 5 service healthy
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml logs -f api web nginx
```

Validasi sintaks tanpa menjalankan apa pun:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml config --quiet
```

Akses aplikasi: **http://localhost** (Nginx :80 → `web:3000` / `api:3001`).
Port 3000/3001 sengaja **tidak** dipublish di staging — semua akses lewat
Nginx, persis seperti produksi di belakang proxy.

## Checklist Verifikasi Staging

1. **Sintaks & status**: `docker compose ... config --quiet` exit 0;
   `docker compose ... ps` → 5 service `healthy`.
2. **Branding**: halaman landing menampilkan **"opensis (Staging)"**
   (bukan "opensis"); cek juga `docker compose ... logs api` untuk `CORS_ORIGINS`
   staging yang terbaca.
3. **Login SUPERADMIN**: login lewat http://localhost; pastikan cookie
   `opensis_session` **tanpa** flag `Secure` (DevTools → Application → Cookies);
   logout/login normal (refresh token path).
4. **Feature flags**: buka konsol feature flags sebagai SUPERADMIN; toggle
   sebuah flag, muat ulang halaman → perubahan berlaku (tanpa restart api).
5. **Landing**: `/` render konten landing; `GET /api/v1/public/landing` (via
   nginx) mengembalikan data; branding runtime (`/api/v1/app/branding`) ikut
   tampil (warna/logo).
6. **PPDB flow**: jalankan alur pendaftaran calon siswa end-to-end
   (publik → submit → verifikasi admin) sampai status diterima/ditolak.
7. **Ujian smoke**: buat jadwal ujian singkat, kerjakan satu soal, pastikan
   nilai/submission tersimpan.
8. **Observability**: `curl http://localhost/api/v1/health` →
   `{"status":"ok","service":"opensis-api"}`; `docker compose ... stats` untuk
   melihat pemakaian CPU/memori (staging: api ≤ 1 CPU/768m, web ≤ 0,5/512m).
   Endpoint metrik: `GET /api/v1/metrics` — dengan token SUPERADMIN
   (`Authorization: Bearer <token>`, permission `system:status:read`) → **200**,
   JSON metrik (uptime, memori, event loop lag); tanpa token atau role
   non-SUPERADMIN → **401/403**.

## Promosi ke PROD (langkah singkat)

1. **Siapkan env prod**: `cp .env.example .env` (atau env prod yang sudah ada);
   pastikan `JWT_*` acak, `POSTGRES_PASSWORD` kuat, `COOKIE_SECURE=true`,
   `CORS_ORIGINS` origin nyata, `NEXT_PUBLIC_APP_NAME` branding final.
2. **Jalankan overlay prod** (tanpa staging):
   `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.
3. **Migrasi + seed** dari host (`DATABASE_URL` → `localhost:5432`, konsisten
   dengan `POSTGRES_*`).
4. **Verifikasi ulang** checklist di atas di lingkungan prod (branding prod,
   cookie `Secure`, CORS prod).
5. **Nonaktifkan staging** agar tidak bersaing dengan prod di host yang sama
   (lihat peringatan di bawah).

## Catatan & Peringatan

- **Jangan jalankan staging dan prod/dev bersamaan di host yang sama**:
  semua service memakai `container_name` tetap (`opensis-api`, `opensis-web`,
  dll.) dan volume/network yang sama (`opensis-storage`, `opensis-net`) —
  `up` staging akan konflik. Gunakan host terpisah, atau `down` stack lain
  lebih dulu.
- **Staging = HTTP tanpa TLS**: jangan pernah mengisi staging dengan data
  produksi asli (PII siswa/siswa). Gunakan data dummy/seed.
- **`NEXT_PUBLIC_*` ter-bake saat build**: ubah branding/API base di overlay
  lalu `docker compose ... build web && docker compose ... up -d` (jangan hanya
  restart).
- **Validasi**: `docker compose exec nginx nginx -t` untuk memastikan
  konfigurasi Nginx staging valid.
