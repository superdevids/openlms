# README.app-settings.md — Modul App Settings (apps/api/src/modules/app-settings)

## Fungsi Folder

Pengaturan aplikasi tingkat sekolah (single-school): profil sekolah, ambang nilai,
dan `current_academic_year_id` (tahun ajaran aktif). Dibaca oleh modul lain untuk
menentukan konteks tahun ajaran berjalan.

## Daftar Fitur

- Baca pengaturan aplikasi.
- Update pengaturan (AuditLog + aktor dari `request.requestContext`).

## Endpoint (prefix global `/api/v1`)

| Method | Path            | Permission         | Deskripsi                    |
| ------ | --------------- | ------------------ | ---------------------------- |
| GET    | `/app/settings` | `app:read:school`  | Baca pengaturan aplikasi     |
| PATCH  | `/app/settings` | `app:write:school` | Update pengaturan + AuditLog |

## Struktur File

| File                             | Isi                 |
| -------------------------------- | ------------------- |
| `app-settings.controller.ts`     | REST endpoint       |
| `app-settings.service.ts`        | Baca/update + audit |
| `dto/update-app-settings.dto.ts` | DTO update          |
