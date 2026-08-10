# Kebijakan Keamanan (Security Policy) — opensis

Kebijakan keamanan untuk **opensis** (nama proyek; repository GitHub saat ini: `superdevids/openlms`), super-app LMS + SIS single-school untuk SMA/SMK Indonesia. Proyek menangani data pribadi siswa, guru, dan wali (PII) sehingga keamanan adalah prioritas utama.

## Laporan Kerentanan (Reporting a Vulnerability)

Kami menanggapi laporan kerentanan dengan serius. **Jangan membuka issue publik untuk masalah keamanan.**

**Cara melaporkan:**

1. **Kanal utama (direkomendasikan):** gunakan [Private Vulnerability Reporting](https://github.com/superdevids/openlms/security/advisories) di GitHub (Security → Advisories → New draft security advisory). Laporan masuk ke maintainer secara privat.
2. **Email (cadangan):** `security@opensis.local` — _placeholder, ganti dengan alamat email keamanan resmi tim sebelum rilis publik._ Sertakan informasi berikut:
   - Ringkasan kerentanan.
   - Produk/versi yang terdampak (`apps/api`, `apps/web`, `packages/*`).
   - Langkah reproduksi (payload, endpoint, screenshot).
   - Dampak potensial (data apa yang bisa diakses/diubah).
   - Saran perbaikan (jika ada).

**Apa yang terjadi setelah laporan:**

1. Tim mengonfirmasi penerimaan laporan dalam **2 hari kerja**.
2. Tim menilai severity dan memvalidasi kerentanan.
3. Perbaikan dirancang, diuji, dan dirilis; lalu pengungkapan publik dilakukan bersama pelapor (jika pelapor setuju).

## Versi yang Didukung (Supported Versions)

| Versi           | Status Dukungan                                        |
| --------------- | ------------------------------------------------------ |
| `main` (branch) | Didukung — target utama patch keamanan                 |
| `0.1.x`         | Didukung — versi stabil terbaru (package.json `0.1.0`) |
| `< 0.1.0`       | Tidak didukung — segera upgrade                        |

> Proyek masih dalam fase pra-1.0. Prioritas patch keamanan: versi stabil terbaru dan `main`.

## Cakupan Laporan

Laporan kerentanan yang **kami terima** mencakup (namun tidak terbatas pada):

- **Autentikasi & sesi**: brute-force login, session fixation/hijacking, JWT (secrets lemah, algoritma, lifetime), cookie (httpOnly/Secure/SameSite).
- **Otorisasi (RBAC)**: IDOR, privilege escalation, bypass scope SENDIRI/KELAS/SEKOLAH, `UserPermissionOverride`.
- **Web security (OWASP Top 10)**: injection (SQL/NoSQL), XSS (termasuk sanitasi konten landing), CSRF, SSRF, open redirect, insecure deserialization.
- **Kerentanan data**: kebocoran PII siswa/guru (UU PDP), exposure file upload/storage, audit log yang tidak lengkap, enumeration user.
- **Secrets & konfigurasi**: secret ter-commit di repository, konfigurasi env berbahaya (mis. `COOKIE_SECURE=false` di production), rate limiting yang dapat dilewati.
- **Dependensi**: kerentanan npm dengan severity high/critical yang berisiko dieksploitasi.

**Di luar cakupan** (tidak akan menerima bounty, tetap kami hargai laporannya):

- Kerentanan pada layanan pihak ketiga yang di-deploy bersebelahan (Nginx, PostgreSQL, Redis) tanpa konfigurasi opensis.
- Serangan yang membutuhkan akses fisik atau akses akun production tanpa izin.
- Spam, social engineering terhadap pengguna akhir.

## Praktik Keamanan yang Diterapkan

Kontrol keamanan yang sudah diterapkan di codebase (detail: [docs/02-technical-architecture.md §13](docs/02-technical-architecture.md), [docs/prd/prd04.md §6](docs/prd/prd04.md)):

| Area                   | Implementasi                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hash password**      | **Argon2id** (bukan bcrypt/MD5) — `packages/database/prisma/seed.ts`, auth service                                                                                                                                                                                                                                                                                     |
| **Sesi**               | JWT access di **httpOnly cookie** (Secure + SameSite=Lax), **refresh rotation**; role di-resolve dari tabel `UserRole` agar perubahan role instan dan tidak bergantung klaim JWT                                                                                                                                                                                       |
| **Fail-fast config**   | `apps/api/src/main.ts`: di production API **menolak start** bila `COOKIE_SECURE !== "true"` (CFG-02) atau `CORS_ORIGINS` kosong; secret JWT wajib diset (fail-fast di `jwt.util.ts`, tanpa fallback dev)                                                                                                                                                               |
| **JWT anti-tamper**    | Signature dicek **kanonik** (`jwt.util.ts`): decode → re-encode base64url harus sama persis dengan string asli (mutasi karakter padding 2-bit tidak lolos), lalu `timingSafeEqual`; TTL + `typ` dikunci                                                                                                                                                                |
| **Revoke sesi**        | **SEC-007**: `changePassword` dan `resetPasswordByOperator` mencabut (revoke) SEMUA refresh token aktif user (`auth.service.ts`); refresh rotation + revoke token lama saat `/auth/refresh`                                                                                                                                                                            |
| **RBAC fail-closed**   | `AuthGuard` global → `PermissionsGuard` (`@RequirePermission`, scope SENDIRI/KELAS/SEKOLAH dengan hierarki: grant SEKOLAH memenuhi KELAS/SENDIRI) → `FeatureFlagGuard`. Fitur OFF ditolak di API, bukan hanya disembunyikan di UI                                                                                                                                      |
| **Anti-impersonation** | Aktor dibaca dari `request.requestContext`, bukan header klien                                                                                                                                                                                                                                                                                                         |
| **Rate limiting**      | Nginx (`deploy/nginx.conf`): `login_limit` 1 r/s, `api_limit` 30 r/s; aplikasi in-memory (`rate-limit.middleware.ts`): `RATE_LIMIT_*` per-IP/identitas, `UPLOAD_RATE_LIMIT_MAX` khusus upload, brute-force lockout 5 gagal/15 menit (`auth.constants.ts`). Catatan: in-memory bersifat per-instance — saat scale-out ke multi-instance gunakan store eksternal (Redis) |
| **Header keamanan**    | Helmet di NestJS; CSP self + inline style + `data:` image; HSTS saat HTTPS; `X-Content-Type-Options`, `X-Frame-Options DENY`, `Referrer-Policy`, `Permissions-Policy` di Nginx; body parser 50kb; HPP; compression                                                                                                                                                     |
| **Storage sanitasi**   | **Lokal saja** (`STORAGE_LOCAL_DIR`) — tanpa S3/MinIO; bucket per jenis dokumen dengan akses berbasis RBAC scope; **validasi magic bytes/MIME** (`MAGIC_SIGNATURES`) + ekstensi allowlist + batas per-bucket (`STORAGE_MAX_<BUCKET>_MB`) + batas global (`STORAGE_GLOBAL_MAX_MB`); PII (PPDB, BK) tidak disimpan di folder publik                                      |
| **Audit log**          | `AuditLog` untuk perubahan data sensitif (nilai, absensi, pembayaran, data siswa, landing): actor, timestamp, before/after, `actor_role`, IP; **kegagalan menulis audit dicatat error (tidak senyap)**; endpoint baca `GET /admin/change-logs` (SUPERADMIN/KEPSEK)                                                                                                     |
| **Error mapping**      | `all-exceptions.filter.ts`: Prisma `P2002`→409 CONFLICT, `P2025`→404 NOT_FOUND, `P2003`→409; pesan GENERIK ke klien, detail query/constraint hanya di log server (pino) + `requestId`                                                                                                                                                                                  |
| **Secrets**            | `.env.example` tanpa nilai secret; `.gitleaks.toml` untuk secret scanning; CI menjalankan `npm audit --audit-level=high` + job gitleaks                                                                                                                                                                                                                                |

## Batasan yang Diketahui & Roadmap Keamanan

Batasan yang masih diketahui dan terjadwal ([prd05](docs/prd/prd05.md), [prd06](docs/prd/prd06.md), [riview02 §8](docs/riview/riview02.md)):

| Item                                                                            | Status / Rencana                                                                                                                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proteksi CSRF penuh untuk mutasi berbasis cookie (G-21)                         | Roadmap — prd05 Sprint 2                                                                                                                                   |
| Sanitasi konten landing CMS (allowlist) (G-28)                                  | Roadmap — URL sudah di-allowlist (`isSafeUrl` di landing.service.ts), body HTML mentah belum disanitasi; prd05 Sprint 2                                    |
| Gate `DEMO_MODE` global agar data demo tidak merembes ke production (R-07/R-41) | Risiko terbuka MEDIUM — prasyarat rilis production                                                                                                         |
| Audit akses change-log untuk WAKEPSEK (R-1)                                     | Risiko terbuka MEDIUM — `GET /admin/change-logs` masih dibatasi SUPERADMIN/KEPSEK (`audit-log.controller.ts`); keputusan eksplisit matriks RBAC dibutuhkan |
| Gate coverage modul kritis ≥ 80% (G-61)                                         | Roadmap — prd07 Sprint 3                                                                                                                                   |

Target sebelum go-live production: **gate `DEMO_MODE`, proteksi CSRF (G-21), coverage ≥ 80% (G-61), dan keputusan akses change-log WAKEPSEK (R-1)** [riview02 §9](docs/riview/riview02.md).

## Pengungkapan yang Bertanggung Jawab (Responsible Disclosure)

- **Berikan waktu perbaikan**: kami menargetkan patch untuk kerentanan kritis dalam **14 hari**, high dalam **30 hari**. Mohon jangan memublikasikan detail kerentanan sebelum perbaikan dirilis.
- **Jangan mengeksploitasi**: jangan mengakses data pengguna lain, mengunduh data produksi, atau merusak sistem saat menguji kerentanan.
- **Batas pengujian**: gunakan environment staging/development Anda sendiri; jangan melakukan load/DoS terhadap infrastruktur production.
- Kami berkomitmen mengkredit pelapor (jika diinginkan) pada catatan rilis.

## Kebijakan Sekuriti untuk Pengguna

- Wajib mengganti semua secret placeholder di `.env` sebelum production (`JWT_*_SECRET` minimal 32 byte acak).
- Wajib `COOKIE_SECURE=true` saat HTTPS — di production API **menolak start (fail-fast)** bila nilainya bukan `"true"` (`apps/api/src/main.ts`); wajib TLS di reverse proxy.
- Jangan pernah commit file `.env`; gunakan secret management (Vault/env CI) di production.
- Ikuti panduan deployment di [README.md — Deployment](README.md#deployment) dan [deploy/README.deploy.md](deploy/README.deploy.md).
