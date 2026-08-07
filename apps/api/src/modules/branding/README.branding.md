# README.branding.md — Modul Branding (apps/api/src/modules/branding)

## Fungsi Folder

Identitas visual aplikasi (single-school): nama aplikasi, tagline, logo,
favicon, warna, radius. `GET /app/branding` dipanggil setiap load halaman web →
respons di-cache in-memory (TTL `CACHE_TTL_MS`, default 60s) + ETag berbasis
`config_version` untuk conditional fetch (304).

## Daftar Fitur

- Baca branding publik (pre-login) — ETag `"branding-{configVersion}"`.
- Update branding (PATCH) — bump `config_version`, AuditLog, emit
  Socket.IO `branding:changed`, invalidasi cache.
- Upload logo / favicon (multipart, max 2MB).

## Endpoint (prefix global `/api/v1`)

| Method | Path                    | Permission         | Deskripsi                        |
| ------ | ----------------------- | ------------------ | -------------------------------- |
| GET    | `/app/branding`         | Publik             | Baca branding (ETag conditional) |
| PATCH  | `/app/branding`         | `app:write:school` | Update branding                  |
| POST   | `/app/branding/logo`    | `app:write:school` | Upload logo                      |
| POST   | `/app/branding/favicon` | `app:write:school` | Upload favicon                   |

## Struktur File

| File                         | Isi                                           |
| ---------------------------- | --------------------------------------------- |
| `branding.controller.ts`     | REST endpoint + ETag/304                      |
| `branding.service.ts`        | Cache TTL + load/update/setAsset + invalidate |
| `branding.types.ts`          | `BrandingView`                                |
| `dto/update-branding.dto.ts` | DTO                                           |
