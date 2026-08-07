import { Decimal } from "@prisma/client/runtime/library";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  AssetAuditRecord,
  AssetExtensionRecord,
  AssetMaintenanceRecord,
  AuditLogRecord
} from "./asset.types";

/** Helper uang lokal (asset tidak cross-import modul lain). */
function toMoney(value: Decimal | number | string | null | undefined): Decimal | null {
  if (value === null || value === undefined) {
    return null;
  }
  const d = value instanceof Decimal ? value : new Decimal(value);
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * AssetStore — abstraksi persistence field PERLUASAN aset + entitas W2 aset
 * yang BELUM ada di schema.prisma:
 *   - AssetExtensionRecord (merk, tahun_perolehan, harga_perolehan,
 *     masa_manfaat_bulan, penanggung_jawab, sumber_dana)
 *   - AssetMaintenance
 *   - AssetAudit
 *
 * Implementasi saat ini: InMemoryAssetStore (unit test + pengembangan).
 * Integration coder menambah kolom/skema + adapter PrismaAssetStore — lihat
 * ISSUES. Asset & AssetBooking tetap memakai PrismaClient (model sudah ada).
 */

export interface AssetStore {
  // ---- Field perpanjangan aset ----
  upsertExtension(input: {
    assetId: string;
    merk?: string | null;
    tahunPerolehan?: number | null;
    hargaPerolehan?: Decimal | number | string | null;
    masaManfaatBulan?: number | null;
    penanggungJawab?: string | null;
    sumberDana?: "BOS" | "APBD" | "SWADANA" | null;
  }): Promise<AssetExtensionRecord>;

  getExtension(assetId: string): Promise<AssetExtensionRecord | null>;

  // ---- Maintenance ----
  createMaintenance(input: {
    assetId: string;
    scheduledAt: Date;
    cost: Decimal | number | string;
    description: string;
    createdBy: string;
  }): Promise<AssetMaintenanceRecord>;

  listMaintenance(assetId?: string): Promise<AssetMaintenanceRecord[]>;

  updateMaintenanceStatus(
    id: string,
    status: AssetMaintenanceRecord["status"],
    completedAt?: Date | null,
    actorId?: string
  ): Promise<AssetMaintenanceRecord>;

  // ---- Audit / opname ----
  createAudit(input: {
    assetId: string;
    auditDate: Date;
    auditType: "FISIK" | "BOOK";
    physicalQty: number | null;
    bookQty: number;
    note: string;
    proposeRetired: boolean;
    createdBy: string;
  }): Promise<AssetAuditRecord>;

  listAudits(assetId?: string): Promise<AssetAuditRecord[]>;

  getAudit(id: string): Promise<AssetAuditRecord | null>;

  /** Tolak usulan / ubah status audit (mis. hasil approval negatif). */
  updateAuditStatus(
    id: string,
    status: AssetAuditRecord["status"],
    actorId: string
  ): Promise<AssetAuditRecord>;

  approveAudit(id: string, approvedByKepsek: string): Promise<AssetAuditRecord>;

  // ---- Audit log ----
  appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void>;

  listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]>;
}

const nowIso = () => new Date();

@Injectable()
export class InMemoryAssetStore implements AssetStore {
  private readonly extensions = new Map<string, AssetExtensionRecord>();
  private readonly maintenances = new Map<string, AssetMaintenanceRecord>();
  private readonly audits = new Map<string, AssetAuditRecord>();
  private readonly auditLogs: AuditLogRecord[] = [];

  private nextId(prefix: string): string {
    return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }

  async upsertExtension(input: {
    assetId: string;
    merk?: string | null;
    tahunPerolehan?: number | null;
    hargaPerolehan?: Decimal | number | string | null;
    masaManfaatBulan?: number | null;
    penanggungJawab?: string | null;
    sumberDana?: "BOS" | "APBD" | "SWADANA" | null;
  }): Promise<AssetExtensionRecord> {
    const existing = this.extensions.get(input.assetId);
    const now = nowIso();
    const record: AssetExtensionRecord = {
      assetId: input.assetId,
      merk: input.merk === undefined ? (existing?.merk ?? null) : input.merk,
      tahunPerolehan:
        input.tahunPerolehan === undefined
          ? (existing?.tahunPerolehan ?? null)
          : input.tahunPerolehan,
      hargaPerolehan:
        input.hargaPerolehan === undefined || input.hargaPerolehan === null
          ? (existing?.hargaPerolehan ?? null)
          : toMoney(input.hargaPerolehan),
      masaManfaatBulan:
        input.masaManfaatBulan === undefined
          ? (existing?.masaManfaatBulan ?? null)
          : input.masaManfaatBulan,
      penanggungJawab:
        input.penanggungJawab === undefined
          ? (existing?.penanggungJawab ?? null)
          : input.penanggungJawab,
      sumberDana:
        input.sumberDana === undefined ? (existing?.sumberDana ?? null) : input.sumberDana,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    this.extensions.set(input.assetId, record);
    return record;
  }

  async getExtension(assetId: string): Promise<AssetExtensionRecord | null> {
    return this.extensions.get(assetId) ?? null;
  }

  async createMaintenance(input: {
    assetId: string;
    scheduledAt: Date;
    cost: Decimal | number | string;
    description: string;
    createdBy: string;
  }): Promise<AssetMaintenanceRecord> {
    const now = nowIso();
    const record: AssetMaintenanceRecord = {
      id: this.nextId("mnt"),
      assetId: input.assetId,
      scheduledAt: input.scheduledAt,
      completedAt: null,
      cost: toMoney(input.cost) ?? new Decimal(0),
      description: input.description,
      status: "SCHEDULED",
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now
    };
    this.maintenances.set(record.id, record);
    return record;
  }

  async listMaintenance(assetId?: string): Promise<AssetMaintenanceRecord[]> {
    const all = [...this.maintenances.values()];
    return assetId ? all.filter((m) => m.assetId === assetId) : all;
  }

  async updateMaintenanceStatus(
    id: string,
    status: AssetMaintenanceRecord["status"],
    completedAt?: Date | null,
    actorId = "system"
  ): Promise<AssetMaintenanceRecord> {
    const existing = this.maintenances.get(id);
    if (!existing) {
      throw new Error(`Maintenance ${id} tidak ditemukan`);
    }
    const updated: AssetMaintenanceRecord = {
      ...existing,
      status,
      completedAt: status === "DONE" ? (completedAt ?? nowIso()) : existing.completedAt,
      updatedAt: nowIso()
    };
    this.maintenances.set(id, updated);
    await this.appendAuditLog({
      actorId,
      actorRole: "OPERATOR",
      action: "UPDATE",
      entity: "AssetMaintenance",
      entityId: id,
      before: { status: existing.status },
      after: { status },
      note: "ubah status maintenance"
    });
    return updated;
  }

  async createAudit(input: {
    assetId: string;
    auditDate: Date;
    auditType: "FISIK" | "BOOK";
    physicalQty: number | null;
    bookQty: number;
    note: string;
    proposeRetired: boolean;
    createdBy: string;
  }): Promise<AssetAuditRecord> {
    const now = nowIso();
    const difference = input.physicalQty === null ? 0 : input.physicalQty - input.bookQty;
    const status: AssetAuditRecord["status"] =
      input.proposeRetired || difference !== 0 ? "SELISIH" : "MATCH";
    const record: AssetAuditRecord = {
      id: this.nextId("aud"),
      assetId: input.assetId,
      auditDate: input.auditDate,
      auditType: input.auditType,
      physicalQty: input.physicalQty,
      bookQty: input.bookQty,
      difference,
      note: input.note,
      proposeRetired: input.proposeRetired,
      status,
      approvedByKepsek: null,
      approvedAt: null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now
    };
    this.audits.set(record.id, record);
    return record;
  }

  async listAudits(assetId?: string): Promise<AssetAuditRecord[]> {
    const all = [...this.audits.values()];
    return assetId ? all.filter((a) => a.assetId === assetId) : all;
  }

  async getAudit(id: string): Promise<AssetAuditRecord | null> {
    return this.audits.get(id) ?? null;
  }

  async updateAuditStatus(
    id: string,
    status: AssetAuditRecord["status"],
    actorId: string
  ): Promise<AssetAuditRecord> {
    const existing = this.audits.get(id);
    if (!existing) {
      throw new Error(`Audit ${id} tidak ditemukan`);
    }
    const updated: AssetAuditRecord = {
      ...existing,
      status,
      updatedAt: nowIso()
    };
    this.audits.set(id, updated);
    await this.appendAuditLog({
      actorId,
      actorRole: "KEPSEK",
      action: "UPDATE",
      entity: "AssetAudit",
      entityId: id,
      before: { status: existing.status },
      after: { status },
      note: "perbarui status audit"
    });
    return updated;
  }

  /** Approval KEPSEK atas reklasifikasi RETIRED (prd04 §5.G.3). */
  async approveAudit(id: string, approvedByKepsek: string): Promise<AssetAuditRecord> {
    const existing = this.audits.get(id);
    if (!existing) {
      throw new Error(`Audit ${id} tidak ditemukan`);
    }
    const updated: AssetAuditRecord = {
      ...existing,
      status: "REKLASIFIKASI_RETIRED",
      approvedByKepsek,
      approvedAt: nowIso(),
      updatedAt: nowIso()
    };
    this.audits.set(id, updated);
    await this.appendAuditLog({
      actorId: approvedByKepsek,
      actorRole: "KEPSEK",
      action: "UPDATE",
      entity: "AssetAudit",
      entityId: id,
      before: { status: existing.status },
      after: { status: "REKLASIFIKASI_RETIRED" },
      note: "approval KEPSEK reklasifikasi RETIRED"
    });
    return updated;
  }

  async appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void> {
    this.auditLogs.push({
      ...entry,
      id: this.nextId("log"),
      createdAt: nowIso()
    });
  }

  async listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]> {
    let logs = this.auditLogs;
    if (entity) logs = logs.filter((l) => l.entity === entity);
    if (entityId) logs = logs.filter((l) => l.entityId === entityId);
    return [...logs];
  }
}
