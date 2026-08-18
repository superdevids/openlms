import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PdpRequestStatus, Prisma } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { writeAudit } from "../lms/lms-audit";
import { resolveExportPath } from "../lms/grades/grade-export.service";
import { buildCsv } from "../lms/grades/export-file";
import { PdpAnonymizeService } from "./pdp-anonymize.service";
import { PdpRetentionService, RetentionRunResult } from "./pdp-retention.service";
import {
  PDP_AUDIT_ENTITY_DATA_ACCESS,
  PDP_AUDIT_ENTITY_DATA_EXPORT,
  PDP_AUDIT_ENTITY_REQUEST,
  PDP_EXPORT_TYPE,
  type RetentionEntity
} from "./pdp.constants";
import { UpdateMyProfileDto } from "./dto/update-my-profile.dto";
import { ExportPersonalDataDto } from "./dto/export-personal-data.dto";
import { CreateDeleteRequestDto } from "./dto/create-delete-request.dto";
import { ReviewRequestDto } from "./dto/review-request.dto";
import { UpsertRetentionPolicyDto } from "./dto/upsert-retention-policy.dto";

/** Field yang boleh diubah lewat PUT /pdp/me (allowlist ketat). */
const PROFILE_ALLOWLIST = new Set(["fullName", "phone", "preferredLanguage"]);

/**
 * PdpService — kepatuhan UU PDP: akses/ekspor data pribadi, permintaan
 * penghapusan, review admin, dan retensi data.
 *
 * Keamanan: SEMUA scope self memakai userId dari RequestContext (JWT) —
 * TIDAK PERNAH parameter klien. Ekspor ditulis ke STORAGE_EXPORT_DIR dengan
 * containment check resolveExportPath (anti path traversal).
 */
@Injectable()
export class PdpService {
  private readonly exportDir: string;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly anonymizeService: PdpAnonymizeService,
    private readonly retentionService: PdpRetentionService
  ) {
    this.exportDir = process.env.STORAGE_EXPORT_DIR ?? join(process.cwd(), "storage", "exports");
    mkdirSync(this.exportDir, { recursive: true });
  }

  /** Kumpulkan data pribadi user (tanpa audit) — dipakai ekspor & akses. */
  private async collectData(userId: string) {
    const [profile, roles, enrollments, consents, auditLogs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          full_name: true,
          phone: true,
          avatar_url: true,
          is_active: true,
          preferred_language: true,
          created_at: true,
          updated_at: true
        }
      }),
      this.prisma.userRole.findMany({
        where: { user_id: userId },
        select: { role: true, status: true, joined_at: true },
        orderBy: { role: "asc" }
      }),
      this.prisma.enrollment.findMany({
        where: { student_id: userId },
        select: {
          id: true,
          status: true,
          created_at: true,
          class: { select: { id: true, name: true, grade_level: true } },
          academic_year: { select: { code: true, name: true } }
        },
        orderBy: { created_at: "desc" }
      }),
      this.prisma.parentalConsent.findMany({
        where: { student_id: userId },
        select: {
          id: true,
          consent_type: true,
          status: true,
          granted_at: true,
          revoked_at: true
        },
        orderBy: { granted_at: "desc" }
      }),
      this.prisma.auditLog.findMany({
        where: { OR: [{ actor_id: userId }, { entity: "user", entity_id: userId }] },
        select: { id: true, action: true, entity: true, entity_id: true, created_at: true },
        orderBy: { created_at: "desc" },
        take: 100
      })
    ]);

    if (!profile) {
      throw new NotFoundException("User tidak ditemukan");
    }
    return { profile, roles, enrollments, consents, auditLogs };
  }

  /** GET /pdp/me/data — akses data pribadi sendiri + audit VIEW. */
  async collectPersonalData(userId: string, ctx: RequestContext) {
    const data = await this.collectData(userId);
    await writeAudit({
      ctx,
      action: "VIEW",
      entity: PDP_AUDIT_ENTITY_DATA_ACCESS,
      entityId: userId
    });
    return data;
  }

  /** PUT /pdp/me — update profil allowlist; email/username DITOLAK 400. */
  async updateMyProfile(userId: string, dto: UpdateMyProfileDto, ctx: RequestContext) {
    const extra = Object.keys(dto).filter((key) => !PROFILE_ALLOWLIST.has(key));
    if (extra.length > 0) {
      throw new BadRequestException(`Field tidak dapat diubah: ${extra.join(", ")}`);
    }

    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) {
      throw new NotFoundException("User tidak ditemukan");
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.full_name = dto.fullName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.preferredLanguage !== undefined) data.preferred_language = dto.preferredLanguage;

    const updated = await this.prisma.user.update({ where: { id: userId }, data });

    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "user",
      entityId: userId,
      before: {
        full_name: before.full_name,
        phone: before.phone,
        preferred_language: before.preferred_language
      },
      after: {
        full_name: updated.full_name,
        phone: updated.phone,
        preferred_language: updated.preferred_language
      }
    });
    return updated;
  }

  /** POST /pdp/me/export — tulis JSON/CSV ke STORAGE_EXPORT_DIR + DataExportLog. */
  async exportPersonalData(userId: string, dto: ExportPersonalDataDto, ctx: RequestContext) {
    const data = await this.collectData(userId);
    const format = dto.format ?? "json";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `pdp_export_${userId}_${stamp}.${format}`;
    const filePath = resolveExportPath(this.exportDir, filename);
    const content = format === "csv" ? this.toCsv(data) : JSON.stringify(data, null, 2);
    writeFileSync(filePath, content, "utf8");

    const log = await this.prisma.dataExportLog.create({
      data: {
        export_type: PDP_EXPORT_TYPE,
        requested_by: userId,
        status: "COMPLETED",
        file_url: `exports/${filename}`,
        record_count: 1,
        finished_at: new Date()
      }
    });

    await writeAudit({
      ctx,
      action: "EXPORT",
      entity: PDP_AUDIT_ENTITY_DATA_EXPORT,
      entityId: log.id,
      after: { format, filename }
    });

    return { id: log.id, fileUrl: log.file_url, format, recordCount: 1 };
  }

  /** GET /pdp/me/exports — riwayat ekspor data pribadi sendiri. */
  async listMyExports(userId: string) {
    return this.prisma.dataExportLog.findMany({
      where: { requested_by: userId, export_type: PDP_EXPORT_TYPE },
      orderBy: { created_at: "desc" }
    });
  }

  /** GET /pdp/me/exports/:id/download — hanya ekspor milik sendiri (PERSONAL). */
  async downloadMyExport(
    userId: string,
    logId: string
  ): Promise<{ filename: string; filePath: string }> {
    const log = await this.prisma.dataExportLog.findUnique({ where: { id: logId } });
    if (!log) {
      throw new NotFoundException("Ekspor tidak ditemukan");
    }
    if (log.requested_by !== userId || log.export_type !== PDP_EXPORT_TYPE) {
      throw new ForbiddenException("Akses ditolak: ekspor bukan milik Anda");
    }
    const filename = basename(log.file_url ?? "");
    if (!filename) {
      throw new NotFoundException("Ekspor tidak ditemukan");
    }
    const filePath = resolveExportPath(this.exportDir, filename);
    return { filename, filePath };
  }

  /** POST /pdp/me/delete-request — dedupe: 1 PENDING per user (409). */
  async requestDelete(userId: string, dto: CreateDeleteRequestDto, ctx: RequestContext) {
    const existing = await this.prisma.pdpRequest.findFirst({
      where: { user_id: userId, status: "PENDING" }
    });
    if (existing) {
      throw new ConflictException("Permintaan penghapusan data masih menunggu review.");
    }
    const created = await this.prisma.pdpRequest.create({
      data: { user_id: userId, type: "DELETE", reason: dto.reason ?? null }
    });
    await writeAudit({
      ctx,
      action: "CREATE",
      entity: PDP_AUDIT_ENTITY_REQUEST,
      entityId: created.id,
      after: { type: created.type, status: created.status }
    });
    return created;
  }

  /** GET /pdp/me/requests — riwayat permintaan sendiri. */
  async listMyRequests(userId: string) {
    return this.prisma.pdpRequest.findMany({
      where: { user_id: userId },
      orderBy: { requested_at: "desc" }
    });
  }

  /** GET /pdp/requests — daftar permintaan (admin, pdp:review:school). */
  async listRequestsAdmin(filter: { status?: string }) {
    const validStatus =
      filter.status && ["PENDING", "APPROVED", "REJECTED", "EXECUTED"].includes(filter.status);
    return this.prisma.pdpRequest.findMany({
      where: validStatus ? { status: filter.status as PdpRequestStatus } : {},
      include: {
        user: { select: { id: true, full_name: true, username: true, email: true } }
      },
      orderBy: { requested_at: "desc" }
    });
  }

  /** POST /pdp/requests/:id/approve — anonimisasi user + status EXECUTED. */
  async approveRequest(
    requestId: string,
    adminId: string,
    dto: ReviewRequestDto,
    ctx: RequestContext
  ) {
    const req = await this.prisma.pdpRequest.findUnique({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException("Permintaan tidak ditemukan");
    }
    if (req.status !== "PENDING") {
      throw new ConflictException("Permintaan sudah diproses.");
    }
    await this.anonymizeService.anonymizeUser(req.user_id, req.id, ctx);
    return this.prisma.pdpRequest.update({
      where: { id: requestId },
      data: {
        status: "EXECUTED",
        processed_by: adminId,
        processed_at: new Date(),
        processed_note: dto.note ?? null
      }
    });
  }

  /** POST /pdp/requests/:id/reject — status REJECTED. */
  async rejectRequest(requestId: string, adminId: string, dto: ReviewRequestDto) {
    const req = await this.prisma.pdpRequest.findUnique({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException("Permintaan tidak ditemukan");
    }
    if (req.status !== "PENDING") {
      throw new ConflictException("Permintaan sudah diproses.");
    }
    return this.prisma.pdpRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        processed_by: adminId,
        processed_at: new Date(),
        processed_note: dto.note ?? null
      }
    });
  }

  /** GET /pdp/consents — consent data pribadi sendiri. */
  async listConsents(userId: string) {
    return this.prisma.parentalConsent.findMany({
      where: { student_id: userId },
      orderBy: { granted_at: "desc" }
    });
  }

  /** GET /pdp/retention — daftar kebijakan retensi. */
  async getRetentionPolicies() {
    return this.prisma.dataRetentionPolicy.findMany({ orderBy: { entity: "asc" } });
  }

  /** PUT /pdp/retention/:entity — upsert kebijakan retensi (entity dari param). */
  async upsertRetentionPolicy(entity: RetentionEntity, dto: UpsertRetentionPolicyDto) {
    const existing = await this.prisma.dataRetentionPolicy.findFirst({
      where: { entity }
    });
    const data = {
      retention_months: dto.retentionMonths,
      action: dto.action,
      enabled: dto.enabled ?? true
    };
    if (existing) {
      return this.prisma.dataRetentionPolicy.update({ where: { id: existing.id }, data });
    }
    return this.prisma.dataRetentionPolicy.create({ data: { entity, ...data } });
  }

  /** POST /pdp/retention/run — jalankan job retensi. */
  async runRetention(): Promise<RetentionRunResult> {
    return this.retentionService.run();
  }

  /** Serialisasi bundle data pribadi menjadi CSV (section, field, value). */
  private toCsv(data: Awaited<ReturnType<PdpService["collectData"]>>): string {
    const rows: string[][] = [];
    const add = (section: string, field: string, value: unknown): void => {
      rows.push([section, field, value === null || value === undefined ? "" : String(value)]);
    };
    const p = data.profile;
    add("profile", "id", p.id);
    add("profile", "username", p.username);
    add("profile", "email", p.email);
    add("profile", "full_name", p.full_name);
    add("profile", "phone", p.phone);
    add("profile", "is_active", p.is_active);
    add("profile", "preferred_language", p.preferred_language);
    add("profile", "created_at", p.created_at);
    for (const r of data.roles) add("role", r.role, r.status);
    for (const e of data.enrollments) add("enrollment", e.class?.name ?? e.id, e.status);
    for (const c of data.consents) add("consent", c.consent_type, c.status);
    for (const a of data.auditLogs) add("audit", a.entity, a.action);
    // buildCsv menetralkan CSV formula injection (nilai diawali = + - @ diberi
    // prefix apostrof) — konsisten dengan ekspor nilai (grade-export).
    return buildCsv(rows, ["section", "field", "value"]);
  }
}
