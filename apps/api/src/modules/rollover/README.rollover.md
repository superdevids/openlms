# README.rollover.md — Modul Rollover (apps/api/src/modules/rollover)

## Fungsi Folder

Wizard **rollover tahun ajaran**: membuat tahun ajaran baru dengan menyalin
struktur akademik dari tahun sebelumnya, termasuk opsi rollover keuangan/payroll
dan pemetaan PPDB. Proses berjenjang: draft → pre-check → dry-run → execute →
rollback, dengan `RolloverRun` + `RolloverItem` + AuditLog. Idempotensi via
`idempotencyKey`; eksekusi dapat diantrekan ke job (`JOB_NAMES.ROLLOVER_EXECUTE`).

## Daftar Fitur

- Draft rencana rollover (dengan opsi & override).
- Pre-check dan dry-run (simulasi tanpa menulis).
- Execute (menyalin kelas/mapel/enrollment/nilai/finance sesuai opsi).
- Rollback dengan alasan (revert perubahan run).
- Riwayat run + filter tahun ajaran/status.

## Endpoint (prefix global `/api/v1`)

| Method | Path                         | Permission                                               | Deskripsi                   |
| ------ | ---------------------------- | -------------------------------------------------------- | --------------------------- |
| POST   | `/rollover/draft`            | `rollover:preview:school`                                | Buat draft rencana rollover |
| POST   | `/rollover/:runId/pre-check` | `rollover:preview:school`                                | Pre-check rencana           |
| POST   | `/rollover/:runId/dry-run`   | `rollover:preview:school`                                | Simulasi tanpa menulis      |
| POST   | `/rollover/:runId/execute`   | `rollover:execute:school`                                | Eksekusi rollover           |
| POST   | `/rollover/:runId/rollback`  | `rollover:rollback:school`                               | Rollback dengan alasan      |
| GET    | `/rollover`                  | `rollover:history:read:school`/`rollover:preview:school` | Riwayat run                 |

## Struktur File

| File                     | Isi                                     |
| ------------------------ | --------------------------------------- |
| `rollover.controller.ts` | REST endpoint                           |
| `rollover.service.ts`    | Draft/precheck/dry-run/execute/rollback |
| `dto/rollover.dto.ts`    | DTO                                     |
