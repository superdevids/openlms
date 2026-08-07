# Registrasi Modul — SMK (PKL, UKK, DUDI)

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
- Unit test: `test/unit/internship.service.spec.ts`.
