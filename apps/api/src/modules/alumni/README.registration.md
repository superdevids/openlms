# Registrasi Modul — Alumni (direktori & tracking)

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
- Unit test: `test/unit/alumni.service.spec.ts`.
