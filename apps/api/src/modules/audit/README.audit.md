# README.audit.md — Modul Audit (apps/api/src/modules/audit)

## Fungsi Folder

Change-log sistem: `GET /admin/change-logs` menampilkan log perubahan
(append-only) untuk elemen sekolah. **Baca-saja** — penulisan log dilakukan oleh
`writeAudit` (lihat `modules/lms/lms-audit.ts`), modul ini hanya membaca dari
tabel `AuditLog`. Visible hanya **SUPERADMIN** dan **KEPSEK** dengan dua guard
sekaligus (AND): `@Roles` membatasi role aktif, `@RequirePermission` memastikan
permission `audit:read:school`.

## Daftar Fitur

- Daftar change-log dengan filter: `entity`, `actorId`, `action` (enum
  `AuditAction`), rentang waktu `from`/`to` (ISO-8601, `created_at` UTC).
- Pagination: `page` (≥ 1), `pageSize` (1..100, default 20).
- Dropdown entity unik (`GET /admin/change-logs/entities`) untuk filter UI.
- Tampilan mencakup `actorName` (dari relasi `User.full_name`), `before`/`after`
  (JSON diff), `ipAddress`, `createdAt`.

## Endpoint (prefix global `/api/v1`)

| Method | Path                          | Permission                              | Deskripsi                                |
| ------ | ----------------------------- | --------------------------------------- | ---------------------------------------- |
| GET    | `/admin/change-logs`          | SUPERADMIN/KEPSEK (`audit:read:school`) | Daftar change-log (filter + pagination)  |
| GET    | `/admin/change-logs/entities` | SUPERADMIN/KEPSEK (`audit:read:school`) | Daftar entity unik untuk dropdown filter |

Respons `AuditLogPage`:

```json
{
  "items": [
    {
      "id": "log-id",
      "actorId": "user-id",
      "actorName": "Nama User",
      "actorRole": "OPERATOR",
      "action": "UPDATE",
      "entity": "Invoice",
      "entityId": "invoice-id",
      "before": null,
      "after": { "status": "PAID" },
      "ipAddress": "127.0.0.1",
      "createdAt": "2026-08-10T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

Catatan: contoh di atas berbentuk (shape) sesuai `AuditLogItemView`/`AuditLogPage`
di `audit-log.service.ts`; isi `before`/`after` mengikuti payload `writeAudit`.

## Struktur File

| File                         | Isi                                 |
| ---------------------------- | ----------------------------------- |
| `audit-log.controller.ts`    | Route list + entities + guard RBAC  |
| `audit-log.service.ts`       | Query Prisma `AuditLog` + tipe view |
| `dto/query-audit-log.dto.ts` | Filter & pagination (validation)    |
| `audit-log.module.ts`        | Registrasi modul                    |
