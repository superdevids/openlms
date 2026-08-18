# README.auth.md — Modul Auth (apps/api/src/modules/auth)

## Fungsi Folder

Modul autentikasi & otorisasi: login **Username (NIS/NIP) + Password** (Argon2id),
JWT access + refresh di cookie httpOnly (refresh rotation), logout, sesi
(`/auth/me`), reset password oleh OPERATOR, ubah password sendiri, serta
undangan pengguna. Modul ini juga memasang guard global
(`AuthGuard` → `PermissionsGuard` → `FeatureFlagGuard`) via `APP_GUARD`.

## Daftar Fitur

- Login dengan username (NIS/NIP); email opsional hanya untuk notifikasi; throttle/lockout brute-force.
- Undangan: username **wajib** (NIS/NIP — identifier akun), email **opsional** (notifikasi, bukan untuk login).
- Refresh token rotation (revoke saat dipakai ulang).
- `GET /auth/me` → profil + roles + scope (classIds, homeroom).
- Reset password oleh OPERATOR; ganti password sendiri.
- Undangan (link + role) → `UserRole` ACTIVE saat accept.
- `PermissionsResolver` (cache TTL 60s) memuat permission role + user override.
- **Multi-role (2026-08-18, item 18):** user dapat punya **N baris `UserRole`
  ACTIVE** (rangkap role, mis. KEPSEK + GURU). Backend TIDAK berubah: guard
  memakai **union seluruh roles** user (`RequestContext.roles[]`). Pemilihan
  "peran aktif" adalah konsep frontend murni (localStorage `opensis_active_role`)
  yang hanya mengatur UI/navigasi — lihat `apps/web/src/lib/active-role.ts`.

## Keamanan

- **Revoke refresh token saat ganti/reset password (SEC-007):** `changePassword`
  dan `resetPassword` me-revoke SEMUA refresh token aktif user
  (`refreshToken.updateMany` di mana `user_id` + `revoked_at: null`) sehingga
  sesi lama mati setelah kredensial berubah. Revoke TIDAK terjadi bila password
  saat ini salah (BadRequestException).
- **COOKIE_SECURE fail-fast (CFG-02):** cookie `httpOnly + Secure + SameSite=Lax`
  (`auth.constants.ts`). Di `NODE_ENV=production`, boot gagal (throw) bila
  `COOKIE_SECURE !== "true"` — mencegah cookie JWT tanpa flag Secure di HTTPS
  (`src/main.ts`). CORS juga fail-fast bila `CORS_ORIGINS` kosong di production.
- **Aktor JWT canonical:** identitas dan roles selalu dibaca dari
  `request.requestContext` (`@CurrentUser`/`AuthUser` dari AuthGuard), bukan dari
  header/body klien.

## Endpoint (prefix global `/api/v1`)

| Method | Path                       | Permission                   | Deskripsi                                                               |
| ------ | -------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| POST   | `/auth/login`              | Publik                       | Login; set cookie `opensis_access` + `opensis_refresh`                  |
| POST   | `/auth/refresh`            | Publik                       | Rotasi refresh token; set cookie baru                                   |
| POST   | `/auth/logout`             | Publik                       | Hapus sesi + bersihkan cookie                                           |
| GET    | `/auth/me`                 | `auth:me:self`               | Profil user + roles + scope                                             |
| POST   | `/auth/reset-password`     | `user:reset-password:school` | Reset password oleh OPERATOR; revoke semua refresh token user (SEC-007) |
| POST   | `/auth/change-password`    | `auth:password:change:self`  | Ganti password sendiri; revoke semua refresh token user (SEC-007)       |
| POST   | `/auth/invitations`        | `invitation:send:school`     | Kirim undangan (link + role)                                            |
| POST   | `/auth/invitations/accept` | Publik                       | Terima undangan (token)                                                 |

## Struktur File

| File                                   | Isi                                                       |
| -------------------------------------- | --------------------------------------------------------- |
| `auth.controller.ts`                   | REST endpoint auth + pengaturan cookie                    |
| `auth.service.ts`                      | Login/refresh/logout/me/reset/change + lockout + AuditLog |
| `invitations.service.ts`               | Undangan + accept                                         |
| `permissions-resolver.ts`              | Permission role + user override (cache TTL 60s)           |
| `jwt.util.ts` / `password.util.ts`     | Sign/verify JWT in-house; Argon2id                        |
| `cookie.util.ts` / `auth.constants.ts` | Helper cookie + konstanta                                 |
| `auth.module.ts`                       | Registrasi provider + `APP_GUARD` global                  |
