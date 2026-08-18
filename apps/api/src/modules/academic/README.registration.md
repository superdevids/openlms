# Registrasi Modul — Academic (jadwal & kurikulum)

> ## STATUS: IMPLEMENTED — catatan historis (2026-08-16)
>
> Dokumen ini adalah **catatan historis** saat modul masih berbentuk registrasi
> awal. Implementasi aktual: RBAC global aktif — seluruh route memakai
> `@RequirePermission` (`schedule:*`, `subject:*`, `academic:prodi:*`);
> kurikulum sudah dipersist ke model `CurriculumReference` (`schema.prisma:2078`).
> Klaim "TODO RBAC" / "schema gap" di bawah sudah usang.

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
  > **Pembaruan 2026-08-16:** sudah dipersist ke model `CurriculumReference`
  > (`schema.prisma:2078`; `curriculum.service.ts` kini memakai Prisma, seed
  > idempoten `curriculum.seed.ts`). Catatan lama sudah usang.
- `AcademicYearGuard` dipakai modul lain (rollover, ppdb) untuk guard arsip terpusat.
- TODO RBAC: tulis jadwal/kurikulum hanya OPERATOR/WAKEPSEK/SUPERADMIN.
  > **Pembaruan 2026-08-16:** RBAC global aktif — `schedule:*` di
  > `schedule.controller.ts`, `subject:*`/`academic:prodi:*` di
  > `curriculum.controller.ts`/`prodi.controller.ts` (semua `@RequirePermission`).
- Unit test: `test/unit/academic-year.guard.spec.ts`, `test/unit/schedule.service.spec.ts`.
