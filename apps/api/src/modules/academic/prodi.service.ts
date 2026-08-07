import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { CreateProdiDto, ListProdiQuery, UpdateProdiDto } from "./dto/prodi.dto";

export interface ProdiView {
  id: string;
  code: string;
  name: string;
  shortName: string;
  isActive: boolean;
  classCount: number;
  createdAt: Date;
  updatedAt: Date;
}

function toView(row: ProdiRow): ProdiView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    isActive: row.is_active,
    classCount: row._count?.classes ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

type ProdiRow = Prisma.ProdiGetPayload<{ include: { _count: { select: { classes: true } } } }>;

/**
 * ProdiService — jurusan/kompetensi keahlian (SMK). SMA tidak memakai jurusan.
 * Class naming "10 TKJ 1" via Class.name + prodi relation (Class.prodi_id).
 */
@Injectable()
export class ProdiService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async list(query: ListProdiQuery = {}): Promise<ProdiView[]> {
    const where: Prisma.ProdiWhereInput = {};
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }
    if (query.q) {
      where.OR = [
        { code: { contains: query.q, mode: "insensitive" } },
        { name: { contains: query.q, mode: "insensitive" } },
        { short_name: { contains: query.q, mode: "insensitive" } }
      ];
    }
    const rows = await this.db.prodi.findMany({
      where,
      orderBy: { code: "asc" },
      include: { _count: { select: { classes: true } } }
    });
    return rows.map(toView);
  }

  async getById(id: string): Promise<ProdiView> {
    const row = await this.db.prodi.findUnique({
      where: { id },
      include: { _count: { select: { classes: true } } }
    });
    if (!row) {
      throw new NotFoundException("Prodi tidak ditemukan.");
    }
    return toView(row);
  }

  async create(dto: CreateProdiDto, actorId: string, ip?: string): Promise<ProdiView> {
    const existing = await this.db.prodi.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Kode prodi ${dto.code} sudah dipakai.`);
    }
    const row = await this.db.prodi.create({
      data: {
        code: dto.code,
        name: dto.name,
        short_name: dto.short_name
      },
      include: { _count: { select: { classes: true } } }
    });
    await this.db.auditLog.create({
      data: {
        actor_id: actorId,
        action: AuditAction.CREATE,
        entity: "prodi",
        entity_id: row.id,
        after: { code: row.code, name: row.name } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });
    return toView(row);
  }

  async update(id: string, dto: UpdateProdiDto, actorId: string, ip?: string): Promise<ProdiView> {
    const existing = await this.db.prodi.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Prodi tidak ditemukan.");
    }
    const row = await this.db.prodi.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        short_name: dto.short_name ?? existing.short_name,
        is_active: dto.is_active ?? existing.is_active
      },
      include: { _count: { select: { classes: true } } }
    });
    await this.db.auditLog.create({
      data: {
        actor_id: actorId,
        action: AuditAction.UPDATE,
        entity: "prodi",
        entity_id: row.id,
        before: {
          name: existing.name,
          short_name: existing.short_name,
          is_active: existing.is_active
        } as unknown as Prisma.InputJsonValue,
        after: {
          name: row.name,
          short_name: row.short_name,
          is_active: row.is_active
        } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });
    return toView(row);
  }

  /** Nonaktifkan prodi (soft delete). */
  async deactivate(id: string, actorId: string, ip?: string): Promise<ProdiView> {
    const existing = await this.db.prodi.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Prodi tidak ditemukan.");
    }
    const row = await this.db.prodi.update({
      where: { id },
      data: { is_active: false },
      include: { _count: { select: { classes: true } } }
    });
    await this.db.auditLog.create({
      data: {
        actor_id: actorId,
        action: AuditAction.UPDATE,
        entity: "prodi",
        entity_id: row.id,
        before: { is_active: existing.is_active } as unknown as Prisma.InputJsonValue,
        after: { is_active: false } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });
    return toView(row);
  }
}
