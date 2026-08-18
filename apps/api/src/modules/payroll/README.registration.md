# REGISTRATION — Modul Payroll (Gelombang 2, prd04 §5.E)

> ## STATUS: IMPLEMENTED (2026-08-16)
>
> Seluruh bagian di bawah (termasuk §4 "Entitas W2 yang BELUM ada…") adalah
> **catatan historis** saat modul masih pakai store in-memory. Implementasi aktual:
>
> - **Semua entitas sudah ada di `schema.prisma`**:
>   `JobPosition` (baris 2141), `PayrollComponent` (2155), `SalaryStructure`
>   (2173), `PayrollPeriodConfig` (2187), `PayrollRun` (2205), `PayrollRunItem`
>   (2228), `Payslip` (2253).
> - Modul terintegrasi di `app.module.ts` (`PayrollModule`, import baris 20 —
>   terdaftar baris 102) memakai `PrismaPayrollStore`; kalkulator
>   `calculator/tax.ts`, `bpjs.ts`, `payroll-calc.ts` tetap aktif.
> - Fitur tambahan: kategori TER PPh21 bulanan per pegawai (`Staff.ter_category`,
>   `schema.prisma:1333`, migrasi `20260816000000_staff_ter_category`) + endpoint
>   `PATCH /payroll/staff/:staffId/ter-category`.

Status: **SIAP DIIMPLEMENTASI / PERSISTENCE W2 MENYUSUL** (lih. ISSUES).

## 1. Tujuan

Master kepegawaian (JobPosition, PayrollComponent, SalaryStructure), payroll
run bulanan dengan state machine, kalkulator pajak PPh 21 TER & BPJS
terkonfigurasi per periode, slip gaji digital, dan laporan rekap
(prd04 §5.E.1–§5.E.5; 05 W2-PAYROLL).

## 2. Kontrak API (prefix `/api/v1/payroll`)

| Method | Path                       | Permission                             | Deskripsi                                           |
| ------ | -------------------------- | -------------------------------------- | --------------------------------------------------- |
| POST   | /job-positions             | payroll:write:school                   | Buat jabatan                                        |
| GET    | /job-positions             | payroll:read:school                    | Daftar jabatan                                      |
| POST   | /job-positions/:id         | payroll:write:school                   | Ubah jabatan                                        |
| GET    | /components                | payroll:read:school                    | Daftar komponen gaji (seed standar)                 |
| POST   | /components                | payroll:component:write:school         | Registrasi/ubah komponen                            |
| POST   | /salary-structures         | payroll:write:school                   | Struktur gaji pegawai (riwayat effective_from)      |
| GET    | /salary-structures         | payroll:read:school                    | Daftar struktur (filter staffId)                    |
| POST   | /runs                      | payroll:run:school                     | Buat run (DRAFT, idempoten per periode)             |
| GET    | /runs                      | payroll:read:school                    | Daftar run                                          |
| GET    | /runs/:id                  | payroll:read:school                    | Detail run + item                                   |
| POST   | /runs/:id/calculate        | payroll:run:school                     | Hitung (tarik kehadiran + kalkulator) -> CALCULATED |
| POST   | /runs/:id/validate         | payroll:run:school                     | Validasi (net >= UMR) -> VALIDATED                  |
| POST   | /runs/:id/approve-keuangan | payroll:approve:school                 | Approval 1 KEUANGAN                                 |
| GET    | /runs/:id/rekap            | payroll:approve:school                 | Rekap KEPSEK (ringkasan, bukan detail)              |
| POST   | /runs/:id/approve-kepsek   | payroll:approve:school                 | Approval 2 KEPSEK -> PAID + payslip                 |
| GET    | /payslips/me/:staffId      | payslip:read:self                      | Slip sendiri (field-level)                          |
| GET    | /payslips/:id              | payroll:read:school, payslip:read:self | Detail slip                                         |
| GET    | /reports/summary           | payroll:read:school                    | Beban gaji per periode                              |
| GET    | /reports/comparison        | payroll:read:school                    | Komparasi bulanan                                   |
| GET    | /reports/deductions        | payroll:read:school                    | Rekap PPh 21 & BPJS                                 |

RBAC aktif: guard global `AuthGuard` → `PermissionsGuard` (fail-closed).
Aktor dibaca dari `@CurrentUser` (AuthGuard); handler non-publik melempar
`UnauthorizedException` bila konteks autentikasi tidak ditemukan (tidak ada
fallback "system"). Header dev `x-user-id` / `x-user-roles` sudah dihapus.

## 3. Keputusan desain

- **Uang = Decimal (Prisma.Decimal, 12,2)**; DTO string desimal.
- **Kalkulator pajak/BPJS = modul terisolasi & teruji** (`calculator/tax.ts`,
  `calculator/bpjs.ts`, `calculator/payroll-calc.ts`) — murni, tanpa I/O.
- **Seluruh tarif/ceiling dari KONFIGURASI per periode** (`PayrollPeriodConfig`,
  seed default 2026 di `calculator/config-defaults.ts`), BUKAN hardcode di
  logika (prd04 §5.E.3). Nilai contoh wajib diverifikasi saat build (open
  items §13).
- **State machine PayrollRun**: DRAFT -> CALCULATED -> VALIDATED ->
  APPROVED_KEUANGAN -> REKAP_KEPSEK -> PAID; transisi divalidasi + AuditLog.
- **Idempotensi**: satu run per periode (findRunByPeriod); PAID tidak bisa
  dibuat ulang.
- **Privasi gaji (prd04 §5.E.5)**: KEPSEK hanya lihat rekap ringkasan
  (`rekapForKepsek`), bukan detail per pegawai; slip pegawai scope
  `payslip:read:self` di-enforce di service (staffId di-resolve dari
  `Staff.user_id` — anti-IDOR; role payroll:read:school bebas).
- **Komponen variabel** (HONOR_MENGAJAR x JTM, LEMBUR) dihitung dari input
  jam mengajar/lembur per pegawai; tunjangan kehadiran dihitung dari
  StaffAttendance (hari HADIR/TERLAMBAT) bulan berjalan.

## 4. Entitas W2 yang BELUM ada di schema.prisma (butuh skema)

| Entitas             | Penggunaan saat ini                 | Proposal skema                                                                                                                                                                                                                                        |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JobPosition         | InMemoryPayrollStore                | `model JobPosition { id, code unik, name, default_jabatan_allowance Decimal, active, created_by, timestamps }`                                                                                                                                        |
| PayrollComponent    | InMemoryPayrollStore (seed standar) | `model PayrollComponent { id, code unik, name, category, kind, is_taxable, is_bpjs_applicable, unit?, description, active, timestamps }`                                                                                                              |
| SalaryStructure     | InMemoryPayrollStore                | `model SalaryStructure { id, staff_id FK, effective_from, components Json, attendance_allowance_per_day Decimal?, created_by, timestamps }`                                                                                                           |
| PayrollRun          | InMemoryPayrollStore                | `model PayrollRun { id, period unik, status, total_gross Decimal, total_deductions Decimal, total_net Decimal, staff_count, approved_by_keuangan?, approved_by_kepsek?, paid_at?, note?, created_by, timestamps }`                                    |
| PayrollRunItem      | InMemoryPayrollStore                | `model PayrollRunItem { id, run_id FK, staff_id FK, gross, pph21, bpjs_kesehatan, bpjs_jht, bpjs_jp, other_deductions, total_deductions, net (Decimal), attendance_days Int, below_umr Boolean, warnings Json, detail_components Json }`              |
| Payslip             | InMemoryPayrollStore                | `model Payslip { id, run_id FK, staff_id FK, period, status, snapshots Json, timestamps }`                                                                                                                                                            |
| PayrollPeriodConfig | InMemoryPayrollStore (seed)         | `model PayrollPeriodConfig { id, period unik, umr Decimal, ter_monthly Json, ter_daily Json, honor_dpp_percent Decimal, pns_final_rate_percent Decimal, bpjs_kesehatan Json, bpjs_jht Json, bpjs_jp Json, pasal17_rate_percent Decimal, timestamps }` |

## 5. Unit test

- `calculator/tax.spec.ts` — PPh 21 TER bulanan (bracket dari config),
  TER harian, honorarium DPP 50%, PNS final.
- `calculator/bpjs.spec.ts` — potongan BPJS Kesehatan/JHT/JP (ceiling).
- `calculator/payroll-calc.spec.ts` — gross/net, potongan, UMR warning.

## 6. Hand-off

- Integration coder: `PayrollModule` sudah terdaftar di `app.module.ts`; yang tersisa:
  tambah skema W2 + `PrismaPayrollStore` (adapter PayrollStore).
- Reviewer: verifikasi tarif contoh (open item §13) & privasi gaji KEPSEK.
