# README.finance.md — Modul Finance (apps/api/src/modules/finance)

## Fungsi Folder

Keuangan sekolah (SPP & tagihan): invoice (tunggal/bulk), pembayaran (termasuk
alokasi lintas tagihan), verifikasi, denda keterlambatan, refund (approval
berjenjang keuangan → kepsek), rekonsiliasi bank via CSV, arus kas, dan job
SPP/denda (manual trigger + cron). Semua jumlah memakai kalkulator sen
(`calculator/money`) untuk menghindari floating point.

## Daftar Fitur

- Invoice: buat tunggal/bulk, list/filter, carry-over tahun ajaran, hapus.
- SPP: generate SPP per periode, summary bulanan.
- Pembayaran: record, alokasi cicilan lintas tagihan, verifikasi, histori.
- Verifikasi pembayaran PAID mengirim notifikasi ke siswa + emit WS `invoice:paid`
  (payload ringkas: invoiceId, invoiceNo, amount, status) — best-effort.
- Denda: rule denda, job harian, daftar/hapus denda.
- Refund: buat, list, approve keuangan & kepsek.
- Rekonsiliasi: impor CSV, list, resolve item.
- Arus kas: summary per periode, catat transaksi manual.
- Job: `run-all` (SPP + denda) dengan idempotensi berbasis data.

## Keamanan (SEC-002 — scope aktor)

- Aktor pemanggil WAJIB dari `@CurrentUser` (AuthGuard); handler non-publik
  melempar `UnauthorizedException` bila konteks autentikasi tidak ditemukan.
- **Scope baca invoice (list/findById/paymentHistory):** aktor dengan scope
  SEKOLAH (`invoice:read:school` — role SUPERADMIN/OPERATOR/KEUANGAN/WAKEPSEK/
  KEPSEK/AUDITOR) boleh baca semua data. SISWA/WALI_MURID dengan
  `invoice:read:self` HANYA boleh melihat tagihan milik sendiri/anak:
  - SISWA → `student_id = userId` sendiri.
  - WALI_MURID → `student_id` dari `ParentStudentLink` (anak yang terhubung).
  - Akses di luar scope → `403` ("Anda tidak memiliki akses ke tagihan ini").
- `paymentHistory` memvalidasi kepemilikan invoice dulu (via `findById`) sebelum
  riwayat pembayaran dikembalikan.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                            | Permission                                     | Deskripsi                   |
| ------ | ----------------------------------------------- | ---------------------------------------------- | --------------------------- |
| POST   | `/finance/invoices`                             | `invoice:write:school`                         | Buat invoice                |
| POST   | `/finance/invoices/bulk`                        | `invoice:write:school`                         | Buat invoice massal         |
| GET    | `/finance/invoices`                             | `invoice:read:school`/`self`                   | Daftar invoice              |
| GET    | `/finance/invoices/:id`                         | `invoice:read:school`/`self`                   | Detail invoice              |
| POST   | `/finance/invoices/:id/carry-over`              | `invoice:write:school`                         | Carry-over tahun ajaran     |
| DELETE | `/finance/invoices/:id`                         | `invoice:write:school`                         | Hapus invoice               |
| POST   | `/finance/jobs/spp`                             | `invoice:write:school`                         | Generate SPP (manual)       |
| GET    | `/finance/invoices/summary/monthly`             | `invoice:read:school`/`cashflow:read:school`   | Summary bulanan             |
| POST   | `/finance/payments`                             | `payment:record:school`                        | Catat pembayaran            |
| POST   | `/finance/payments/allocate`                    | `payment:record:school`                        | Pembayaran alokasi cicilan  |
| POST   | `/finance/payments/:id/verify`                  | `payment:verify:school`                        | Verifikasi pembayaran       |
| GET    | `/finance/payments/invoice/:invoiceId`          | `invoice:read:school`/`self`                   | Histori pembayaran          |
| POST   | `/finance/late-fee-rules`                       | `invoice:write:school`                         | Buat rule denda             |
| GET    | `/finance/late-fee-rules`                       | `invoice:read:school`                          | Daftar rule denda           |
| POST   | `/finance/jobs/late-fee`                        | `invoice:write:school`                         | Jalankan job denda harian   |
| GET    | `/finance/dendas`                               | `invoice:read:school`                          | Daftar denda                |
| DELETE | `/finance/dendas/:invoiceNo`                    | `invoice:write:school`                         | Hapus denda                 |
| POST   | `/finance/refunds`                              | `refund:approve:school`                        | Buat refund                 |
| GET    | `/finance/refunds`                              | `refund:approve:school`/`cashflow:read:school` | Daftar refund               |
| POST   | `/finance/refunds/:id/approve-keuangan`         | `refund:approve:school`                        | Approve keuangan            |
| POST   | `/finance/refunds/:id/approve-kepsek`           | `refund:approve:school`                        | Approve kepsek              |
| POST   | `/finance/reconciliation/import`                | `reconciliation:run:school`                    | Impor rekonsiliasi CSV      |
| GET    | `/finance/reconciliation`                       | `reconciliation:run:school`                    | Daftar batch rekonsiliasi   |
| GET    | `/finance/reconciliation/:id`                   | `reconciliation:run:school`                    | Detail batch                |
| POST   | `/finance/reconciliation/items/:itemId/resolve` | `reconciliation:run:school`                    | Resolve item                |
| GET    | `/finance/cash-flow`                            | `cashflow:read:school`                         | Summary arus kas            |
| POST   | `/finance/cash-flow`                            | `invoice:write:school`                         | Catat arus kas manual       |
| POST   | `/finance/jobs/run-all`                         | `invoice:write:school`                         | Jalankan semua job keuangan |

## Struktur File

| Path                                 | Isi                              |
| ------------------------------------ | -------------------------------- |
| `finance.controller.ts`              | REST endpoint                    |
| `finance.store.ts`                   | Interface store (abstraksi data) |
| `prisma-finance.store.ts`            | Implementasi store Prisma        |
| `services/invoice.service.ts`        | Invoice + summary                |
| `services/payment.service.ts`        | Pembayaran + alokasi             |
| `services/spp-scheduler.service.ts`  | Generate SPP                     |
| `services/late-fee.service.ts`       | Denda                            |
| `services/refund.service.ts`         | Refund + approval                |
| `services/reconciliation.service.ts` | Rekonsiliasi                     |
| `services/cash-flow.service.ts`      | Arus kas                         |
| `services/finance-jobs.service.ts`   | Job SPP + denda                  |
| `calculator/money.ts`                | Aritmetika sen                   |
| `dto/finance.dto.ts`                 | DTO                              |
