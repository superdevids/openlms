# Registrasi Modul — Portal Wali Murid (prd04 §5.L)

**Status:** Sudah terdaftar di `app.module.ts` (imports: `ParentPortalModule`).

## Registrasi

```ts
import { ParentPortalModule } from "./modules/parent-portal/parent-portal.module";
// imports: [ ..., ParentPortalModule ]
```

## Endpoint

- `POST /parent-portal/me` — pastikan ParentGuardian untuk user wali.
- `POST /parent-portal/:parentGuardianId/children` — tautkan anak (ParentStudentLink; relasi AYAH/IBU/WALI).
- `GET /parent-portal/:parentGuardianId/children` — daftar anak.
- `GET .../children/:studentId/overview` — ringkasan nilai/absensi/tagihan anak (read-only).
- `GET .../children/:studentId/consents` — izin/data consent anak.

## Keamanan

- **Scope SENDIRI**: akses data anak WAJIB lolos cek ParentStudentLink; anak tanpa tautan → 403.
- TODO RBAC: seluruh route WALI_MURID.

## Catatan

- Unit test: `test/unit/parent-portal.service.spec.ts` (scope SENDIRI).
