# README.alumni.md — Modul Alumni (apps/api/src/modules/alumni)

## Fungsi Folder

Direktori & tracking lulusan: daftar alumni per tahun kelulusan/status/pencarian,
buat alumni dari data kelulusan, dan arsip/aktifkan kembali. Tidak ada kode
permission `alumni:*` di seed, jadi dipakai kode terdekat (`user:read:school` /
`user:write:school`).

## Daftar Fitur

- Daftar alumni dengan filter.
- Buat alumni dari data kelulusan.
- Arsip / aktifkan kembali.

## Endpoint (prefix global `/api/v1`)

| Method | Path                    | Permission          | Deskripsi                                  |
| ------ | ----------------------- | ------------------- | ------------------------------------------ |
| GET    | `/alumni`               | `user:read:school`  | Daftar alumni (filter tahun/status/search) |
| POST   | `/alumni`               | `user:write:school` | Buat alumni dari kelulusan                 |
| PATCH  | `/alumni/:id/archive`   | `user:write:school` | Arsipkan alumni                            |
| PATCH  | `/alumni/:id/unarchive` | `user:write:school` | Aktifkan kembali                           |

## Struktur File

| File                   | Isi                           |
| ---------------------- | ----------------------------- |
| `alumni.controller.ts` | REST endpoint                 |
| `alumni.service.ts`    | List/create/archive/unarchive |
| `dto/alumni.dto.ts`    | DTO                           |
