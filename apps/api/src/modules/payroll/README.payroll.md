# README.payroll.md — Modul Payroll (apps/api/src/modules/payroll)

## Fungsi Folder

Penggajian sekolah: master jabatan, komponen gaji, struktur gaji pegawai, payroll
run (hitung/validasi/approval berjenjang keuangan → kepsek), payslip (privasi
gaji), dan laporan (summary, komparasi bulanan, rekap potongan PPh 21/BPJS).
Aktor selalu dari `@CurrentUser` (AuthGuard).

## Daftar Fitur

- Master: JobPosition, PayrollComponent, SalaryStructure.
- Kategori TER PPh21 bulanan per pegawai (PMK 168/2023: A/B/C) — kolom
  `Staff.ter_category` (migrasi `20260816000000_staff_ter_category`), dipakai
  kalkulator payroll run (`payroll-run.service.ts:199-204`). DTO
  `SetStaffTerCategoryDto.category` = `"A" | "B" | "C"` (wajib).
- Payroll run: create, list, detail, calculate, validate, approve-keuangan,
  rekap kepsek (tanpa detail gaji), approve-kepsek.
- Approval (keuangan/kepsek) mengirim event WS `payroll:status` ke user
  KEUANGAN/KEPSEK aktif (best-effort; REST tetap sumber kebenaran).
- Payslip: slip sendiri (scope `payslip:read:self` — anti-IDOR), detail.
- Laporan: summary per periode, komparasi bulanan, rekap potongan.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                   | Permission                                | Deskripsi                                          |
| ------ | -------------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| POST   | `/payroll/job-positions`               | `payroll:write:school`                    | Buat jabatan                                       |
| GET    | `/payroll/job-positions`               | `payroll:read:school`                     | Daftar jabatan                                     |
| POST   | `/payroll/job-positions/:id`           | `payroll:write:school`                    | Update jabatan                                     |
| GET    | `/payroll/components`                  | `payroll:read:school`                     | Daftar komponen gaji                               |
| POST   | `/payroll/components`                  | `payroll:component:write:school`          | Upsert komponen                                    |
| POST   | `/payroll/salary-structures`           | `payroll:write:school`                    | Buat struktur gaji                                 |
| GET    | `/payroll/salary-structures`           | `payroll:read:school`                     | Daftar struktur gaji                               |
| PATCH  | `/payroll/staff/:staffId/ter-category` | `payroll:write:school`                    | Set kategori TER PPh21 bulanan per pegawai (A/B/C) |
| POST   | `/payroll/runs`                        | `payroll:run:school`                      | Buat payroll run                                   |
| GET    | `/payroll/runs`                        | `payroll:read:school`                     | Daftar run                                         |
| GET    | `/payroll/runs/:id`                    | `payroll:read:school`                     | Detail run                                         |
| POST   | `/payroll/runs/:id/calculate`          | `payroll:run:school`                      | Hitung run                                         |
| POST   | `/payroll/runs/:id/validate`           | `payroll:run:school`                      | Validasi run                                       |
| POST   | `/payroll/runs/:id/approve-keuangan`   | `payroll:approve:school`                  | Approve keuangan                                   |
| GET    | `/payroll/runs/:id/rekap`              | `payroll:approve:school`                  | Rekap kepsek (ringkasan)                           |
| POST   | `/payroll/runs/:id/approve-kepsek`     | `payroll:approve:school`                  | Approve kepsek                                     |
| GET    | `/payroll/payslips/me/:staffId`        | `payslip:read:self`/`payroll:read:school` | Slip sendiri                                       |
| GET    | `/payroll/payslips/:id`                | `payroll:read:school`/`payslip:read:self` | Detail payslip                                     |
| GET    | `/payroll/reports/summary`             | `payroll:read:school`/`approve`           | Summary per periode                                |
| GET    | `/payroll/reports/comparison`          | `payroll:read:school`/`approve`           | Komparasi bulanan                                  |
| GET    | `/payroll/reports/deductions`          | `payroll:read:school`                     | Rekap potongan                                     |

## Struktur File

| Path                                 | Isi                                            |
| ------------------------------------ | ---------------------------------------------- |
| `payroll.controller.ts`              | REST endpoint                                  |
| `services/payroll-master.service.ts` | JobPosition, PayrollComponent, SalaryStructure |
| `services/payroll-run.service.ts`    | Run lifecycle + kalkulasi                      |
| `services/payslip.service.ts`        | Payslip + scope                                |
| `services/payroll-report.service.ts` | Laporan                                        |
| `dto/payroll.dto.ts`                 | DTO                                            |
