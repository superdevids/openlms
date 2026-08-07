# README.auth.md — Modul Auth (apps/api/src/modules/auth)

## Fungsi Folder

Modul autentikasi & otorisasi: login **Email/Username + Password** (Argon2id),
JWT access + refresh di cookie httpOnly (refresh rotation), logout, sesi
(`/auth/me`), reset password oleh OPERATOR, ubah password sendiri, serta
undangan pengguna. Modul ini juga memasang guard global
(`AuthGuard` → `PermissionsGuard` → `FeatureFlagGuard`) via `APP_GUARD`.

## Daftar Fitur

- Login dengan email atau username; throttle/lockout brute-force.
- Refresh token rotation (revoke saat dipakai ulang).
- `GET /auth/me` → profil + roles + scope (classIds, homeroom).
- Reset password oleh OPERATOR; ganti password sendiri.
- Undangan (link + role) → `UserRole` ACTIVE saat accept.
- `PermissionsResolver` (cache TTL 60s) memuat permission role + user override.

## Endpoint (prefix global `/api/v1`)

| Method | Path                       | Permission                   | Deskripsi                                              |
| ------ | -------------------------- | ---------------------------- | ------------------------------------------------------ |
| POST   | `/auth/login`              | Publik                       | Login; set cookie `openlms_access` + `openlms_refresh` |
| POST   | `/auth/refresh`            | Publik                       | Rotasi refresh token; set cookie baru                  |
| POST   | `/auth/logout`             | Publik                       | Hapus sesi + bersihkan cookie                          |
| GET    | `/auth/me`                 | `auth:me:self`               | Profil user + roles + scope                            |
| POST   | `/auth/reset-password`     | `user:reset-password:school` | Reset password oleh OPERATOR                           |
| POST   | `/auth/change-password`    | `auth:password:change:self`  | Ganti password sendiri                                 |
| POST   | `/auth/invitations`        | `invitation:send:school`     | Kirim undangan (link + role)                           |
| POST   | `/auth/invitations/accept` | Publik                       | Terima undangan (token)                                |

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
