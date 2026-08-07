/**
 * Finance — konstanta domain keuangan (prd04 §5.F; 05 W2-PAYMENT).
 * Sumber nilai: prd04 §5.F, 03-database-erd §2.17/§2.18.
 */

/** Perluasan InvoiceType — schema.prisma belum punya UANG_OSIS & DENDA (lihat ISSUES). */
export const FINANCE_INVOICE_TYPES = [
  "SPP",
  "UANG_KEGIATAN",
  "UANG_DAFTAR",
  "UANG_SERAGAM",
  "UANG_OSIS",
  "DENDA",
  "LAINNYA"
] as const;

export type FinanceInvoiceType = (typeof FINANCE_INVOICE_TYPES)[number];

/** Tipe yang sudah ada di enum schema.prisma (bisa langsung insert Prisma). */
export const SCHEMA_INVOICE_TYPES = [
  "SPP",
  "UANG_KEGIATAN",
  "UANG_DAFTAR",
  "UANG_SERAGAM",
  "LAINNYA"
] as const;

/** Header Idempotency-Key (prd04 §5.F.2, tek-04 §1.7). */
export const IDEMPOTENCY_HEADER = "idempotency-key";

/** DI token FinanceStore (InMemoryFinanceStore untuk dev/test; PrismaFinanceStore produksi). */
export const FINANCE_STORE = Symbol("FINANCE_STORE");

/** Format invoice_no: INV-{tahun}-{urutan:5}. */
export const INVOICE_NO_PREFIX = "INV";

/** Format no denda: DEN-{tahun}-{urutan:5}. */
export const DENDA_NO_PREFIX = "DEN";

/** Format no refund: REF-{tahun}-{urutan:5}. */
export const REFUND_NO_PREFIX = "REF";

/**
 * Konfigurasi default keuangan (prd04 §5.F.4): ambang nominal refund yang
 * membutuhkan approval kedua KEPSEK. Nilai terkonfigurasi (dapat diubah via
 * FeatureFlag/AppFeatureSetting key "FINANCE_INVOICE" — config Json).
 */
export const DEFAULT_REFUND_KEPSEK_THRESHOLD = "1000000"; // Rp1.000.000

/** Format periode SPP: "YYYY-MM". */
export function monthPeriod(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Tanggal jatuh tempo default tagihan = akhir bulan periode. */
export function endOfMonth(period: string): Date {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, m ?? 1, 0, 23, 59, 59));
}
