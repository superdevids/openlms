# README.parent-portal.md — Modul Parent Portal (apps/api/src/modules/parent-portal)

## Fungsi Folder

Portal **wali murid**: profil orang tua, tautkan anak (ParentStudentLink), lihat
daftar anak, overview nilai/absensi/tagihan, dan consent. Seluruh route khusus
`WALI_MURID` dengan scope SENDIRI (`report:read:self` / `user:write:self`).
Identitas user dari `request.requestContext`.

## Keamanan (SEC-001 — IDOR fix)

- **Kepemilikan wali diverifikasi:** `linkChild`, `listChildren`,
  `getStudentOverview`, dan `getChildConsents` WAJIB lolos `resolveOwnedParent`
  — `ParentGuardian.id` di path harus `parent.user_id === actor.userId`, jika
  tidak → `403` ("bukan akun Anda").
- **Hanya siswa aktif ber-role SISWA yang sah ditautkan:** user target harus
  `is_active` dan punya `UserRole` SISWA status ACTIVE, jika tidak → `403`.
- **Scope SENDIRI data anak:** overview/consent hanya boleh mengakses siswa yang
  benar-benar terhubung lewat `ParentStudentLink` milik wali aktor (`assertChildAccess`),
  jika tidak → `403`.
- **Allowlist persetujuan (Rv5-17):** OPERATOR menyetujui/menolak tautan wali-anak
  lewat `listPendingLinks` / `approveLink` / `rejectLink`; tautan hanya efektif
  (bisa diakses wali) setelah status `APPROVED`.

## Daftar Fitur

- Buat/lengkapi profil orang tua.
- Tautkan anak (dengan relationship).
- Lihat daftar anak + overview + consent.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                                            | Permission                                         | Deskripsi                                                                     |
| ------ | --------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| GET    | `/parent-portal/links/pending`                                  | `parent:link:approve:school` (OPERATOR/SUPERADMIN) | Antrian tautan wali-anak status PENDING (allowlist, Rv5-17)                   |
| POST   | `/parent-portal/links/:linkId/approve`                          | `parent:link:approve:school` (OPERATOR/SUPERADMIN) | Setujui tautan → APPROVED (akses data anak terbuka)                           |
| POST   | `/parent-portal/links/:linkId/reject`                           | `parent:link:approve:school` (OPERATOR/SUPERADMIN) | Tolak tautan → REJECTED (wali dapat mengajukan ulang)                         |
| POST   | `/parent-portal/me`                                             | `user:write:self` (WALI_MURID)                     | Lengkapi profil orang tua                                                     |
| GET    | `/parent-portal/me`                                             | `report:read:self` (WALI_MURID)                    | Ambil profil orang tua sendiri (milik aktor)                                  |
| POST   | `/parent-portal/:parentGuardianId/children`                     | `user:write:self` (WALI_MURID)                     | Tautkan anak (hanya wali milik aktor; siswa aktif SISWA; status awal PENDING) |
| GET    | `/parent-portal/:parentGuardianId/children`                     | `report:read:self` (WALI_MURID)                    | Daftar anak (hanya wali milik aktor)                                          |
| GET    | `/parent-portal/:parentGuardianId/children/:studentId/overview` | `report:read:self` (WALI_MURID)                    | Overview anak (hanya anak yang terhubung)                                     |
| GET    | `/parent-portal/:parentGuardianId/children/:studentId/consents` | `report:read:self` (WALI_MURID)                    | Consent anak (hanya anak yang terhubung)                                      |

## Struktur File

| File                          | Isi                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `parent-portal.controller.ts` | REST endpoint                                                                                                              |
| `parent-portal.service.ts`    | ensureParent/getMyParentGuardian/linkChild/listChildren/overview/consents + resolveOwnedParent/assertChildAccess (SEC-001) |
| `dto/parent-portal.dto.ts`    | DTO                                                                                                                        |
