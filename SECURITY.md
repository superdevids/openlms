# Kebijakan Keamanan (Security Policy) — openlms

## Laporan Kerentanan (Reporting a Vulnerability)

Kami menanggapi laporan kerentanan dengan serius. **Jangan membuka issue publik untuk masalah keamanan.**

**Cara melaporkan:**

1. **Kanal utama (direkomendasikan):** gunakan [Private Vulnerability Reporting](https://github.com/superdevids/openlms/security/advisories) di GitHub (Security → Advisories → New draft security advisory). Laporan masuk ke maintainer secara privat.
2. **Email (cadangan):** `security@openlms.local` — _placeholder, ganti dengan alamat email keamanan resmi tim sebelum rilis publik._ Sertakan informasi berikut:
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

| Versi           | Status Dukungan                        |
| --------------- | -------------------------------------- |
| `main` (branch) | Didukung — target utama patch keamanan |
| `0.5.x`         | Didukung — versi stabil terbaru        |
| `< 0.5.0`       | Tidak didukung — segera upgrade        |

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

- Kerentanan pada layanan pihak ketiga yang di-deploy bersebelahan (Nginx, PostgreSQL, Redis) tanpa konfigurasi openlms.
- Serangan yang membutuhkan akses fisik atau akses akun production tanpa izin.
- Spam, social engineering terhadap pengguna akhir.

## Praktik Keamanan di Proyek

Kontrol keamanan yang sudah diterapkan di codebase (detail: [docs/02-technical-architecture.md §13](docs/02-technical-architecture.md), [docs/prd/prd04.md §6](docs/prd/prd04.md)):

| Area                   | Implementasi                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hash password**      | Argon2id (bukan bcrypt/MD5) — `packages/database/prisma/seed.ts`, auth service                                                                                                           |
| **Sesi**               | JWT access di **httpOnly cookie** (Secure + SameSite), refresh rotation; role di-resolve dari tabel `UserRole` agar perubahan role instan dan tidak bergantung klaim JWT                 |
| **RBAC**               | Fail-closed: `AuthGuard` global → `PermissionsGuard` (`@RequirePermission`, scope SENDIRI/KELAS/SEKOLAH) → `FeatureFlagGuard`. Fitur OFF ditolak di API, bukan hanya disembunyikan di UI |
| **Rate limiting**      | Nginx (`deploy/nginx.conf`): `login_limit` 1 r/s, `api_limit` 30 r/s; aplikasi: `RATE_LIMIT_*` per-IP/identitas + brute-force lockout 5 gagal/15 menit                                   |
| **Header keamanan**    | Helmet di NestJS; `X-Content-Type-Options`, `X-Frame-Options DENY`, `Referrer-Policy`, `Permissions-Policy` di Nginx                                                                     |
| **Storage**            | **Lokal saja** (`STORAGE_LOCAL_DIR`) — tanpa S3/MinIO; bucket per jenis dokumen dengan akses berbasis RBAC scope; PII (PPDB, BK) tidak disimpan di folder publik                         |
| **Anti-impersonation** | Aktor dibaca dari `request.requestContext`, bukan header klien                                                                                                                           |
| **Audit**              | `AuditLog` untuk perubahan data sensitif: actor, timestamp, before/after                                                                                                                 |
| **Secrets**            | `.env.example` tanpa nilai secret; `.gitleaks.toml` untuk secret scanning; CI menjalankan `npm audit --audit-level=high`                                                                 |
| **Sanitasi konten**    | Konten landing CMS harus melewati sanitasi allowlist (roadmap — [prd05 G-28](docs/prd/prd05-development.md))                                                                             |

**Batasan yang diketahui (roadmap keamanan, [prd05](docs/prd/prd05-development.md)):**

- Proteksi CSRF penuh untuk mutasi berbasis cookie (G-21) — dalam rencana Sprint 2.
- Validasi magic bytes/MIME upload (G-23) — dalam rencana Sprint 2.
- Fail-fast JWT secret untuk semua env non-production (G-22) — dalam rencana Sprint 2.
- Sanitasi konten landing (G-28) — dalam rencana Sprint 2.

## Pengungkapan yang Bertanggung Jawab (Responsible Disclosure)

- **Berikan waktu perbaikan**: kami menargetkan patch untuk kerentanan kritis dalam **14 hari**, high dalam **30 hari**. Mohon jangan memublikasikan detail kerentanan sebelum perbaikan dirilis.
- **Jangan mengeksploitasi**: jangan mengakses data pengguna lain, mengunduh data produksi, atau merusak sistem saat menguji kerentanan.
- **Batas pengujian**: gunakan environment staging/development Anda sendiri; jangan melakukan load/DoS terhadap infrastruktur production.
- Kami berkomitmen mengkredit pelapor (jika diinginkan) pada catatan rilis.

## Kebijakan Sekuriti untuk Pengguna

- Wajib mengganti semua secret placeholder di `.env` sebelum production (`JWT_*_SECRET` minimal 32 byte acak).
- Wajib `COOKIE_SECURE=true` saat HTTPS; wajib TLS di reverse proxy.
- Jangan pernah commit file `.env`; gunakan secret management (Vault/env CI) di production.
- Ikuti panduan deployment di [README.md — Deployment](README.md#deployment) dan [deploy/README.deploy.md](deploy/README.deploy.md).
