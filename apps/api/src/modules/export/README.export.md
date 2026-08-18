# README.export.md — Modul Export (apps/api/src/modules/export)

## Fungsi Folder

Generator + akses hasil ekspor (baca/unduh `DataExportLog`): **PDF rapor per
siswa** (e-Rapor v2, `RaporExportService`) dan **Dapodik 3 CSV**
(`DapodikExportService` + `DapodikController`). Generator dieksekusi via job
`report.generate` (`ReportProcessor` di JobsModule — dispatcher `export_type`
RAPOR/DAPODIK/NILAI); REST di sini hanya membuat log + enqueue serta menyediakan
baca/unduh hasil. **Download log-scoped**: pemilik log (`requested_by`) ATAU
pemegang `export:read:school` (row-level, defense-in-depth — `ExportService.getExportLog`).

## Daftar Fitur

- Baca metadata log ekspor: `GET /exports/:id` — status, `file_url`, `record_count`,
  `started_at`/`finished_at`; autorisasi pemilik ATAU `export:read:school`.
- Unduh file: `GET /exports/:id/download?file=<nama>` — stream dari
  `STORAGE_EXPORT_DIR` dengan containment `resolveExportPath` (anti-traversal);
  log multi-file (Dapodik) wajib param `file` (basename).
- Generator **rapor-pdf**: `RaporExportService.generate(log, params)` — ambil
  data via `RaporService.getRaporData` (tanpa auth), PDF hand-rolled
  `rapor-pdf.ts` (footer "Draft Sistem"), tulis ke `exports/rapor_<stamp>.pdf`,
  update log → COMPLETED (`file_url`) / FAILED (`finished_at`).
- Generator **dapodik**: `DapodikExportService.generate(log, params)` — 3 CSV
  ber-BOM UTF-8 (`peserta_didik.csv`, `pendidik.csv`, `rombongan_belajar.csv`)
  ke `exports/dapodik_<stamp>/`, `file_url` comma-separated.

## Endpoint (prefix global `/api/v1`)

| Method | Path                    | Permission                                                                                                        | Deskripsi                                                                           |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/exports/:id`          | `export:read:school` / `report:export:school` / `report:export:class` / `report:export:self` / `report:read:self` | Metadata log ekspor (auth aktual: pemilik ATAU `export:read:school`)                |
| GET    | `/exports/:id/download` | sama dengan di atas                                                                                               | Unduh file (param `file` untuk log multi-file)                                      |
| POST   | `/dapodik/export`       | `export:run:school`                                                                                               | Buat ekspor Dapodik via job (catat log DAPODIK PENDING → enqueue `report.generate`) |

Catatan: `GET /exports/:id` memakai **set permission gabungan** di guard agar
pemilik log (mis. SISWA yang mengekspor rapor sendiri) bisa lewat; autorisasi
sebenarnya (pemilik ATAU `export:read:school`) ditegakkan di
`ExportService.getExportLog` (row-level, defense-in-depth).

## Dispatcher: ReportProcessor

`jobs/processors/report.processor.ts:58-70` — switch `log.export_type`:

| export_type | Generator              | Keterangan                                                                                                                     |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `RAPOR`     | `RaporExportService`   | PDF per siswa; params `studentId` (wajib), `semester`, `academicYear`                                                          |
| `DAPODIK`   | `DapodikExportService` | 3 CSV; params `academicYear` opsional                                                                                          |
| `NILAI`     | — (lempar error)       | Ekspor NILAI tetap sinkron via `GradesController` (grade-export.service); via job **menolak** agar tidak mencatat sukses palsu |
| lainnya     | — (lempar error)       | `export_type` tak dikenal → FAILED                                                                                             |

Idempoten: status COMPLETED/PROCESSING dilewati; alur PENDING → PROCESSING
(`started_at`) → COMPLETED/FAILED.

## Struktur File

| Path                             | Isi                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `export.controller.ts`           | `GET /exports/:id` + `GET /exports/:id/download` (guard gabungan)               |
| `dapodik.controller.ts`          | `POST /dapodik/export` (`export:run:school`) — buat log + enqueue               |
| `export.service.ts`              | Autoriasi log (pemilik/`export:read:school`) + stream download (anti-traversal) |
| `rapor-export.service.ts`        | Generator PDF rapor per siswa (via job)                                         |
| `dapodik-export.service.ts`      | Generator Dapodik 3 CSV (BOM UTF-8)                                             |
| `dto/export-dapodik.dto.ts`      | DTO `ExportDapodikDto` (`academicYear` opsional)                                |
| `export.module.ts`               | Registrasi; generator DIEKSPOR untuk ReportProcessor (JobsModule)               |
| `export.service.spec.ts`         | Test autorisasi + download                                                      |
| `dapodik-export.service.spec.ts` | Test generator Dapodik                                                          |
