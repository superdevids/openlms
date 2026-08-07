# Registrasi Modul — Academic (jadwal & kurikulum)

**Status:** Sudah terdaftar di `app.module.ts` (imports: `AcademicModule`).

## Registrasi

```ts
import { AcademicModule } from "./modules/academic/academic.module";
// imports: [ ..., AcademicModule ]
```

## Endpoint (prefix global `api/v1`)

- `POST/GET /academic/schedules`, `PATCH/DELETE /academic/schedules/:id` — CRUD jadwal
  - Validasi bentrok: guru (teacher_id + hari + periode) dan ruang (room + hari + periode) saling tumpang tindih → 409.
  - Guard arsip: tulis ke kelas tahun CLOSED → 403 ARCHIVED_YEAR (AcademicYearGuard).
  - `GET` mendukung filter `classId`, `teacherId`, `academicYear` (historis).
- `GET/POST /academic/curriculum`, `GET/DELETE /academic/curriculum/:id` — referensi CP/ATP.

## Catatan

- **CP/ATP = model sederhana dalam memori** (CurriculumService). Schema Prisma belum punya
  entitas kurikulum → **ISSUES: schema gap**; ganti dengan repository Prisma saat entitas tersedia.
- `AcademicYearGuard` dipakai modul lain (rollover, ppdb) untuk guard arsip terpusat.
- TODO RBAC: tulis jadwal/kurikulum hanya OPERATOR/WAKEPSEK/SUPERADMIN.
- Unit test: `test/unit/academic-year.guard.spec.ts`, `test/unit/schedule.service.spec.ts`.
