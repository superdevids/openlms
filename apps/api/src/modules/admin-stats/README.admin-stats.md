# README.admin-stats.md — Modul Admin Stats (apps/api/src/modules/admin-stats)

## Fungsi Folder

Statistik dashboard sekolah: `GET /admin/dashboard/stats` menghitung angka
**nyata dari database** (bukan angka contoh) untuk tab Admin Sistem. Hanya
**SUPERADMIN** dengan permission `dashboard:read:school`.

## Daftar Fitur

- Jumlah user per role aktif (`UserRole.status = ACTIVE`).
- `totalStudents` (role SISWA) dan `totalTeachers` (role GURU + BK).
- `totalClasses`: kelas dengan `is_active: true`.
- Tahun ajaran berjalan dari `SchoolProfile.current_academic_year_id`.
- Adopsi fitur: persentase feature flag efektif ON (flag sistem dihitung ON;
  flag non-sistem memakai `appFeatureSetting.enabled`, fallback `default_enabled`).

## Endpoint (prefix global `/api/v1`)

| Method | Path                     | Permission                           | Deskripsi                   |
| ------ | ------------------------ | ------------------------------------ | --------------------------- |
| GET    | `/admin/dashboard/stats` | SUPERADMIN (`dashboard:read:school`) | Statistik dashboard sekolah |

Respons (`DashboardStatsView`):

```json
{
  "usersByRole": [{ "role": "SISWA", "count": 120 }],
  "totalStudents": 120,
  "totalTeachers": 15,
  "totalClasses": 8,
  "academicYear": {
    "id": "ay-id",
    "code": "2025/2026",
    "name": "Tahun Ajaran 2025/2026",
    "status": "ACTIVE"
  },
  "adoptionPercent": 75.5,
  "featureFlagsEnabled": 12,
  "featureFlagsTotal": 16
}
```

Catatan: contoh di atas berbentuk (shape) sesuai `DashboardStatsView` di
`admin-stats.service.ts`; nilai riil dihitung dari database.

## Struktur File

| File                        | Isi                                                                               |
| --------------------------- | --------------------------------------------------------------------------------- |
| `admin-stats.controller.ts` | Route `GET /admin/dashboard/stats` + guard RBAC                                   |
| `admin-stats.service.ts`    | Hitung statistik (userRole, class, schoolProfile, featureFlag, appFeatureSetting) |
| `admin-stats.module.ts`     | Registrasi modul                                                                  |
