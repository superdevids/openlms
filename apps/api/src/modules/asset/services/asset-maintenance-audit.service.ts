import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AssetStatus } from "@prisma/client";
import { prisma } from "@opensis/database";
import { AssetStore } from "../asset.store";
import { ASSET_STORE } from "../asset.constants";
import { AssetAuditRecord, AssetMaintenanceRecord } from "../asset.types";
import { AssetService } from "./asset.service";

/**
 * AssetMaintenanceService — jadwal perawatan (prd04 §5.G.3).
 * Persistence via AssetStore (entitas W2 belum ada di schema).
 */

export interface CreateMaintenanceInput {
  assetId: string;
  scheduledAt: Date;
  cost: string;
  description: string;
  createdBy: string;
}

@Injectable()
export class AssetMaintenanceService {
  constructor(
    @Inject(ASSET_STORE) private readonly store: AssetStore,
    private readonly assets: AssetService
  ) {}

  async create(input: CreateMaintenanceInput): Promise<AssetMaintenanceRecord> {
    await this.assets.findById(input.assetId);
    const record = await this.store.createMaintenance({
      assetId: input.assetId,
      scheduledAt: input.scheduledAt,
      cost: input.cost,
      description: input.description,
      createdBy: input.createdBy
    });
    // Status aset -> MAINTENANCE saat jadwal aktif (kolom status ada di schema).
    await prisma.asset.update({
      where: { id: input.assetId },
      data: { status: "MAINTENANCE" }
    });
    return record;
  }

  async list(assetId?: string): Promise<AssetMaintenanceRecord[]> {
    return this.store.listMaintenance(assetId);
  }

  async updateStatus(
    id: string,
    status: AssetMaintenanceRecord["status"],
    actorId?: string
  ): Promise<AssetMaintenanceRecord> {
    return this.store.updateMaintenanceStatus(id, status, undefined, actorId);
  }
}

/**
 * AssetAuditService — opname berkala (prd04 §5.G.3).
 * Catat selisih fisik vs buku; usulan reklasifikasi RETIRED butuh approval
 * KEPSEK; saat disetujui, status aset di DB -> RETIRED.
 * Persistence via AssetStore (entitas W2 belum ada di schema).
 */

export interface CreateAuditInput {
  assetId: string;
  auditDate: Date;
  auditType: "FISIK" | "BOOK";
  physicalQty: number | null;
  bookQty: number;
  note: string;
  proposeRetired: boolean;
  createdBy: string;
}

@Injectable()
export class AssetAuditService {
  constructor(
    @Inject(ASSET_STORE) private readonly store: AssetStore,
    private readonly assets: AssetService
  ) {}

  async create(input: CreateAuditInput): Promise<AssetAuditRecord> {
    const asset = await this.assets.findById(input.assetId);
    if (input.auditType === "FISIK" && input.physicalQty === null) {
      throw new BadRequestException("Opname FISIK wajib mengisi physicalQty");
    }
    const record = await this.store.createAudit({
      assetId: input.assetId,
      auditDate: input.auditDate,
      auditType: input.auditType,
      physicalQty: input.physicalQty,
      bookQty: input.bookQty ?? asset.quantity,
      note: input.note,
      proposeRetired: input.proposeRetired,
      createdBy: input.createdBy
    });
    return record;
  }

  async list(assetId?: string): Promise<AssetAuditRecord[]> {
    return this.store.listAudits(assetId);
  }

  /** Approval KEPSEK atas reklasifikasi RETIRED (prd04 §5.G.3). */
  async approveRetired(
    auditId: string,
    approved: boolean,
    approvedBy: string
  ): Promise<AssetAuditRecord> {
    const audit = await this.store.getAudit(auditId);
    if (!audit) {
      throw new NotFoundException("Audit aset tidak ditemukan");
    }
    if (!audit.proposeRetired) {
      throw new BadRequestException("Audit ini tidak mengusulkan reklasifikasi RETIRED");
    }
    if (audit.approvedByKepsek) {
      throw new BadRequestException("Audit sudah disetujui");
    }
    if (!approved) {
      const updated = await this.store.updateAuditStatus(auditId, "MATCH", approvedBy);
      return updated;
    }
    const approvedAudit = await this.store.approveAudit(auditId, approvedBy);
    // Terapkan status RETIRED di kolom schema.
    await prisma.asset.update({
      where: { id: audit.assetId },
      data: { status: "RETIRED" }
    });
    return approvedAudit;
  }

  async get(auditId: string): Promise<AssetAuditRecord> {
    const audit = await this.store.getAudit(auditId);
    if (!audit) {
      throw new NotFoundException("Audit aset tidak ditemukan");
    }
    return audit;
  }
}

export type { AssetStatus };
