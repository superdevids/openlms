import { Injectable, Logger } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { resolveActorRole } from "../lms/lms-audit";
import { UpdateMaintenanceDto } from "./dto/update-maintenance.dto";
import { MAINTENANCE_CACHE_TTL_MS, SYSTEM_STATUS_ID } from "./maintenance.constants";

export interface MaintenanceStatusView {
  maintenanceEnabled: boolean;
  message: string | null;
  eta: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface PublicSystemStatus {
  maintenanceEnabled: boolean;
  message: string | null;
  eta: string | null;
}

interface CacheEntry {
  status: MaintenanceStatusView;
  fetchedAt: number;
}

const DEFAULT_STATUS: MaintenanceStatusView = {
  maintenanceEnabled: false,
  message: null,
  eta: null,
  updatedAt: null,
  updatedBy: null
};

/**
 * MaintenanceService — status sistem global (maintenance/dev mode).
 * Cache in-memory (TTL 5 detik) agar MaintenanceMiddleware TIDAK menyentuh
 * DB per request; PUT langsung meng-invalidate cache.
 * DB tidak tersedia → fail-open (anggap normal) agar seluruh API tidak
 * terblokir akibat outage database.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  private cache: CacheEntry | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  /** Status lengkap (admin) — memakai cache, DB hanya saat cache kedaluwarsa. */
  async getStatus(): Promise<MaintenanceStatusView> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < MAINTENANCE_CACHE_TTL_MS) {
      return this.cache.status;
    }

    let row: {
      maintenance_enabled: boolean;
      maintenance_message: string | null;
      maintenance_eta: string | null;
      updated_at: Date;
      updated_by: string | null;
    } | null = null;
    try {
      row = await this.prisma.systemStatus.findUnique({
        where: { id: SYSTEM_STATUS_ID }
      });
    } catch (err) {
      this.logger.warn(`systemStatus tidak dapat dibaca (fail-open): ${(err as Error).message}`);
    }

    const status = this.toView(row);
    this.cache = { status, fetchedAt: now };
    return status;
  }

  /** Status publik — WAJIB selalu bekerja meski mode maintenance aktif. */
  async getPublicStatus(): Promise<PublicSystemStatus> {
    const status = await this.getStatus();
    return {
      maintenanceEnabled: status.maintenanceEnabled,
      message: status.message,
      eta: status.eta
    };
  }

  /** Update status + audit + invalidate cache (immediate). */
  async update(
    dto: UpdateMaintenanceDto,
    actorId: string,
    ip?: string,
    roles: string[] = []
  ): Promise<MaintenanceStatusView> {
    const before = await this.getStatus();

    const updated = await this.prisma.systemStatus.upsert({
      where: { id: SYSTEM_STATUS_ID },
      update: {
        maintenance_enabled: dto.maintenanceEnabled,
        maintenance_message: dto.message?.trim() || null,
        maintenance_eta: dto.eta?.trim() || null,
        updated_by: actorId
      },
      create: {
        id: SYSTEM_STATUS_ID,
        maintenance_enabled: dto.maintenanceEnabled,
        maintenance_message: dto.message?.trim() || null,
        maintenance_eta: dto.eta?.trim() || null,
        updated_by: actorId
      }
    });

    const status = this.toView(updated);
    // Invalidate cache seketika — perubahan langsung berlaku untuk request berikutnya.
    this.cache = { status, fetchedAt: Date.now() };
    await this.audit(before, status, actorId, ip, roles);
    return status;
  }

  /** Baris status sistem (internal, dipakai middleware/controller bila perlu). */
  async getRow(): Promise<{
    maintenance_enabled: boolean;
    maintenance_message: string | null;
    maintenance_eta: string | null;
    updated_at: Date;
    updated_by: string | null;
  } | null> {
    try {
      return await this.prisma.systemStatus.findUnique({
        where: { id: SYSTEM_STATUS_ID }
      });
    } catch (err) {
      this.logger.warn(`systemStatus tidak dapat dibaca (fail-open): ${(err as Error).message}`);
      return null;
    }
  }

  private toView(
    row: {
      maintenance_enabled: boolean;
      maintenance_message: string | null;
      maintenance_eta: string | null;
      updated_at: Date;
      updated_by: string | null;
    } | null
  ): MaintenanceStatusView {
    if (!row) {
      return DEFAULT_STATUS;
    }
    return {
      maintenanceEnabled: row.maintenance_enabled,
      message: row.maintenance_message,
      eta: row.maintenance_eta,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    };
  }

  private async audit(
    before: MaintenanceStatusView,
    after: MaintenanceStatusView,
    actorId: string,
    ip?: string,
    roles: string[] = []
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: actorId,
          actor_role: resolveActorRole(roles) ?? undefined,
          action: AuditAction.UPDATE,
          entity: "system_status",
          entity_id: SYSTEM_STATUS_ID,
          before: {
            maintenanceEnabled: before.maintenanceEnabled,
            message: before.message,
            eta: before.eta
          } as unknown as Prisma.InputJsonValue,
          after: {
            maintenanceEnabled: after.maintenanceEnabled,
            message: after.message,
            eta: after.eta
          } as unknown as Prisma.InputJsonValue,
          ip_address: ip
        }
      });
    } catch (err) {
      // Audit jangan menggagalkan toggle maintenance.
      this.logger.warn(`auditLog maintenance gagal: ${(err as Error).message}`);
    }
  }
}
