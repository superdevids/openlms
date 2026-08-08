import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";

/** Satu baris audit untuk UI change-log (camelCase, actorName dari relasi User). */
export interface AuditLogItemView {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AuditLogPage {
  items: AuditLogItemView[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * AuditLogService — baca change-log (docs/03 §4.12).
 * Hanya dibaca; penulisan audit memakai writeAudit (modules/lms/lms-audit).
 * Guard RBAC (audit:read:school + role SUPERADMIN/KEPSEK) di controller.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(dto: QueryAuditLogDto): Promise<AuditLogPage> {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;

    const where: Prisma.AuditLogWhereInput = {};
    if (dto.entity) where.entity = dto.entity;
    if (dto.actorId) where.actor_id = dto.actorId;
    if (dto.action) where.action = dto.action;
    if (dto.from || dto.to) {
      where.created_at = {
        ...(dto.from ? { gte: new Date(dto.from) } : {}),
        ...(dto.to ? { lte: new Date(dto.to) } : {})
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { full_name: true } } },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        actorId: r.actor_id,
        actorName: r.actor?.full_name ?? null,
        actorRole: r.actor_role,
        action: r.action,
        entity: r.entity,
        entityId: r.entity_id,
        before: r.before,
        after: r.after,
        ipAddress: r.ip_address,
        createdAt: r.created_at
      })),
      total,
      page,
      pageSize
    };
  }

  /** Distinct daftar entity untuk dropdown filter. */
  async listEntities(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ["entity"],
      select: { entity: true },
      orderBy: { entity: "asc" }
    });
    return rows.map((r) => r.entity);
  }
}
