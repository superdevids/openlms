# README.deploy.md — Deployment (deploy/)

## Ringkasan

opensis memakai **Docker Compose split mode**:

- **DEV (default, ringan)** — `docker-compose.yml` menjalankan HANYA infra di
  container (PostgreSQL + Redis + Nginx). Aplikasi (`apps/api` + `apps/web`)
  dijalankan di **HOST** via `npm run dev`. Nginx di container mem-proxy ke app
  di host lewat `host.docker.internal` (`deploy/nginx.dev.conf` +
  `extra_hosts: host-gateway`).
- **PROD (full-stack)** — overlay `docker-compose.prod.yml` menambah service
  `api` + `web` (di container) dan mengalihkan nginx ke
  `deploy/nginx.docker.conf` (upstream `web:3000` / `api:3001`).

`deploy/nginx.conf` adalah versi host (tanpa Docker) — jangan diubah satu sama lain.

Storage file **lokal saja** (S3/MinIO tidak dipakai). DEV: `STORAGE_LOCAL_DIR`
relatif dari host (mis. `./storage`). PROD: volume Docker `opensis-storage`
di-mount ke `/app/storage` (`STORAGE_LOCAL_DIR=/app/storage`).

Backup & restore DB + storage: lihat [BACKUP.md](BACKUP.md) (skrip
`deploy/scripts/backup.sh` + `restore.sh`). Lingkungan staging (mirror prod,
overlay `docker-compose.staging.yml`): lihat [README.staging.md](README.staging.md).

## Struktur Folder

| File                            | Isi                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `nginx.conf`                    | Reverse proxy production versi host (upstream `127.0.0.1:3000/:3001`)                             |
| `nginx.docker.conf`             | Reverse proxy versi container PROD (upstream `web:3000` / `api:3001`)                             |
| `nginx.dev.conf`                | Reverse proxy DEV (upstream `host.docker.internal:3000/:3001`) + healthcheck `/_nginx_health`     |
| `scripts/backup.sh`             | Backup DB (pg_dump custom) + storage (tar.gz) ke `deploy/backups/` — lihat [BACKUP.md](BACKUP.md) |
| `scripts/restore.sh`            | Restore DB (`pg_restore --clean`) + storage, konfirmasi DESTRUKTIF — lihat [BACKUP.md](BACKUP.md) |
| `README.deploy.md`              | Panduan ini                                                                                       |
| `README.staging.md`             | Panduan lingkungan staging (overlay `docker-compose.staging.yml`)                                 |
| `BACKUP.md`                     | Panduan lengkap backup & restore (cron, manual, drill bulanan, RPO/RTO)                           |
| `../docker-compose.yml`         | Base DEV: postgres + redis + nginx (3 service)                                                    |
| `../docker-compose.prod.yml`    | Overlay PROD: + api + web + override nginx (5 service total)                                      |
| `../docker-compose.staging.yml` | Overlay STAGING: dipakai BERSAMA prod (resource/branding khusus, port 3000/3001 di-`!reset`)      |

## Tabel Service & Resource Limits

| Service    | Image                       | Port host | DEV (base)                               | PROD (overlay)                          |
| ---------- | --------------------------- | --------- | ---------------------------------------- | --------------------------------------- |
| `postgres` | `postgres:16-alpine`        | 5432      | limit 1 CPU / 512 MB (res 0,25 / 256 MB) | 1 CPU / 512 MB (sama)                   |
| `redis`    | `redis:7-alpine`            | 6379      | limit 0,25 / 128 MB (res 0,10 / 64 MB)   | 0,25 / 128 MB (sama)                    |
| `nginx`    | `nginx:1.27-alpine`         | 80        | limit 0,25 / 128 MB (res 0,10 / 64 MB)   | limit 0,5 / 256 MB (res 0,25 / 128 MB)  |
| `api`      | build `apps/api/Dockerfile` | 3001      | — (di host, `npm run dev`)               | limit 2 CPU / 1 GB (res 1 / 512 MB)     |
| `web`      | build `apps/web/Dockerfile` | 3000      | — (di host, `npm run dev`)               | limit 1 CPU / 768 MB (res 0,5 / 384 MB) |

Semua service container: `init: true`, logging json-file (max 10 MB × 3 file),
jaringan `opensis-net`. `stop_grace_period: 30s` khusus postgres (dev/prod).

## Mode DEV (infra Docker + app di host)

Prasyarat: Docker Engine + Docker Compose v2 + Node ≥ 20.

1. **Environment** — salin lalu isi nilai secret:

   ```bash
   cp .env.example .env
   ```

   `.env.example` sudah berisi nilai DEV yang benar: `DATABASE_URL`
   `localhost:5432`, `REDIS_URL` `localhost:6379`, `TRUST_PROXY=true`,
   `CORS_ORIGINS=http://localhost:3000,http://localhost,http://localhost:80`.
   Wajib diganti di production: `JWT_*` (acak 32+ byte) dan `POSTGRES_PASSWORD`.

2. **Start infra (3 service):**

   ```bash
   docker compose up -d
   ```

   `nginx` baru start setelah `postgres`/`redis` sehat (depends_on +
   healthcheck `/_nginx_health`).

3. **Jalankan aplikasi di HOST:**

   ```bash
   npm run dev        # Turbo dev: api :3001 + web :3000
   ```

4. **Migrasi & seed dari HOST** (postgres terekspos di `localhost:5432`):

   ```bash
   npm run db:migrate:deploy
   npm run db:seed
   ```

5. **Cek status:**

   ```bash
   docker compose ps              # 3 service "healthy"/"running"
   docker compose logs -f nginx
   ```

6. **Akses aplikasi:** http://localhost (Nginx :80 → `host.docker.internal`).
   API langsung: http://localhost:3001/api/v1/health.

## Mode PROD (full-stack, 5 service di container)

1. **Environment** — `cp .env.example .env`, lalu sesuaikan untuk production:
   `JWT_*` acak, `POSTGRES_PASSWORD` kuat, `CORS_ORIGINS` origin nyata,
   `COOKIE_SECURE=true` (HTTPS), dan opsional `NEXT_PUBLIC_*` (ter-bake saat build).

2. **Build & start semua service (overlay):**

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

   `api` baru start setelah `postgres`/`redis` sehat; `web` setelah `api` sehat;
   `nginx` setelah `web`/`api` sehat. Overlay menambahkan port `3001:3001`
   (api) dan `3000:3000` (web); port nginx `80:80` hanya didefinisikan di base
   (overlay TIDAK mengulang `ports` nginx — Compose men-append → duplikat).

3. **Migrasi & seed dari HOST:**

   ```bash
   # Pastikan DATABASE_URL di .env menunjuk localhost:5432 (lihat langkah DEV)
   npm run db:migrate:deploy
   npm run db:seed
   ```

   > `prisma` CLI hanya ada di devDependencies — migrasi dijalankan dari host,
   > bukan di dalam container API. Seed idempotent (aman diulang).

4. **Cek status:**

   ```bash
   docker compose ps              # 5 service "healthy"/"running"
   docker compose logs -f api web nginx
   ```

5. **Akses aplikasi:** http://localhost (Nginx :80 → `web:3000` / `api:3001`).

## Operasional Harian

| Kebutuhan           | Perintah (DEV)                                                                                                                                                    | Perintah (PROD)                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rebuild image       | — (aplikasi di host)                                                                                                                                              | `docker compose -f docker-compose.yml -f docker-compose.prod.yml build api web && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` |
| Lihat log           | `docker compose logs -f nginx`                                                                                                                                    | `docker compose logs -f api web nginx`                                                                                                                   |
| Restart service     | `docker compose restart <service>`                                                                                                                                | sama                                                                                                                                                     |
| Stop semua          | `docker compose down`                                                                                                                                             | sama                                                                                                                                                     |
| Stop + hapus volume | `docker compose down -v` (⚠️ menghapus data DB, Redis, dan storage)                                                                                               | sama                                                                                                                                                     |
| Migrasi skema baru  | `npm run db:migrate:deploy` (dari host)                                                                                                                           | sama                                                                                                                                                     |
| Akses DB (psql)     | `docker compose exec postgres psql -U postgres -d opensis`                                                                                                        | sama                                                                                                                                                     |
| Backup DB           | `docker compose exec postgres pg_dump -U postgres opensis > backup.sql`                                                                                           | sama                                                                                                                                                     |
| Restore DB          | `Get-Content backup.sql \| docker compose exec -T postgres psql -U postgres -d opensis`                                                                           | sama                                                                                                                                                     |
| Backup DB+storage   | `bash deploy/scripts/backup.sh` (→ `deploy/backups/`, retensi 14 hari) — panduan lengkap di [BACKUP.md](BACKUP.md)                                                | sama                                                                                                                                                     |
| Restore DB+storage  | `bash deploy/scripts/restore.sh --yes deploy/backups/opensis-db-<ts>.dump deploy/backups/opensis-storage-<ts>.tar.gz` (DESTRUKTIF — lihat [BACKUP.md](BACKUP.md)) | sama                                                                                                                                                     |
| Staging environment | Lihat [README.staging.md](README.staging.md) — `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml up -d --build`      | sama (host terpisah dari prod)                                                                                                                           |
| TLS (opsional)      | Nginx di balik proxy TLS + `COOKIE_SECURE=true`                                                                                                                   | sama                                                                                                                                                     |

## Troubleshooting

- **DEV: nginx unhealthy**
  Cek `docker compose logs nginx`. Pastikan app host benar-benar berjalan
  (`npm run dev`) dan port 3000/3001 terbuka; validasi konfigurasi:
  `docker compose exec nginx nginx -t`. Healthcheck memakai
  `/_nginx_health` (location khusus di `deploy/nginx.dev.conf`).

- **DEV: aplikasi tidak bisa diakses dari browser**
  `host.docker.internal` (Windows/macOS bawaan; Linux butuh `extra_hosts`
  `host-gateway` — sudah ada di compose). Cek app host: `curl http://localhost:3001/api/v1/health`.

- **`api` restart-loop / unhealthy (PROD)**
  Cek log: `docker compose logs api`. Umum: `DATABASE_URL` salah, koneksi
  ditolak (pastikan user/password/db cocok dengan `POSTGRES_*`), `CORS_ORIGINS`
  kosong, atau **`COOKIE_SECURE` bukan `"true"`** (API menolak start dengan
  error `FATAL: COOKIE_SECURE wajib 'true' di production` — lihat `apps/api/src/main.ts`).

- **`nginx` unhealthy (PROD)**
  Pastikan `web` dan `api` sudah `healthy` (lihat `docker compose ps`).
  Validasi konfigurasi: `docker compose exec nginx nginx -t`.

- **Upload gagal / storage tidak muncul (PROD)**
  Volume `opensis-storage` dipakai bersama `api` (`/app/storage`).
  Jangan `down -v` bila data ingin dipertahankan.

- **Port 5432/6379/3000/3001 sudah terpakai host**
  Ubah mapping port di `docker-compose.yml` (mis. `"5433:5432"`) lalu
  sesuaikan `DATABASE_URL`/`REDIS_URL` di `.env`.

- **Migrasi "Environment variable not found: DATABASE_URL" (dari host)**
  Jalankan dengan `DATABASE_URL` eksplisit (lihat langkah migrasi) atau
  pastikan `.env` root berisi `DATABASE_URL` menunjuk `localhost:5432`.

- _**\*NEXT_PUBLIC** tidak berubah__ (PROD)**
  `NEXT_PUBLIC_*` ter-bake saat build image. Ubah `.env` lalu
  `docker compose -f docker-compose.yml -f docker-compose.prod.yml build web && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`.

## Catatan Keamanan

- `deploy/nginx.docker.conf` & `deploy/nginx.dev.conf` (identik, beda upstream):
  rate limit per-IP (`api_limit` 30 r/s, `login_limit` 1 r/s untuk
  `POST /api/v1/auth/login`), limit koneksi, timeout hardening, security
  headers, gzip, cache immutable `/_next/static`, proxy WebSocket
  `/socket.io/` + `/ws`. Versi dev menambah `/_nginx_health` (healthcheck).
- Rate limit lapis kedua aktif di aplikasi (`RateLimitMiddleware`).
- DEV memakai `host.docker.internal` — jangan pernah dipakai di production;
  overlay prod mengalihkan ke upstream container.
- Multi-instance: Socket.IO siap Redis adapter; cache in-memory (branding,
  landing, feature flags, scope, permission) bersifat per-instance —
  pertimbangkan cache terdistribusi saat scale-out.
