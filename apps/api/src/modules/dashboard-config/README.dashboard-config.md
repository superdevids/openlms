# README.dashboard-config.md — Modul Dashboard Config (apps/api/src/modules/dashboard-config)

## Fungsi Folder

Konfigurasi kartu dashboard **per role** (tabel `RoleDashboardConfig`):
SUPERADMIN mengelola kartu untuk tiap role, dan tiap user melihat kartu aktif
yang boleh diaksesnya via `GET /dashboard/me`. Penulisan mencatat AuditLog
(`role_dashboard_config`) dan meng-invalidate cache.

## Daftar Fitur

- `GET /admin/dashboard-config`: seluruh kartu semua role (SUPERADMIN,
  `dashboard:read:school`).
- `PUT /admin/dashboard-config/:role`: **full-replace** kartu untuk satu role —
  transaksional: upsert tiap kartu `(role, feature_key)` + hapus kartu yang
  tidak dikirim + AuditLog + invalidate cache (SUPERADMIN, `dashboard:write:school`).
- `GET /dashboard/me`: kartu aktif untuk role pemanggil — dipilih role "tertinggi"
  (urutan `ROLE_PRIORITY`), difilter `required_permission` via `canAccess`
  (grants role + user override dari `PermissionsResolver`), diurutkan
  `section_order`; cache TTL 30s per role utama (bug fix: cache lama berbagi satu
  entri antar role).

## Endpoint (prefix global `/api/v1`)

| Method | Path                            | Permission                            | Deskripsi                        |
| ------ | ------------------------------- | ------------------------------------- | -------------------------------- |
| GET    | `/admin/dashboard-config`       | SUPERADMIN (`dashboard:read:school`)  | Semua kartu semua role           |
| PUT    | `/admin/dashboard-config/:role` | SUPERADMIN (`dashboard:write:school`) | Full-replace kartu role tertentu |
| GET    | `/dashboard/me`                 | `dashboard:read:self`                 | Kartu aktif untuk role pemanggil |

Body `PUT` (`UpdateDashboardConfigDto`):

```json
{
  "cards": [
    {
      "featureKey": "attendance",
      "label": "Absensi",
      "description": "Rekap kehadiran",
      "icon": "calendar",
      "href": "/dashboard/attendance",
      "sectionOrder": 1,
      "isEnabled": true,
      "requiredPermission": "attendance:read:self"
    }
  ]
}
```

Catatan: contoh di atas berbentuk (shape) sesuai `DashboardCardDto` di
`dto/update-dashboard-config.dto.ts`; kartu riil mengikuti konfigurasi sekolah.

## Struktur File

| File                                 | Isi                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `dashboard-config.controller.ts`     | Route admin + `/dashboard/me` + guard RBAC                              |
| `dashboard-config.service.ts`        | Full-replace transaksional, filter permission, cache per-role, AuditLog |
| `dto/update-dashboard-config.dto.ts` | DTO `DashboardCardDto` + `UpdateDashboardConfigDto`                     |
| `dashboard-config.module.ts`         | Registrasi modul                                                        |
