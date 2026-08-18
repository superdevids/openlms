# Registrasi Modul — Alumni (direktori & tracking)

> ## STATUS: IMPLEMENTED — catatan historis (2026-08-16)
>
> Dokumen ini adalah **catatan historis** saat modul masih berbentuk registrasi
> awal. Implementasi aktual: RBAC global aktif — route memakai
> `@RequirePermission` (`user:read:school`, `user:write:school`).
> Klaim "TODO RBAC" di bawah sudah usang.

**Status:** Sudah terdaftar di `app.module.ts` (imports: `AlumniModule`).

## Registrasi

```ts
import { AlumniModule } from "./modules/alumni/alumni.module";
// imports: [ ..., AlumniModule ]
```

## Endpoint

- `GET /alumni?graduationYearId=&status=&search=` — direktori alumni (filter angkatan, status ACTIVE/ARCHIVED, pencarian nama/NISN).
- `POST /alumni` — buat alumni dari siswa berenrollment GRADUATED di tahun kelulusan.
- `PATCH /alumni/:id/archive|unarchive` — tracking dasar.

## Catatan

- Data alumni utama lahir otomatis dari **rollover execute** (langkah `graduate`).
- TODO RBAC: tulis OPERATOR/WAKEPSEK; baca internal sekolah.
  > **Pembaruan 2026-08-16:** RBAC global aktif — route memakai
  > `@RequirePermission` (`user:read:school`, `user:write:school` —
  > `alumni.controller.ts:32-54`).
- Unit test: `test/unit/alumni.service.spec.ts`.
