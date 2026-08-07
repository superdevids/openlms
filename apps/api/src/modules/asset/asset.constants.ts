/**
 * Asset — konstanta domain manajemen aset (prd04 §5.G; 05 W2-ASSET).
 * Sumber: prd04 §5.G.1, 03-database-erd §3.17/§3.18, seed-data/assets.ts.
 */

/** Perluasan AssetCategory — schema.prisma belum punya KENDARAAN & PERALATAN_IT. */
export const ASSET_CATEGORIES = [
  "RUANG",
  "LAB",
  "ALAT",
  "KENDARAAN",
  "PERALATAN_IT",
  "LAINNYA"
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/** Sumber dana perolehan (prd04 §5.G.1). */
export const SUMBER_DANA_VALUES = ["BOS", "APBD", "SWADANA"] as const;
export type SumberDana = (typeof SUMBER_DANA_VALUES)[number];

/** Status booking (03-database-erd §3.18). */
export const BOOKING_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED"
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Status maintenance (entitas W2). */
export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "DONE" | "CANCELLED";

/** Jenis opname audit (entitas W2). */
export type AuditType = "FISIK" | "BOOK";

/** DI token AssetStore (InMemoryAssetStore untuk dev/test; PrismaAssetStore produksi). */
export const ASSET_STORE = Symbol("ASSET_STORE");
