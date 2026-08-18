# Runbook Produksi — opensis

Runbook operasional untuk menjalankan **opensis** di production: setup environment,
database, build & verifikasi CI, dua opsi deploy, Nginx & TLS, backup & restore,
checklist keamanan go-live, verifikasi smoke, operasional harian, dan troubleshooting.

> **Audience:** operator / admin sistem sekolah yang men-deploy dan merawat instance
> opensis production. Diasumsikan terbiasa dengan Docker Compose, Nginx, dan PostgreSQL.
>
> **Sumber:** konten diverifikasi terhadap `deploy/README.deploy.md`,
> `deploy/BACKUP.md`, `README.md` (Deployment), `.env.example`, `.github/workflows/ci.yml`,
> `docker-compose.prod.yml`, dan `deploy/nginx.conf` (2026-08-18).
>
> **Konvensi tanda:** ⚠️ = item **belum tersedia / belum diverifikasi** di repositori
> (prasyarat produksi yang masih terbuka). Jangan menganggap item ⚠️ sebagai selesai.

---

## 1. Prasyarat

| Kebutuhan         | Versi / Ketentuan                                                             | Catatan                                                             |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Docker Engine     | + Docker Compose v2 (untuk Opsi A dan infra Opsi B)                           | `docker compose version` untuk cek                                  |
| Node.js           | ≥ 20 (rekomendasi 22)                                                         | Dipakai untuk migrasi/seed dari host dan Opsi B                     |
| PostgreSQL        | ≥ 16 (di container `postgres:16-alpine`; Opsi B bisa memakai container)       | DB name: **`opensis`**                                              |
| Redis             | 7 (opsional untuk BullMQ; tanpa `REDIS_URL` memakai in-process fallback)      | Wajib password di production (`REDIS_PASSWORD`)                     |
| Nginx             | 1.27 (container) atau versi host untuk Opsi B                                 | `deploy/nginx.conf` untuk host, `nginx.docker.conf` untuk container |
| Akses root / sudo | Diperlukan untuk install Nginx, systemd/PM2 (Opsi B), dan cron backup         |                                                                     |
| Git & akses repo  | Clone repository (folder lokal saat ini: `openlms`; nama produk: **opensis**) | Lihat catatan rebranding di `README.md`                             |
| `.env`            | Hasil `cp .env.example .env`, lalu isi secret (lihat §2)                      | **Jangan pernah commit `.env`** (`.gitignore` + gitleaks)           |

> ⚠️ **Staging belum live.** Overlay staging (`docker-compose.staging.yml` +
> `deploy/README.staging.md`) tersedia, tetapi environment staging belum dijalankan
> secara live — verifikasi go-live di staging sebelum production tetap wajib dilakukan
> manual oleh operator.

---

## 2. Setup Environment

Salin template lalu isi nilai:

```bash
cp .env.example .env
```

### 2.1 Generate secret (openssl)

Semua secret production wajib acak **32+ byte**:

```bash
openssl rand -base64 32   # JWT_ACCESS_SECRET
openssl rand -base64 32   # JWT_REFRESH_SECRET
openssl rand -base64 32   # JWT_INVITATION_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -base64 32   # REDIS_PASSWORD
```

### 2.2 Tabel variabel utama

| Variabel                                                           | Wajib     | Contoh nilai (DEV)                                                                    | Keterangan                                                                                                                              |
| ------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                     | Ya        | `postgresql://opensis:change-me-32-bytes-random@localhost:5432/opensis?schema=public` | URL PostgreSQL (Prisma). **DB name: `opensis`.** Host `localhost` untuk migrasi dari host; di container overlay mengganti ke `postgres` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`              | Ya        | `opensis` / `change-me-32-bytes-random` / `opensis`                                   | Kredensial container postgres; **wajib konsisten dengan `DATABASE_URL`**; `POSTGRES_DB=opensis`                                         |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_INVITATION_SECRET` | Ya        | `change-me-32-bytes-random`                                                           | Secret acak 32+ byte di production                                                                                                      |
| `COOKIE_SECURE`                                                    | —         | `false` (DEV) / `true` (PROD)                                                         | **Wajib `true` di production** — API menolak start bila `NODE_ENV=production` dan bukan `"true"` (fail-fast, `apps/api/src/main.ts`)    |
| `CORS_ORIGINS`                                                     | Tidak     | `http://localhost:3000,http://localhost,http://localhost:80`                          | Origin diizinkan (koma-pisah), REST + Socket.IO; production diisi origin nyata (mis. `https://app.sekolah.sch.id`)                      |
| `TRUST_PROXY`                                                      | Tidak     | `true`                                                                                | Wajib `true` karena API selalu di belakang Nginx (agar `req.ip` rate limit benar)                                                       |
| `REDIS_PASSWORD` / `REDIS_URL`                                     | Ya (PROD) | `change-me-32-bytes-random` / `redis://:change-me-32-bytes-random@localhost:6379`     | **Wajib terisi di production** — overlay prod fail-fast bila `REDIS_PASSWORD` kosong (`docker-compose.prod.yml:37`)                     |
| `NEXT_PUBLIC_API_BASE`                                             | Ya (web)  | `http://localhost:3001/api/v1`                                                        | Base URL API; production ter-bake saat build image                                                                                      |
| `NEXT_PUBLIC_DEMO`                                                 | Tidak     | `0`                                                                                   | **Wajib `0`/kosong di production** — API menolak boot bila `NEXT_PUBLIC_DEMO=1`                                                         |
| `NEXT_PUBLIC_APP_NAME`                                             | Tidak     | `opensis`                                                                             | Nama aplikasi runtime                                                                                                                   |
| `PORT`                                                             | Tidak     | `3000`                                                                                | Default web `3000`; konvensi API production `3001`                                                                                      |
| `STORAGE_LOCAL_DIR`                                                | Tidak     | `./storage` (DEV) / `/app/storage` (PROD)                                             | Direktori upload lokal; PROD di-mount dari volume `opensis-storage`                                                                     |
| `LOG_LEVEL`                                                        | Tidak     | `info`                                                                                | Level log pino                                                                                                                          |
| `CACHE_TTL_MS`                                                     | Tidak     | `30000`                                                                               | TTL cache in-memory (0 = nonaktif)                                                                                                      |
| `RATE_LIMIT_*`                                                     | Tidak     | lihat `.env.example`                                                                  | Ambang rate limiting per-IP/identitas/login/refresh/upload                                                                              |
| `OPENSIS_ENABLE_JOBS`                                              | Tidak     | `false`                                                                               | Scheduler internal (SPP & denda); multi-instance: aktifkan di SATU instance saja                                                        |
| `GEOFENCE_RADIUS_M`                                                | Tidak     | `100`                                                                                 | Radius geofence absensi QR (opsional; tanpa `SCHOOL_LATITUDE/LONGITUDE` geofencing tidak aktif)                                         |
| `STORAGE_GLOBAL_MAX_MB` / `STORAGE_ORPHAN_RETENTION_DAYS`          | Tidak     | `50` / `7`                                                                            | Batas global upload & retensi file orphan                                                                                               |

> Referensi lengkap: `.env.example` (template resmi). Jangan menambahkan variabel
> `S3_*` — storage **lokal saja** (keputusan arsitektur, `docs/02-technical-architecture.md §8`).

---

## 3. Database

Nama database production: **`opensis`** (`POSTGRES_DB=opensis`, `DATABASE_URL=.../opensis`).

### 3.1 Migrate: dev vs deploy

| Perintah                    | Fungsi                                                                          | Kapan dipakai       |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------- |
| `npm run db:migrate`        | `prisma migrate dev` — membuat file migrasi baru dari perubahan skema           | Pengembangan lokal  |
| `npm run db:migrate:deploy` | `prisma migrate deploy` — menerapkan migrasi yang sudah ada, tanpa membuat file | **Production / CI** |

> `prisma` CLI hanya ada di devDependencies — migrasi dijalankan **dari host**,
> bukan di dalam container API (`deploy/README.deploy.md`).

### 3.2 Alur production

```bash
# Dari root proyek, pastikan DATABASE_URL di .env menunjuk localhost:5432
npm run db:migrate:deploy
npm run db:seed          # idempotent — aman diulang
```

- Seed idempotent (aman dijalankan berulang).
- Akses DB langsung:

```bash
docker compose exec postgres psql -U postgres -d opensis
```

> Kredensial dev seed (`admin`/`password`, `siswa1`/`password`) hanya untuk
> development — **wajib diganti di production** (lihat §9).

---

## 4. Build & Verifikasi (10 Gate CI)

Pipeline CI (`.github/workflows/ci.yml`) menjalankan **10 job** pada setiap push ke
`main` dan pull request. Gate ini adalah syarat minimum sebelum deploy production.

| #   | Job CI        | Fungsi                                                              | Perintah lokal setara                         |
| --- | ------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `lint`        | ESLint semua workspace                                              | `npm run lint`                                |
| 2   | `prettier`    | Format wajib (`npx prettier --check .`)                             | `npx prettier --check .`                      |
| 3   | `typecheck`   | TypeScript `--noEmit` semua workspace                               | `npm run typecheck`                           |
| 4   | `unit`        | Unit test API (tanpa DB) + coverage gate (Jest, floor anti-regresi) | `npm run test:unit`                           |
| 5   | `web-test`    | Unit test web (Vitest, jsdom) + coverage gate (floor 0)             | `cd apps/web && npx vitest run --coverage`    |
| 6   | `integration` | Integration + e2e API (service PostgreSQL, `POSTGRES_DB=opensis`)   | `npm run test:integration` (butuh PostgreSQL) |
| 7   | `web-e2e`     | E2E Playwright (PostgreSQL + seed; 4 test scaffold)                 | `npm run test:e2e --workspace=@opensis/web`   |
| 8   | `build`       | Build semua workspace                                               | `npm run build`                               |
| 9   | `audit`       | `npm audit --audit-level=high`                                      | `npm run audit`                               |
| 10  | `secrets`     | Secret scan (gitleaks)                                              | `gitleaks` (via GitHub Action)                |

> ⚠️ **Coverage ≥ 80% belum tercapai.** Gate API aktif di CI (floor anti-regresi di
> `apps/api/jest.config.js`), gate web masih floor 0 — target 80% adalah roadmap
> (`docs/prd/prd06.md`, `docs/prd/prd07.md`). Jangan mengklaim "coverage 80%" sebelum
> angka diregenerasi dari CI.

---

## 5. Deploy Opsi A — Docker Compose PROD (full-stack, 5 service di container)

### 5.1 Langkah

```bash
# 1. Environment — salin lalu isi secret production (lihat §2)
cp .env.example .env
#    Wajib: JWT_* acak, POSTGRES_PASSWORD kuat, REDIS_PASSWORD terisi,
#    CORS_ORIGINS origin nyata, COOKIE_SECURE=true, NEXT_PUBLIC_DEMO=0.

# 2. Build & start semua service (overlay prod menambah api + web)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3. Migrasi & seed dari HOST (DATABASE_URL di .env menunjuk localhost:5432)
npm run db:migrate:deploy
npm run db:seed

# 4. Cek status & log
docker compose ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api web nginx
```

Akses aplikasi: **http://localhost** (Nginx :80 → `web:3000` / `api:3001`).

### 5.2 Catatan penting

- Overlay memakai `deploy/nginx.docker.conf` (upstream `web:3000` / `api:3001`).
- `api` start setelah `postgres`/`redis` sehat; `web` setelah `api` sehat; `nginx`
  setelah `web`/`api` sehat (healthcheck berantai).
- **Keamanan go-live:** postgres/redis/api/web terikat **HANYA di `127.0.0.1`** host
  (`ports: !override`); port publik HANYA Nginx `:80`. Redis **wajib password**
  (fail-fast bila `REDIS_PASSWORD` kosong). Migrasi/akses dari host tetap bisa via
  `localhost:5432/6379/3000/3001`.
- Jangan deklarasi ulang `ports` nginx di overlay (Compose men-append → duplikat).
- Resource limits: api 2 CPU/1 GB, web 1 CPU/768 MB, nginx 0,5/256 MB, postgres
  1 CPU/512 MB, redis 0,25/128 MB (detail: `deploy/README.deploy.md`).

---

## 6. Deploy Opsi B — Host langsung + Nginx (tanpa Docker untuk aplikasi)

```bash
# 1. Instal dependensi & build
npm ci
npm run build

# 2. Jalankan API (:3001) dan Web (:3000) sebagai service (systemd/PM2)
#    Contoh PM2:
#      pm2 start "node apps/api/dist/main.js" --name opensis-api
#      pm2 start "node apps/web/standalone/server.js" --name opensis-web   # sesuaikan entrypoint build

# 3. Infra pendukung tetap via Docker (postgres + redis)
docker compose up -d postgres redis

# 4. Migrasi & seed dari host
npm run db:migrate:deploy
npm run db:seed

# 5. Pasang reverse proxy
cp deploy/nginx.conf /etc/nginx/conf.d/opensis.conf
nginx -t
systemctl reload nginx

# 6. TLS (lihat §7)
# 7. Redis untuk BullMQ: REDIS_URL berisi password (lihat §2)
```

> `deploy/nginx.conf` adalah versi host (upstream `127.0.0.1:3000/:3001`) — jangan
> tertukar dengan `nginx.docker.conf` (container) atau `nginx.dev.conf` (dev).

---

## 7. Nginx & TLS

### 7.1 Konfigurasi Nginx (`deploy/nginx.conf`)

| Fitur                    | Nilai / keterangan                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Rate limit per-IP        | `api_limit` 30 r/s (burst 100); `login_limit` 1 r/s (burst 5) untuk `POST /api/v1/auth/login`       |
| Batas koneksi per-IP     | `limit_conn conn_limit 10` (login 5)                                                                |
| Status limit             | `429` (bukan 503)                                                                                   |
| Security headers         | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| Gzip                     | teks, JSON, JS, CSS, SVG (level 6)                                                                  |
| Cache immutable          | `/_next/static/` → `Cache-Control: public, max-age=31536000, immutable`                             |
| Proxy WebSocket          | `/socket.io/` + `/ws` dengan header `Upgrade`/`Connection`, timeout 120s                            |
| Timeout hardening        | `client_body_timeout`/`client_header_timeout`/`send_timeout` 10s, buffer overflow protection        |
| TLS hardening (direktif) | `ssl_protocols TLSv1.2 TLSv1.3`, `ssl_session_tickets off`, dll. — aktif saat server `:443` dipakai |

Rate limit lapis kedua aktif di aplikasi (`RateLimitMiddleware` + brute-force
lockout 5 gagal/15 menit).

### 7.2 TLS (HTTPS)

1. Tambahkan blok server `:443` (mis. certbot: `certbot --nginx -d app.sekolah.sch.id`).
2. Set `COOKIE_SECURE=true` di `.env` (wajib — fail-fast di production).
3. Tambahkan header `Strict-Transport-Security` (HSTS) di blok HTTPS.
4. Perbarui `CORS_ORIGINS` ke origin HTTPS nyata.
5. Validasi: `nginx -t` lalu `systemctl reload nginx`.

> ⚠️ **CSP nonce belum tersedia.** CSP web saat ini memakai `script-src 'self'
'unsafe-inline'` di production (tanpa nonce, tanpa `'unsafe-eval'`); script nonce
> adalah target roadmap (`docs/02-technical-architecture.md §13`). Jangan mengklaim
> CSP nonce aktif.

---

## 8. Backup & Restore

Dua jenis data wajib di-backup bersama: **database** (`pg_dump` format custom) dan
**storage** (`tar.gz`). Skrip: `deploy/scripts/backup.sh` + `restore.sh`
(panduan lengkap: `deploy/BACKUP.md`).

### 8.1 Backup otomatis (cron 02:30)

```cron
30 2 * * * cd /opt/opensis && bash deploy/scripts/backup.sh >> deploy/backups/backup.log 2>&1
```

Aktivasi di server Linux:

1. `crontab -e`, tempel baris di atas (sesuaikan path `/opt/opensis`).
2. Pastikan server punya klien PostgreSQL (`pg_dump`) atau Docker + compose.
3. Verifikasi setelah jadwal pertama: `tail -n 20 deploy/backups/backup.log` — harus
   ada baris `[backup] Selesai:`.
4. **Wajib satu kali:** sinkronkan `deploy/backups/` ke penyimpanan **off-host**
   (mis. `rsync -av deploy/backups/ backup-server:/srv/opensis-backups/`).

Hasil per backup (di `BACKUP_DIR`, default `deploy/backups/`):

```
opensis-db-20260809-023000.dump          # pg_dump format custom (-Fc)
opensis-storage-20260809-023000.tar.gz   # arsip storage lokal
```

- **Retensi:** 14 hari (`BACKUP_KEEP_DAYS=14`; `0` = nonaktif; sesuaikan bila
  kebijakan arsip lebih panjang, mis. `BACKUP_KEEP_DAYS=30`).
- Dump diverifikasi otomatis dengan `pg_restore --list`; gagal verifikasi → backup
  dianggap gagal.
- Jika `pg_dump` tidak ada di host, skrip memakai `docker compose exec -T postgres pg_dump`.

### 8.2 Restore (DESTRUKTIF)

```bash
# Verifikasi dump dulu (tidak mengubah apa pun)
bash deploy/scripts/restore.sh --list deploy/backups/opensis-db-20260809-023000.dump

# Restore DB + storage sekaligus (--yes = tanpa konfirmasi interaktif)
bash deploy/scripts/restore.sh --yes \
  deploy/backups/opensis-db-20260809-023000.dump \
  deploy/backups/opensis-storage-20260809-023000.tar.gz

# Restore storage saja (tidak menyentuh database)
tar -xzf deploy/backups/opensis-storage-20260809-023000.tar.gz -C /app   # PROD (volume /app/storage)
```

> Restore bersifat **DESTRUKTIF**: DB target di-drop (`pg_restore --clean`) dan
> storage ditimpa. Pastikan Anda benar-benar ingin mengembalikan titik waktu tersebut.

### 8.3 RPO / RTO

| Metrik | Target   | Pemenuhan                                                                                    |
| ------ | -------- | -------------------------------------------------------------------------------------------- |
| RPO    | ≤ 24 jam | Backup harian via cron (02:30). Data maksimal kehilangan 24 jam.                             |
| RTO    | ≤ 4 jam  | Prosedur restore terdokumentasi + drill bulanan; `pg_restore` + `tar -xzf` biasanya < 1 jam. |

Faktor penjaga RTO: drill bulanan, `restore.sh --yes`, backup off-host.
Faktor risiko: backup hanya di disk server yang sama (solusi: rsync off-host),
tidak ada drill (solusi: drill bulanan wajib).

### 8.4 Drill bulanan

Jadwal: **setiap bulan**, operator memilih satu dump terbaru dan me-restore ke DB
terpisah (`opensis_drill`) tanpa `--clean` (aman), lalu memverifikasi tabel,
`_prisma_migrations`, dan isi storage (langkah lengkap: `deploy/BACKUP.md §4`).
Checklist penerimaan 7 item + template log drill tersedia di `deploy/BACKUP.md §4b–4c`.

> ⚠️ **Drill backup belum diverifikasi.** Prosedur drill terdokumentasi, tetapi
> belum pernah dieksekusi/terbukti di environment nyata — jadwalkan drill pertama
> sebelum go-live dan catat hasilnya di `deploy/backups/drill-log-YYYY-MM.md`.

---

## 9. Checklist Keamanan Go-Live

| #   | Item                                    | Status   | Cara verifikasi                                                                                                |
| --- | --------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `JWT_*` secret acak 32+ byte            | Siap     | `openssl rand -base64 32`; cek `.env`                                                                          |
| 2   | `POSTGRES_PASSWORD` kuat & konsisten    | Siap     | Sama antara `DATABASE_URL` dan `POSTGRES_*`                                                                    |
| 3   | `REDIS_PASSWORD` terisi (fail-fast)     | Siap     | Overlay prod menolak start bila kosong (`docker-compose.prod.yml:37`)                                          |
| 4   | `COOKIE_SECURE=true`                    | Siap     | API menolak start bila `NODE_ENV=production` dan bukan `"true"` (fail-fast)                                    |
| 5   | `NEXT_PUBLIC_DEMO=0` / kosong           | Siap     | API menolak boot bila `NEXT_PUBLIC_DEMO=1`                                                                     |
| 6   | `CORS_ORIGINS` = origin nyata (HTTPS)   | Siap     | Cek `.env`; REST + Socket.IO                                                                                   |
| 7   | Port service prod hanya `127.0.0.1`     | Siap     | `docker compose ps` — publik hanya Nginx `:80`                                                                 |
| 8   | `.env` tidak ter-commit                 | Siap     | `.gitignore` + gitleaks di CI (gate `secrets`)                                                                 |
| 9   | Backup tersimpan off-host               | Siap     | rsync/scp `deploy/backups/` ke mesin lain                                                                      |
| 10  | CI 10 gate hijau (terakhir di `main`)   | Siap     | Lihat §4                                                                                                       |
| 11  | Drill backup pertama tereksekusi        | ⚠️ Belum | `deploy/BACKUP.md §4`; log di `deploy/backups/drill-log-YYYY-MM.md`                                            |
| 12  | Staging live & terverifikasi            | ⚠️ Belum | Overlay staging tersedia; environment staging belum live                                                       |
| 13  | Coverage ≥ 80%                          | ⚠️ Belum | Gate API aktif (floor), web floor 0; target 80% roadmap                                                        |
| 14  | Observability alerting aktif            | ⚠️ Belum | `GET /metrics` ada; slow query & alerting masih tersisa (`README.md` Roadmap)                                  |
| 15  | Review pajak TER (PPh 21, PMK 168/2023) | ⚠️ Belum | Nilai bracket TER perlu review pajak sebelum produksi (`docs/03-database-erd.md`, `docs/08-knowledge-base.md`) |
| 16  | CSP script nonce                        | ⚠️ Belum | Saat ini `script-src 'self' 'unsafe-inline'`; nonce adalah roadmap                                             |

> Item ⚠️ bukan blocker mutlak untuk pilot, tetapi **wajib dicatat sebagai risiko
> terbuka** dan ditutup sesuai roadmap sebelum skala penuh.

---

## 10. Verifikasi Smoke

Setelah deploy, jalankan urutan berikut (semua harus PASS):

```bash
# 1. Semua service healthy/running (5 service: postgres, redis, nginx, api, web)
docker compose ps

# 2. Health API langsung (host)
curl -fsS http://localhost:3001/api/v1/health

# 3. Aplikasi via Nginx
curl -fsS -I http://localhost/

# 4. Log tanpa error fatal
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 api web nginx
```

Verifikasi fungsional:

1. Buka `http://localhost` di browser → halaman login tampil.
2. Login sebagai SUPERADMIN (kredensial production, **bukan** `admin`/`password` dev).
3. Cek dashboard, satu modul baca (mis. data siswa) dan satu modul tulis (mis. buat
   pengumuman) sebagai perwakilan.
4. Cek endpoint metrik: `GET /metrics` (SUPERADMIN) — memastikan observability dasar jalan.
5. Uji upload file kecil (mis. branding/avatar) → file muncul di storage.
6. Uji backup: `bash deploy/scripts/backup.sh` → dua file di `deploy/backups/` +
   verifikasi `pg_restore --list` sukses.
7. Uji realtime: buka dua sesi, kirim notifikasi → terima di sesi lain (Socket.IO `/ws`).

---

## 11. Operasional Harian

| Kebutuhan           | Perintah (PROD)                                                                                                                                          | Catatan                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Rebuild image       | `docker compose -f docker-compose.yml -f docker-compose.prod.yml build api web && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` | `NEXT_PUBLIC_*` ter-bake saat build — ubah `.env` lalu rebuild `web` |
| Lihat log           | `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api web nginx`                                                                  |                                                                      |
| Restart service     | `docker compose restart <service>`                                                                                                                       |                                                                      |
| Stop semua          | `docker compose down`                                                                                                                                    | Data aman (volume dipertahankan)                                     |
| Stop + hapus volume | `docker compose down -v`                                                                                                                                 | ⚠️ **Menghapus data DB, Redis, dan storage** — jangan tanpa backup   |
| Migrasi skema baru  | `npm run db:migrate:deploy` (dari host)                                                                                                                  | Sebelumnya: backup DB (§8)                                           |
| Akses DB (psql)     | `docker compose exec postgres psql -U postgres -d opensis`                                                                                               | DB name: `opensis`                                                   |
| Backup DB           | `docker compose exec postgres pg_dump -U postgres opensis > backup.sql`                                                                                  | Backup cepat ad-hoc; backup resmi pakai `backup.sh`                  |
| Restore DB          | `Get-Content backup.sql \| docker compose exec -T postgres psql -U postgres -d opensis`                                                                  | DESTRUKTIF — pastikan target benar                                   |
| Backup DB+storage   | `bash deploy/scripts/backup.sh` (→ `deploy/backups/`, retensi 14 hari)                                                                                   | Panduan: `deploy/BACKUP.md`                                          |
| Restore DB+storage  | `bash deploy/scripts/restore.sh --yes deploy/backups/opensis-db-<ts>.dump deploy/backups/opensis-storage-<ts>.tar.gz`                                    | DESTRUKTIF — lihat `deploy/BACKUP.md`                                |
| Cek health          | `curl -fsS http://localhost:3001/api/v1/health`                                                                                                          |                                                                      |
| Cek metrik          | `GET /metrics` (SUPERADMIN)                                                                                                                              |                                                                      |
| TLS / cert renew    | `certbot renew` (cron) + `systemctl reload nginx`                                                                                                        |                                                                      |
| Staging             | `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml up -d --build` (host terpisah dari prod)                  | ⚠️ Staging belum live                                                |

---

## 12. Troubleshooting

| Gejala                                                             | Kemungkinan penyebab / solusi                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api` restart-loop / unhealthy (PROD)                              | Cek `docker compose logs api`. Umum: `DATABASE_URL` salah, koneksi ditolak (pastikan user/password/db cocok dengan `POSTGRES_*`), `CORS_ORIGINS` kosong, atau `COOKIE_SECURE` bukan `"true"` (API menolak start, `apps/api/src/main.ts`) |
| `nginx` unhealthy (PROD)                                           | Pastikan `web` dan `api` sudah `healthy` (`docker compose ps`); validasi: `docker compose exec nginx nginx -t`                                                                                                                           |
| `nginx` unhealthy (DEV)                                            | Cek `docker compose logs nginx`; pastikan app host jalan (`npm run dev`) dan port 3000/3001 terbuka; validasi `nginx -t`; healthcheck memakai `/_nginx_health` (`deploy/nginx.dev.conf`)                                                 |
| Aplikasi tidak bisa diakses dari browser (DEV)                     | `host.docker.internal` (Windows/macOS bawaan; Linux butuh `extra_hosts host-gateway` — sudah ada di compose). Cek app host: `curl http://localhost:3001/api/v1/health`                                                                   |
| Upload gagal / storage tidak muncul (PROD)                         | Volume `opensis-storage` dipakai bersama `api` (`/app/storage`). Jangan `down -v` bila data ingin dipertahankan. Cek `STORAGE_LOCAL_DIR`                                                                                                 |
| Port 5432/6379/3000/3001 sudah terpakai host                       | Ubah mapping port di `docker-compose.yml` (mis. `"5433:5432"`) lalu sesuaikan `DATABASE_URL`/`REDIS_URL` di `.env`                                                                                                                       |
| Migrasi "Environment variable not found: DATABASE_URL" (dari host) | Jalankan dengan `DATABASE_URL` eksplisit atau pastikan `.env` root berisi `DATABASE_URL` menunjuk `localhost:5432`                                                                                                                       |
| `NEXT_PUBLIC_*` tidak berubah (PROD)                               | `NEXT_PUBLIC_*` ter-bake saat build image. Ubah `.env` lalu `docker compose -f docker-compose.yml -f docker-compose.prod.yml build web && ... up -d`                                                                                     |
| `pg_dump: error: connection to server ... failed`                  | `DATABASE_URL` salah / postgres belum up. Cek `docker compose ps`, lalu `.env`                                                                                                                                                           |
| `ERROR: DATABASE_URL kosong` (backup)                              | `.env` tidak terbaca (path relatif dari `cd` berbeda). Jalankan dari root proyek atau set env eksplisit                                                                                                                                  |
| `pg_restore: error: role "..." does not exist`                     | Restore memakai `--no-owner`, tetapi skrip lama dump tanpa flag itu. Biasanya aman diabaikan; gunakan dump terbaru dari `backup.sh`                                                                                                      |
| Storage tidak muncul setelah restore                               | Pastikan `STORAGE_LOCAL_DIR` benar (`/app/storage` PROD) dan tar diekstrak ke induk yang sama dengan asal backup                                                                                                                         |
| Cron backup tidak jalan                                            | Cek `crontab -l`, baris diakhiri newline, path `bash` benar (`which bash`), log cron: `grep CRON /var/log/syslog`                                                                                                                        |

---

## Lampiran: Sumber & Status

| Sumber                                                       | Status verifikasi (2026-08-18)      |
| ------------------------------------------------------------ | ----------------------------------- |
| `deploy/README.deploy.md`                                    | Terverifikasi                       |
| `deploy/BACKUP.md`                                           | Terverifikasi                       |
| `README.md` (Deployment, Keamanan)                           | Terverifikasi                       |
| `.env.example`                                               | Terverifikasi                       |
| `.github/workflows/ci.yml`                                   | Terverifikasi                       |
| `docker-compose.prod.yml`                                    | Terverifikasi                       |
| `deploy/nginx.conf`                                          | Terverifikasi                       |
| Item ⚠️ (alerting, staging, drill, coverage, TER, CSP nonce) | Belum tersedia — ditandai eksplisit |
