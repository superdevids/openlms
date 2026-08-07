# README.deploy.md — Deployment (deploy/)

## Fungsi Folder

Konfigurasi deployment production: reverse-proxy Nginx. Docker Compose untuk
layanan pendukung ada di root (`docker-compose.yml`). S3/MinIO **tidak dipakai** —
storage file lokal backend (`STORAGE_LOCAL_DIR`).

## Struktur Folder

| File         | Isi                                                       |
| ------------ | --------------------------------------------------------- |
| `nginx.conf` | Reverse proxy production (apps/web :3000, apps/api :3001) |

## nginx.conf — Ringkasan

- **Proxy:** `/` → `http://127.0.0.1:3000` (Next.js); `/api/` → `:3001` (NestJS);
  `/socket.io/` & `/ws` → `:3001` (Socket.IO, upgrade websocket).
- **Rate limiting:** `api_limit` 30 r/s per IP (burst 100); `login_limit` 1 r/s
  untuk `POST /api/v1/auth/login` (brute-force). Status 429.
- **Limit koneksi:** `limit_conn` 10 per IP (login 5).
- **Timeout hardening:** body/header/send 10s, keepalive 65s.
- **Security headers:** nosniff, DENY frame, strict-origin-referrer,
  permissions-policy.
- **Gzip** untuk teks/JSON/JS/CSS/SVG.
- **Cache immutable** `/_next/static/` (1 tahun).

## Langkah Deploy

1. **Build:** `npm ci && npm run build` (root).
2. **Migrasi DB:** `npm run db:migrate:deploy` (atau `npm run db:generate`).
3. **Seed (dev):** `npm run db:seed` — idempotent.
4. **Jalankan app:**
   - API: `npm run start --workspace=@openlms/api` (port `3001`).
   - Web: `npm run start --workspace=@openlms/web` (port `3000`).
   - (Opsional) Redis untuk BullMQ: `docker compose --profile full up -d redis`.
5. **Pasang Nginx:**
   `cp deploy/nginx.conf /etc/nginx/conf.d/openlms.conf && nginx -t && systemctl reload nginx`
6. **TLS:** tambahkan blok `:443` (mis. certbot) + set `COOKIE_SECURE=true`;
   tambahkan `Strict-Transport-Security` di blok HTTPS.
7. **Env wajib:** `DATABASE_URL`, secret JWT (32+ byte), `CORS_ORIGINS`,
   `NEXT_PUBLIC_API_BASE`, `TRUST_PROXY=true` (di belakang Nginx).

## Docker Compose (root)

- `postgres` (wajib): PostgreSQL 16, volume `postgres-data`, healthcheck.
- `redis` (opsional, profile `full`): untuk BullMQ/antrean.
- Tanpa layanan S3/MinIO — storage lokal di filesystem backend.

## Catatan

- Rate limit lapis kedua juga aktif di aplikasi (`RateLimitMiddleware`).
- Multi-instance: Socket.IO siap Redis adapter; cache in-memory (branding,
  landing, feature flags, scope, permission) bersifat per-instance — pertimbangkan
  cache terdistribusi saat scale-out.
