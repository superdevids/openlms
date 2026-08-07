# Registrasi Modul — Rollover (tahun ajaran) — KRITIS (prd04 §5.R)

**Status:** Sudah terdaftar di `app.module.ts` (imports: `RolloverModule`).

## Registrasi

```ts
import { RolloverModule } from "./modules/rollover/rollover.module";
// imports: [ ..., RolloverModule ]
```

## Alur wizard (05 M-ROLLOVER-T1..T6)

1. `POST /rollover/draft` — buat AcademicYear baru (DRAFT) + RolloverRun (DRAFT); satu run per tahun (`@@unique academic_year_id`), `idempotency_key` unik.
2. `POST /rollover/:runId/pre-check` — validasi: nilai/rapor final, absensi final, tanpa attempt IN_PROGRESS, invoice sesuai flag, backup wajib dikonfirmasi → laporan bloker (status → PREVIEW).
3. `POST /rollover/:runId/dry-run` — hitung rencana promosi (PROMOTED/REPEATED/GRADUATED/TRANSFERRED/DROPPED) **tanpa menulis**; simpan snapshot.
4. `POST /rollover/:runId/execute` — job async sederhana: BullMQ belum terpasang → langkah berurutan + transaksi per langkah + **resume dari FAILED** (langkah DONE dilewati). Rencana wajib identik dengan dry-run (konsistensi). Langkah: close-source → create-classes → copy-curriculum → graduate (Alumni + ekspor rapor) → promote (Enrollment baru) → ppdb-enroll → set-current (SchoolProfile + status OPEN/CLOSED).
5. `POST /rollover/:runId/rollback` — window 7 hari; deteksi pristine via AuditLog (ada tulis ke entitas terdampak setelah execute → tolak); balik status + hapus data yang dibuat.
6. `GET /rollover?academicYearId=&status=` — filter akademik.

## Catatan

- **RolloverItem tidak ada di schema** → status langkah disimpan di `step_state` (Json) — ISSUES.
- `precheck_result`, `summary`, `step_state` memakai kolom Json schema.
- TODO RBAC: seluruh endpoint OPERATOR/WAKEPSEK/SUPERADMIN.
- Unit test: `test/unit/rollover.promotion.spec.ts`, `test/unit/rollover.service.spec.ts`.
