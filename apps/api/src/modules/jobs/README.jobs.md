# README.jobs.md — Modul Jobs (apps/api/src/modules/jobs)

## Fungsi Folder

Registrasi **processor job** + helper enqueue bertipe. `JobsService` mendaftarkan
handler ke antrean (`QUEUE_TOKEN`) saat `onModuleInit`; modul domain memanggil
helper di sini (bukan queue langsung) agar nama job terpusat dan payload
tervalidasi. Sumber nama job: `queue/queue.types.ts` (`JOB_NAMES`).

## Daftar Fitur

- Processor: notifikasi (fanout), payroll run, rollover execute, report generate,
  SPP generate.
- Helper enqueue bertipe untuk tiap processor.
- Idempotensi job berbasis data (`student_id+period`, `invoice_id+period`,
  `idempotencyKey`).

## Processor (JOB_NAMES)

| Nama Job               | Processor                | Dipicu dari                          |
| ---------------------- | ------------------------ | ------------------------------------ |
| `NOTIFICATIONS_FANOUT` | `NotificationsProcessor` | Modul yang membuat notifikasi massal |
| `PAYROLL_RUN`          | `PayrollProcessor`       | `PayrollRunService`                  |
| `ROLLOVER_EXECUTE`     | `RolloverProcessor`      | `RolloverService` (idempotencyKey)   |
| `REPORT_GENERATE`      | `ReportProcessor`        | `GradeExportService` (DataExportLog) |
| `SPP_GENERATE`         | `SppProcessor`           | `FinanceJobsService` (period)        |

## Struktur File

| File              | Isi                                                     |
| ----------------- | ------------------------------------------------------- |
| `jobs.module.ts`  | Registrasi service + processor                          |
| `jobs.service.ts` | Registrasi handler + helper enqueue                     |
| `processors/`     | `notifications`, `payroll`, `rollover`, `report`, `spp` |
