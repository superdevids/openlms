import { Decimal } from "@prisma/client/runtime/library";
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@openlms/database";
import type { Prisma } from "@prisma/client";
import type { AuditAction, Role } from "@prisma/client";
import {
  AssetAuditRecord,
  AssetExtensionRecord,
  AssetMaintenanceRecord,
  AuditLogRecord
} from "./asset.types";
import type { AssetStore } from "./asset.store";

/** Helper uang lokal (asset tidak cross-import modul lain). */
function toMoney(value: Decimal | number | string | null | undefined): Decimal | null {
  if (value === null || value === undefined) {
    return null;
  }
  const d = value instanceof Decimal ? value : new Decimal(value);
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * PrismaAssetStore — adapter persisten AssetStore (W2).
 *
 * Memetakan kontrak domain (asset.types.ts) ke model Prisma yang ditambahkan
 * pada migrasi integrate_w2:
 *   - Field perpanjangan aset (merk, tahun_perolehan, harga_perolehan,
 *     masa_manfaat_bulan, penanggung_jawab, sumber_dana) -> kolom model `Asset`.
 *   - AssetMaintenance, AssetAudit -> model Prisma.
 *   - AuditLog -> model Prisma.
 */
@Injectable()
export class PrismaAssetStore implements AssetStore {
  constructor(private readonly prisma: PrismaClient) {}

  // ---------- Field perpanjangan aset ----------

  async upsertExtension(input: {
    assetId: string;
    merk?: string | null;
    tahunPerolehan?: number | null;
    hargaPerolehan?: Decimal | number | string | null;
    masaManfaatBulan?: number | null;
    penanggungJawab?: string | null;
    sumberDana?: "BOS" | "APBD" | "SWADANA" | null;
  }): Promise<AssetExtensionRecord> {
    const data: Prisma.AssetUpdateInput = {};
    if (input.merk !== undefined) data.merk = input.merk;
    if (input.tahunPerolehan !== undefined) data.tahun_perolehan = input.tahunPerolehan;
    if (input.hargaPerolehan !== undefined) {
      data.harga_perolehan = input.hargaPerolehan === null ? null : toMoney(input.hargaPerolehan);
    }
    if (input.masaManfaatBulan !== undefined) data.masa_manfaat_bulan = input.masaManfaatBulan;
    if (input.penanggungJawab !== undefined) data.penanggung_jawab_id = input.penanggungJawab;
    if (input.sumberDana !== undefined) data.sumber_dana = input.sumberDana;
    const row = await this.prisma.asset.update({ where: { id: input.assetId }, data });
    return this.toExtension(row);
  }

  async getExtension(assetId: string): Promise<AssetExtensionRecord | null> {
    const row = await this.prisma.asset.findUnique({ where: { id: assetId } });
    return row ? this.toExtension(row) : null;
  }

  // ---------- Maintenance ----------

  async createMaintenance(input: {
    assetId: string;
    scheduledAt: Date;
    cost: Decimal | number | string;
    description: string;
    createdBy: string;
  }): Promise<AssetMaintenanceRecord> {
    const row = await this.prisma.assetMaintenance.create({
      data: {
        asset_id: input.assetId,
        scheduled_at: input.scheduledAt,
        cost: toMoney(input.cost) ?? new Decimal(0),
        description: input.description,
        status: "SCHEDULED",
        created_by: input.createdBy
      }
    });
    return this.toMaintenance(row);
  }

  async listMaintenance(assetId?: string): Promise<AssetMaintenanceRecord[]> {
    const rows = await this.prisma.assetMaintenance.findMany({
      where: assetId ? { asset_id: assetId } : {},
      orderBy: { scheduled_at: "asc" }
    });
    return rows.map((r) => this.toMaintenance(r));
  }

  async updateMaintenanceStatus(
    id: string,
    status: AssetMaintenanceRecord["status"],
    completedAt?: Date | null,
    actorId = "system"
  ): Promise<AssetMaintenanceRecord> {
    const existing = await this.prisma.assetMaintenance.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Maintenance ${id} tidak ditemukan`);
    }
    const row = await this.prisma.assetMaintenance.update({
      where: { id },
      data: {
        status,
        completed_at: status === "DONE" ? (completedAt ?? new Date()) : existing.completed_at
      }
    });
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
    return this.toMaintenance(row);
  }

  // ---------- Audit / opname ----------

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
    const difference = input.physicalQty === null ? 0 : input.physicalQty - input.bookQty;
    const status: AssetAuditRecord["status"] =
      input.proposeRetired || difference !== 0 ? "SELISIH" : "MATCH";
    const row = await this.prisma.assetAudit.create({
      data: {
        asset_id: input.assetId,
        audit_date: input.auditDate,
        audit_type: input.auditType,
        physical_qty: input.physicalQty,
        book_qty: input.bookQty,
        difference,
        note: input.note,
        propose_retired: input.proposeRetired,
        status,
        created_by: input.createdBy
      }
    });
    return this.toAudit(row);
  }

  async listAudits(assetId?: string): Promise<AssetAuditRecord[]> {
    const rows = await this.prisma.assetAudit.findMany({
      where: assetId ? { asset_id: assetId } : {},
      orderBy: { audit_date: "desc" }
    });
    return rows.map((r) => this.toAudit(r));
  }

  async getAudit(id: string): Promise<AssetAuditRecord | null> {
    const row = await this.prisma.assetAudit.findUnique({ where: { id } });
    return row ? this.toAudit(row) : null;
  }

  async updateAuditStatus(
    id: string,
    status: AssetAuditRecord["status"],
    actorId: string
  ): Promise<AssetAuditRecord> {
    const existing = await this.prisma.assetAudit.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Audit ${id} tidak ditemukan`);
    }
    const row = await this.prisma.assetAudit.update({
      where: { id },
      data: { status }
    });
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
    return this.toAudit(row);
  }

  /** Approval KEPSEK atas reklasifikasi RETIRED (prd04 §5.G.3). */
  async approveAudit(id: string, approvedByKepsek: string): Promise<AssetAuditRecord> {
    const existing = await this.prisma.assetAudit.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Audit ${id} tidak ditemukan`);
    }
    const row = await this.prisma.assetAudit.update({
      where: { id },
      data: {
        status: "REKLASIFIKASI_RETIRED",
        approved_by_kepsek: approvedByKepsek,
        approved_at: new Date()
      }
    });
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
    return this.toAudit(row);
  }

  // ---------- Audit log ----------

  async appendAuditLog(entry: Omit<AuditLogRecord, "id" | "createdAt">): Promise<void> {
    const after = this.toJsonValue(entry.after);
    await this.prisma.auditLog.create({
      data: {
        actor_id: entry.actorId,
        actor_role: (entry.actorRole as Role | null) ?? undefined,
        action: entry.action as AuditAction,
        entity: entry.entity,
        entity_id: entry.entityId,
        before: this.toJsonValue(entry.before) ?? undefined,
        after:
          entry.note != null
            ? {
                ...(after &&
                typeof after === "object" &&
                !Array.isArray(after) &&
                !(after instanceof Date)
                  ? (after as Record<string, unknown>)
                  : {}),
                _note: entry.note
              }
            : (after ?? undefined),
        ip_address: null
      }
    });
  }

  async listAuditLogs(entity?: string, entityId?: string): Promise<AuditLogRecord[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: { ...(entity ? { entity } : {}), ...(entityId ? { entity_id: entityId } : {}) },
      orderBy: { created_at: "desc" }
    });
    return rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorRole: r.actor_role ?? null,
      action: (r.action as AuditLogRecord["action"]) ?? "CREATE",
      entity: r.entity,
      entityId: r.entity_id,
      before: r.before,
      after: r.after,
      note: null,
      createdAt: r.created_at
    }));
  }

  // ---------- Mapper ----------

  private toExtension(r: Prisma.AssetGetPayload<Record<string, never>>): AssetExtensionRecord {
    return {
      assetId: r.id,
      merk: r.merk,
      tahunPerolehan: r.tahun_perolehan,
      hargaPerolehan: r.harga_perolehan,
      masaManfaatBulan: r.masa_manfaat_bulan,
      penanggungJawab: r.penanggung_jawab_id,
      sumberDana: r.sumber_dana,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toMaintenance(
    r: Prisma.AssetMaintenanceGetPayload<Record<string, never>>
  ): AssetMaintenanceRecord {
    return {
      id: r.id,
      assetId: r.asset_id,
      scheduledAt: r.scheduled_at,
      completedAt: r.completed_at,
      cost: r.cost,
      description: r.description,
      status: r.status,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toAudit(r: Prisma.AssetAuditGetPayload<Record<string, never>>): AssetAuditRecord {
    return {
      id: r.id,
      assetId: r.asset_id,
      auditDate: r.audit_date,
      auditType: r.audit_type,
      physicalQty: r.physical_qty,
      bookQty: r.book_qty,
      difference: r.difference,
      note: r.note ?? "",
      proposeRetired: r.propose_retired,
      status: r.status,
      approvedByKepsek: r.approved_by_kepsek,
      approvedAt: r.approved_at,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return null as unknown as Prisma.InputJsonValue;
    }
    if (value instanceof Decimal) {
      return value.toFixed(2);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.toJsonValue(v));
    }
    if (typeof value === "object") {
      const obj: Record<string, Prisma.InputJsonValue> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        obj[k] = this.toJsonValue(v);
      }
      return obj;
    }
    return value as Prisma.InputJsonValue;
  }
}
