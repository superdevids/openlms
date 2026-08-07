# README.storage.md — Modul Storage (apps/api/src/modules/storage)

## Fungsi Folder

Penyimpanan **file lokal backend** (bukan S3/MinIO): upload multipart via API,
serve file dengan kontrol akses per bucket, dan validasi keamanan (mimetype
allowlist, batas ukuran 2MB, path traversal protection). Direktori root dari
env `STORAGE_LOCAL_DIR` (default `./storage`).

## Daftar Fitur

- Upload multipart ke bucket `branding`/`avatars` (public) — `app:write:school`.
- Serve file:
  - `branding` / `avatars` → publik (logo/favicon pre-login).
  - bucket terproteksi (`materials`, `submissions`, `exports`) → RBAC scope.
- Kebijakan akses per bucket (`BUCKET_POLICIES`): public / class / exports.
- Cache-Control immutable + Content-Type oleh ekstensi; `nosniff`.

## Endpoint (prefix global `/api/v1`)

| Method | Path                        | Permission                                 | Deskripsi                             |
| ------ | --------------------------- | ------------------------------------------ | ------------------------------------- |
| GET    | `/storage/files/branding/*` | Publik                                     | Serve file branding                   |
| GET    | `/storage/files/avatars/*`  | Publik                                     | Serve avatar                          |
| GET    | `/storage/files/:bucket/*`  | `material:read:class`/`export:read:school` | Serve file terproteksi                |
| POST   | `/storage/files/:bucket`    | `app:write:school`                         | Upload file (multipart, field "file") |

## Struktur File

| File                        | Isi                                                           |
| --------------------------- | ------------------------------------------------------------- |
| `storage.controller.ts`     | REST endpoint + streaming                                     |
| `storage.service.ts`        | Simpan/resolve/upload + assertReadAccess                      |
| `local-storage.provider.ts` | Provider penyimpanan lokal                                    |
| `storage.constants.ts`      | `STORAGE_LOCAL_DIR`, batas ukuran, mimetype, kebijakan bucket |
