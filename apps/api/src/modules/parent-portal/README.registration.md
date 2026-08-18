# Registrasi Modul — Portal Wali Murid (prd04 §5.L)

**Status:** Sudah terdaftar di `app.module.ts` (imports: `ParentPortalModule`).

## Registrasi

```ts
import { ParentPortalModule } from "./modules/parent-portal/parent-portal.module";
// imports: [ ..., ParentPortalModule ]
```

## Endpoint

Semua 9 route memakai `@RequirePermission` (RBAC aktif, `parent-portal.controller.ts`):

- `GET /parent-portal/links/pending` — antrian tautan PENDING (OPERATOR/SUPERADMIN, `parent:link:approve:school`).
- `POST /parent-portal/links/:linkId/approve` — setujui tautan anak (OPERATOR/SUPERADMIN).
- `POST /parent-portal/links/:linkId/reject` — tolak tautan anak (OPERATOR/SUPERADMIN).
- `POST /parent-portal/me` — pastikan ParentGuardian untuk user wali (`user:write:self`).
- `GET /parent-portal/me` — data ParentGuardian milik sendiri (`report:read:self`).
- `POST /parent-portal/:parentGuardianId/children` — tautkan anak (ParentStudentLink; relasi AYAH/IBU/WALI; `user:write:self`).
- `GET /parent-portal/:parentGuardianId/children` — daftar anak (`report:read:self`).
- `GET .../children/:studentId/overview` — ringkasan nilai/absensi/tagihan anak (read-only; `report:read:self`).
- `GET .../children/:studentId/consents` — izin/data consent anak (`report:read:self`).

## Keamanan

- **Scope SENDIRI**: akses data anak WAJIB lolos cek ParentStudentLink; anak tanpa tautan → 403.
- **RBAC IMPLEMENTED (2026-08-16)**: seluruh 9 route sudah `@RequirePermission` +
  `@Roles` (lihat daftar di atas); marker TODO RBAC lama sudah usang. Route
  `links/*` membatasi role OPERATOR/SUPERADMIN; route wali membatasi WALI_MURID.
- Tautan anak berstatus PENDING/REJECTED tidak bisa diakses wali (guard scope SENDIRI).

## Catatan

- Unit test: `src/modules/parent-portal/parent-portal.service.spec.ts` (scope SENDIRI).
