# Registrasi Modul — SMK (PKL, UKK, DUDI)

> ## STATUS: IMPLEMENTED — catatan historis (2026-08-16)
>
> Dokumen ini adalah **catatan historis** saat modul masih berbentuk registrasi
> awal. Implementasi aktual: RBAC global aktif — seluruh route memakai
> `@RequirePermission` (`internship:*`, `competency:grade:*`,
> `partner:write:school`); scope SENDIRI (mentor/penguji) di-enforce service.
> Klaim "TODO RBAC" di bawah sudah usang.

**Status:** Sudah terdaftar di `app.module.ts` (imports: `SmkModule`).

## Registrasi

```ts
import { SmkModule } from "./modules/smk/smk.module";
// imports: [ ..., SmkModule ]
```

## Endpoint

- **PKL** (`/smk/internships`): create, daftar by mentor/siswa, jurnal harian, verifikasi jurnal (`PATCH /journals/:id/verify`), penilaian pembimbing industri (`PATCH :id/complete`).
  - Scope: verifikasi/penilaian hanya pembimbing siswa tsb (school_mentor ATAU industry_mentor) → 403 selain itu.
- **UKK** (`/smk/competency-tests`): create + rubrik, `POST :id/rubric`, penilaian penguji (`POST :id/grade`).
  - Penguji eksternal hanya menilai tes yang ditugaskan (examiner_id). Lulus jika skor >= 70.
- **DUDI** (`/smk/partners`): direktori mitra + pencarian, CRUD mitra, tambah/list pembimbing industri.

## Catatan

- TODO RBAC: PKL (GURU/OPERATOR + PEMBIMBING_INDUSTRI), UKK (GURU + PENGUJI_EKSTERNAL), DUDI (OPERATOR/WAKEPSEK).
  > **Pembaruan 2026-08-16:** RBAC global aktif — seluruh route memakai
  > `@RequirePermission` (`internship:*`, `competency:grade:*`, `partner:write:school`
  > — `smk.controller.ts:44-225`); scope SENDIRI (mentor/penguji) di-enforce service.
- Unit test: `test/unit/internship.service.spec.ts`.
