# README.maintenance.md — Modul Maintenance (apps/api/src/modules/maintenance)

## Fungsi Folder

Status sistem global / **maintenance mode**: endpoint publik ringan untuk
healthcheck aplikasi (selalu bekerja), serta kontrol mode maintenance oleh
SUPERADMIN (AuditLog). Data status disimpan di `SystemStatus`.

## Daftar Fitur

- Status sistem publik (`GET /public/system-status`) — allowlist, tanpa auth.
- Lihat status admin (`system:status:read`).
- Nyalakan/matikan maintenance mode (`system:maintenance:write`) + AuditLog.

## Endpoint (prefix global `/api/v1`)

| Method | Path                        | Permission                              | Deskripsi                          |
| ------ | --------------------------- | --------------------------------------- | ---------------------------------- |
| GET    | `/public/system-status`     | Publik                                  | Status sistem publik               |
| GET    | `/admin/system/maintenance` | `system:status:read` (SUPERADMIN)       | Status maintenance                 |
| PUT    | `/admin/system/maintenance` | `system:maintenance:write` (SUPERADMIN) | Update mode maintenance + AuditLog |

## Struktur File

| File                            | Isi                           |
| ------------------------------- | ----------------------------- |
| `maintenance.controller.ts`     | REST endpoint                 |
| `maintenance.service.ts`        | Baca/update status + AuditLog |
| `maintenance.constants.ts`      | Konstanta                     |
| `dto/update-maintenance.dto.ts` | DTO                           |
