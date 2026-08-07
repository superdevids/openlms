import { Decimal } from "@prisma/client/runtime/library";

/**
 * Tipe domain Aset (prd04 §5.G).
 *
 * CATATAN PENTING (lihat ISSUES): Asset & AssetBooking sudah ada di schema
 * (03-database-erd §3.17/§3.18). Field PERLUASAN aset berikut BELUM ada:
 *   merk, tahun_perolehan, harga_perolehan, masa_manfaat_bulan,
 *   penanggung_jawab, sumber_dana.
 * Entitas W2 berikut BELUM ada di schema.prisma:
 *   AssetMaintenance, AssetAudit.
 * Field/entitas itu dipersist via AssetStore (saat ini InMemoryAssetStore)
 * sampai integration coder menambahkan skema — lihat ISSUES.
 */

/** Perluasan data aset (belum ada kolom di schema Asset). */
export interface AssetExtensionRecord {
  assetId: string;
  merk: string | null;
  tahunPerolehan: number | null;
  hargaPerolehan: Decimal | null;
  /** umur manfaat bulan; null -> pakai default per kategori */
  masaManfaatBulan: number | null;
  penanggungJawab: string | null;
  sumberDana: "BOS" | "APBD" | "SWADANA" | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export interface AssetMaintenanceRecord {
  id: string;
  assetId: string;
  scheduledAt: Date;
  completedAt: Date | null;
  cost: Decimal;
  description: string;
  status: MaintenanceStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditType = "FISIK" | "BOOK";
export type AuditResultStatus = "MATCH" | "SELISIH" | "REKLASIFIKASI_RETIRED";

export interface AssetAuditRecord {
  id: string;
  assetId: string;
  auditDate: Date;
  auditType: AuditType;
  /** qty fisik saat opname; null = tidak dihitung */
  physicalQty: number | null;
  bookQty: number;
  /** selisih = physicalQty - bookQty (positif = kelebihan, negatif = hilang) */
  difference: number;
  note: string;
  /** reklasifikasi RETIRED yang diusulkan */
  proposeRetired: boolean;
  status: AuditResultStatus;
  approvedByKepsek: string | null;
  approvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  note: string | null;
  createdAt: Date;
}
