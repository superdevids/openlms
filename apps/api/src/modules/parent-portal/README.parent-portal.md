# README.parent-portal.md — Modul Parent Portal (apps/api/src/modules/parent-portal)

## Fungsi Folder

Portal **wali murid**: profil orang tua, tautkan anak (ParentStudentLink), lihat
daftar anak, overview nilai/absensi/tagihan, dan consent. Seluruh route khusus
`WALI_MURID` dengan scope SENDIRI (`report:read:self` / `user:write:self`).
Identitas user dari `request.requestContext`.

## Daftar Fitur

- Buat/lengkapi profil orang tua.
- Tautkan anak (dengan relationship).
- Lihat daftar anak + overview + consent.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                                            | Permission                      | Deskripsi                 |
| ------ | --------------------------------------------------------------- | ------------------------------- | ------------------------- |
| POST   | `/parent-portal/me`                                             | `user:write:self` (WALI_MURID)  | Lengkapi profil orang tua |
| POST   | `/parent-portal/:parentGuardianId/children`                     | `user:write:self` (WALI_MURID)  | Tautkan anak              |
| GET    | `/parent-portal/:parentGuardianId/children`                     | `report:read:self` (WALI_MURID) | Daftar anak               |
| GET    | `/parent-portal/:parentGuardianId/children/:studentId/overview` | `report:read:self` (WALI_MURID) | Overview anak             |
| GET    | `/parent-portal/:parentGuardianId/children/:studentId/consents` | `report:read:self` (WALI_MURID) | Consent anak              |

## Struktur File

| File                          | Isi                                                   |
| ----------------------------- | ----------------------------------------------------- |
| `parent-portal.controller.ts` | REST endpoint                                         |
| `parent-portal.service.ts`    | ensureParent/linkChild/listChildren/overview/consents |
| `dto/parent-portal.dto.ts`    | DTO                                                   |
