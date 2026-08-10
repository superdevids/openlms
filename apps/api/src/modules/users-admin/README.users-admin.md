# README.users-admin.md — Modul Users Admin (apps/api/src/modules/users-admin)

## Fungsi Folder

Daftar user untuk tab **Manajemen User** di Admin Sistem: `GET /admin/users`.
Scope RBAC `user:read:school` (SUPERADMIN + OPERATOR). Daftar ini **tidak pernah
menyertakan PII sensitif** (`password_hash` tidak di-query) — hanya field
profil dasar + role aktif.

## Daftar Fitur

- List user dengan search opsional (`search` pada `full_name`, `username`,
  `email`, case-insensitive).
- Pagination sederhana: `pageSize` (query string, default 100, dibatasi 1..500).
- Tiap item menyertakan `roles` aktif (`UserRole.status = ACTIVE`) dan status
  `isActive`, `lastLoginAt`, `createdAt`.

## Endpoint (prefix global `/api/v1`)

| Method | Path           | Permission                               | Deskripsi                |
| ------ | -------------- | ---------------------------------------- | ------------------------ |
| GET    | `/admin/users` | `user:read:school` (SUPERADMIN/OPERATOR) | Daftar user + role aktif |

Query: `search` (opsional), `pageSize` (opsional, default 100).

Respons (`AdminUserPage`):

```json
{
  "items": [
    {
      "id": "user-id",
      "username": "andi",
      "email": "andi@school.id",
      "fullName": "Andi Saputra",
      "roles": ["SISWA"],
      "isActive": true,
      "lastLoginAt": "2026-08-09T00:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

Catatan: contoh di atas berbentuk (shape) sesuai `AdminUserView`/`AdminUserPage`
di `users-admin.service.ts`; nilai riil dari database.

## Struktur File

| File                        | Isi                                                   |
| --------------------------- | ----------------------------------------------------- |
| `users-admin.controller.ts` | Route `GET /admin/users` + guard RBAC                 |
| `users-admin.service.ts`    | Query Prisma `user` + role aktif, tanpa password_hash |
| `users-admin.module.ts`     | Registrasi modul                                      |
