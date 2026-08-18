# README.jobs.md — Modul Jobs (apps/api/src/modules/jobs)

## Fungsi Folder

Registrasi **processor job** + helper enqueue bertipe. `JobsService` mendaftarkan
handler ke antrean (`QUEUE_TOKEN`) saat `onModuleInit`; modul domain memanggil
helper di sini (bukan queue langsung) agar nama job terpusat dan payload
tervalidasi. Sumber nama job: `queue/queue.types.ts` (`JOB_NAMES`). Processor
cron memakai `@nestjs/schedule` (`ScheduleModule.forRoot()`).

## Daftar Fitur

- **7 JOB_NAMES** (`queue/queue.types.ts:38-48`): `NOTIFICATIONS_FANOUT`,
  `PAYROLL_RUN`, `ROLLOVER_EXECUTE`, `REPORT_GENERATE`, `SPP_GENERATE`,
  **`IMPORT_COMMIT`** (commit impor data masal — proses berat dipindah dari
  HTTP, 2026-08-16), **`AUTO_SUBMIT_EXPIRED`** (auto-submit attempt ujian &
  kuis yang waktunya habis, G-05).
- **11 file processor** di `processors/` (9 kelas processor + 2 spec:
  `rollover.processor.spec.ts`, `report.processor.spec.ts`).
- Helper enqueue bertipe untuk tiap processor (`JobsService`).
- Idempotensi job berbasis data (`student_id+period`, `invoice_id+period`,
  `idempotencyKey`, `jobId` tetap BullMQ untuk auto-submit).

## Processor (JOB_NAMES + cron)

| Nama Job / Cron        | Processor                 | Dipicu dari                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOTIFICATIONS_FANOUT` | `NotificationsProcessor`  | Modul yang membuat notifikasi massal (`JobsService.fanoutNotifications`)                                                                                                                                                                                              |
| `PAYROLL_RUN`          | `PayrollProcessor`        | `PayrollRunService`                                                                                                                                                                                                                                                   |
| `ROLLOVER_EXECUTE`     | `RolloverProcessor`       | `RolloverService` (idempotencyKey)                                                                                                                                                                                                                                    |
| `REPORT_GENERATE`      | `ReportProcessor`         | `RaporController.exportPdf` (`POST /rapor/:studentId/export-pdf`, RAPOR) + `DapodikController.export` (`POST /dapodik/export`, DAPODIK); **NILAI via job melempar error** (`report.processor.ts:65-68` — tetap sinkron via `GradesController`/`grade-export.service`) |
| `SPP_GENERATE`         | `SppProcessor`            | `FinanceJobsService` (period) + `@Cron` bulanan                                                                                                                                                                                                                       |
| `AUTO_SUBMIT_EXPIRED`  | `ExamAutoSubmitProcessor` | `@Cron` tiap menit (`exam-quiz-auto-submit`); enqueue jobId tetap bila `REDIS_URL` (BullMQ dedupe multi-instance)                                                                                                                                                     |
| `IMPORT_COMMIT`        | `ImportProcessor`         | REST onboarding/import (batch dibuat PROCESSING → processor commit baris valid + AuditLog)                                                                                                                                                                            |
| cron `0 3 1 * *`       | `PdpRetentionProcessor`   | `pdp-retention-monthly` (bulanan tanggal 1 pukul 03:00) — jalankan `PdpRetentionService.run()` sesuai `DataRetentionPolicy` (UU PDP)                                                                                                                                  |
| cron `17 3 * * *`      | `StorageCleanupProcessor` | `storage-cleanup-daily` (harian 03:17) — hapus file orphan bucket BUCKET_POLICIES > `STORAGE_ORPHAN_RETENTION_DAYS` (default 7)                                                                                                                                       |

## Struktur File

| File              | Isi                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `jobs.module.ts`  | Registrasi service + 9 processor; import modul domain (Finance, Exam, Quiz, Storage, Onboarding, Pdp, Export)                                |
| `jobs.service.ts` | Registrasi 7 handler job + helper enqueue bertipe                                                                                            |
| `processors/`     | 11 file: `notifications`, `payroll`, `rollover`, `report`, `spp`, `exam-autosubmit`, `import`, `storage-cleanup`, `pdp-retention` (+ 2 spec) |
