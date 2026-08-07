# README.rbac-admin.md — Modul Rbac Admin (apps/api/src/modules/rbac-admin)

## Fungsi Folder

Konsol **RBAC** untuk SUPERADMIN: daftar permission terkelompok, lihat/ubah
permission per role, dan kelola `UserPermissionOverride` per user. Perubahan
mencatat AuditLog dan **meng-invalidate cache `PermissionsResolver`** agar
berlaku instan (tanpa menunggu TTL 60s).

## Daftar Fitur

- Daftar permission (grouped).
- Lihat/ubah permission sebuah role.
- Lihat/ubah override permission per user.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                | Permission          | Deskripsi                      |
| ------ | ----------------------------------- | ------------------- | ------------------------------ |
| GET    | `/rbac/permissions`                 | `rbac:read:school`  | Daftar permission              |
| GET    | `/rbac/roles/:role/permissions`     | `rbac:read:school`  | Permission role                |
| PUT    | `/rbac/roles/:role/permissions/:id` | `rbac:write:school` | Set permission role + AuditLog |
| GET    | `/rbac/users/:id/overrides`         | `rbac:read:school`  | Override user                  |
| PUT    | `/rbac/users/:id/overrides`         | `rbac:write:school` | Set override user + AuditLog   |

## Struktur File

| File                       | Isi                                        |
| -------------------------- | ------------------------------------------ |
| `rbac-admin.controller.ts` | REST endpoint                              |
| `rbac-admin.service.ts`    | List/get/set + invalidasi cache permission |
| `dto/`                     | DTO                                        |
