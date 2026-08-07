# REGISTRATION — Modul Finance (Gelombang 2, prd04 §5.F)

Status: **SIAP DIIMPLEMENTASI / PERSISTENCE W2 MENYUSUL** (lih. ISSUES).

## 1. Tujuan

Tagihan multi-jenis + penjadwalan SPP otomatis, pembayaran parsial/cicilan
dengan alokasi, denda keterlambatan (LateFeeRule + job harian), refund dengan
approval berlapis, rekonsiliasi bank CSV, dan laporan arus kas
(prd04 §5.F.1–§5.F.6; 05 W2-PAYMENT).

## 2. Kontrak API (prefix `/api/v1/finance`)

| Method | Path                                  | Permission                             | Deskripsi                                                         |
| ------ | ------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| POST   | /invoices                             | invoice:write:school                   | Buat tagihan                                                      |
| POST   | /invoices/bulk                        | invoice:write:school                   | Tagihan massal per kelas/angkatan                                 |
| GET    | /invoices                             | invoice:read:school, invoice:read:self | Daftar tagihan (filter studentId/type/status/period/academicYear) |
| GET    | /invoices/:id                         | invoice:read:school, invoice:read:self | Detail tagihan + pembayaran                                       |
| POST   | /invoices/:id/carry-over              | invoice:write:school                   | Pindah sisa tagihan ke tahun ajaran baru                          |
| DELETE | /invoices/:id                         | invoice:write:school                   | Hapus tagihan (AuditLog)                                          |
| POST   | /jobs/spp                             | invoice:write:school                   | Job SPP bulanan (IDEMPOTEN per periode+siswa)                     |
| GET    | /invoices/summary/monthly             | invoice:read:school                    | Rekap SPP per bulan                                               |
| POST   | /payments                             | payment:record:school                  | Catat pembayaran (status PENDING)                                 |
| POST   | /payments/allocate                    | payment:record:school                  | Alokasi pembayaran lintas tagihan (cicilan)                       |
| POST   | /payments/:id/verify                  | payment:verify:school                  | Verifikasi bukti oleh KEUANGAN                                    |
| GET    | /payments/invoice/:invoiceId          | invoice:read:school                    | Riwayat pembayaran tagihan                                        |
| POST   | /late-fee-rules                       | invoice:write:school                   | Buat aturan denda                                                 |
| GET    | /late-fee-rules                       | invoice:read:school                    | Daftar aturan denda                                               |
| POST   | /jobs/late-fee                        | invoice:write:school                   | Job harian denda (IDEMPOTEN per invoice+periode)                  |
| GET    | /dendas                               | invoice:read:school                    | Daftar invoice denda                                              |
| DELETE | /dendas/:invoiceNo                    | invoice:write:school                   | Hapus manual denda + alasan (AuditLog)                            |
| POST   | /refunds                              | refund:approve:school                  | Buat refund                                                       |
| GET    | /refunds                              | refund:approve:school                  | Daftar refund                                                     |
| POST   | /refunds/:id/approve-keuangan         | refund:approve:school                  | Approval 1: KEUANGAN                                              |
| POST   | /refunds/:id/approve-kepsek           | refund:approve:school                  | Approval 2: KEPSEK (nominal >= ambang)                            |
| POST   | /reconciliation/import                | reconciliation:run:school              | Import mutasi CSV -> MATCHED/UNMATCHED                            |
| GET    | /reconciliation                       | reconciliation:run:school              | Daftar batch rekonsiliasi                                         |
| GET    | /reconciliation/:id                   | reconciliation:run:school              | Detail batch + item                                               |
| POST   | /reconciliation/items/:itemId/resolve | reconciliation:run:school              | Resolusi manual item UNMATCHED                                    |
| GET    | /cash-flow                            | cashflow:read:school                   | Laporan arus kas per periode                                      |
| POST   | /cash-flow                            | invoice:write:school                   | Catat arus kas manual                                             |
| POST   | /jobs/run-all                         | invoice:write:school                   | Pemicu semua job (idempoten)                                      |

RBAC aktif: guard global `AuthGuard` → `PermissionsGuard` (fail-closed).
Aktor dibaca dari `@CurrentUser` (AuthGuard); handler non-publik melempar
`UnauthorizedException` bila konteks autentikasi tidak ditemukan (tidak ada
fallback "system"). Header dev `x-user-id` / `x-user-roles` sudah dihapus.

## 3. Keputusan desain

- **Uang = Decimal (Prisma.Decimal, 12,2)**; DTO mengirim string desimal
  (`@IsDecimal`), backend memakai helper `calculator/money.ts`.
- **Status tagihan dihitung, bukan disimpan manual**: `computeInvoiceTotals`
  memakai total Payment PAID + jatuh tempo (PENDING/PARTIAL/PAID/OVERDUE/CARRIED_OVER).
- **Idempotensi job**: SPP (student_id+period), denda (original_invoice_id+period);
  Idempotency-Key pada pembayaran (TODO F2: simpan key di store).
- **Denda = invoice DENDA terpisah** (transparansi), bisa dihapus manual dengan
  alasan (AuditLog).
- **Approval refund berlapis**: KEUANGAN -> KEPSEK bila nominal >= ambang
  konfigurasi (`refundKepsekThreshold`, default Rp1.000.000 — via
  FinanceConfigService/FeatureFlag, TIDAK hardcode di logika).
- **Arus kas**: kas masuk = Payment PAID + IN manual; kas keluar = refund + OUT
  manual; outstanding dari invoice PENDING/PARTIAL/OVERDUE (keputusan A3-8).

## 4. Entitas W2 yang BELUM ada di schema.prisma (butuh skema)

| Entitas                           | Penggunaan saat ini  | Proposal skema                                                                                                                                                                                                   |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LateFeeRule                       | InMemoryFinanceStore | `model LateFeeRule { id, name, invoice_type, grace_days, fee_type, value Decimal(12,2), max_amount Decimal?, enabled, created_by, timestamps }`                                                                  |
| DendaInvoice (invoice tipe DENDA) | InMemoryFinanceStore | tambah enum InvoiceType: `UANG_OSIS`, `DENDA`                                                                                                                                                                    |
| Refund                            | InMemoryFinanceStore | `model Refund { id, refund_no unik, payment_id?, invoice_id?, student_id?, amount Decimal, reason, method, status, requires_kepsek_approval, approved_by_keuangan?, approved_by_kepsek?, paid_at?, timestamps }` |
| ReconciliationBatch               | InMemoryFinanceStore | `model ReconciliationBatch { id, period, file_name, imported_by, imported_at, total_rows, matched_rows, unmatched_rows }`                                                                                        |
| ReconciliationItem                | InMemoryFinanceStore | `model ReconciliationItem { id, batch_id, row_index, tanggal, keterangan, referensi?, nominal Decimal, tipe, status, matched_payment_id?, match_confidence, resolution_note?, created_by }`                      |
| CashFlowRecord                    | InMemoryFinanceStore | `model CashFlowRecord { id, date, direction, amount Decimal, category, reference_id?, note?, created_by }`                                                                                                       |
| InvoiceType UANG_OSIS + DENDA     | —                    | perluasan enum `InvoiceType`                                                                                                                                                                                     |

## 5. Unit test

- `calculator/payment-allocation.spec.ts` — alokasi parsial/cicilan lintas tagihan.
- `calculator/invoice-status.spec.ts` — status PENDING/PARTIAL/PAID/OVERDUE/CARRIED_OVER.
- `calculator/late-fee.spec.ts` — denda NOMINAL & PERSEN_PER_HARI + cap.
- `calculator/reconciliation-match.spec.ts` — matching referensi/nominal/tanggal + parser CSV.

## 6. Hand-off

- Integration coder: `FinanceModule` sudah terdaftar di `app.module.ts`; yang tersisa:
  tambah skema W2 + `PrismaFinanceStore` (adapter FinanceStore), aktifkan job scheduler.
- Reviewer: periksa alur approval refund & keamanan verifikasi pembayaran.
