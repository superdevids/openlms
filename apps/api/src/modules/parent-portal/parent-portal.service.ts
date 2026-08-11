/**
 * ParentPortalService — portal wali murid (prd04 §5.L).
 *
 * Scope SENDIRI: setiap akses data anak WAJIB lolos cek ParentStudentLink
 * antara parent (ParentGuardian) dan siswa; jika tidak -> 403.
 */
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { ParentLinkStatus, ParentStudentLink } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { writeAudit, type AuditActorContext } from "../lms/lms-audit";

export interface LinkChildInput {
  parentGuardianId: string;
  studentId: string;
  relationship: "AYAH" | "IBU" | "WALI";
}

export interface ParentOverview {
  studentId: string;
  studentName: string;
  gradesCount: number;
  attendance: { total: number; alpa: number };
  unpaidInvoices: number;
}

@Injectable()
export class ParentPortalService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async ensureParent(userId: string, fullName: string, phone: string) {
    const existing = await this.db.parentGuardian.findFirst({ where: { user_id: userId } });
    if (existing) return existing;
    return this.db.parentGuardian.create({
      data: { user_id: userId, full_name: fullName, phone }
    });
  }

  /** ParentGuardian milik user login (R-08 — kontrak ortu dashboard). */
  async getMyParentGuardian(userId: string) {
    return this.db.parentGuardian.findFirst({ where: { user_id: userId } });
  }

  /**
   * Link anak — hanya wali (ParentGuardian) MILIK aktor yang boleh menautkan,
   * dan hanya siswa aktif ber-role SISWA yang sah ditautkan (SEC-001).
   * Rv5-17: tautan dibuat berstatus PENDING; akses data anak baru terbuka
   * setelah OPERATOR/SUPERADMIN menyetujui (allowlist). Tautan REJECTED boleh
   * diajukan ulang oleh wali (status kembali PENDING).
   */
  async linkChild(input: LinkChildInput, actor: AuditActorContext): Promise<ParentStudentLink> {
    // Cek kepemilikan wali (throws 403 bila bukan milik aktor) — hasilnya tidak dipakai.
    await this.resolveOwnedParent(input.parentGuardianId, actor.userId);
    const student = await this.db.user.findUnique({
      where: { id: input.studentId },
      include: { roles: true }
    });
    if (!student) throw new NotFoundException("Siswa tidak ditemukan");
    if (
      !student.is_active ||
      !student.roles.some((r) => r.role === "SISWA" && r.status === "ACTIVE")
    ) {
      throw new ForbiddenException({
        error: {
          code: "FORBIDDEN",
          message: "Hanya siswa aktif (role SISWA) yang dapat ditautkan"
        }
      });
    }

    const existing = await this.db.parentStudentLink.findUnique({
      where: {
        parent_id_student_id: {
          parent_id: input.parentGuardianId,
          student_id: input.studentId
        }
      }
    });
    if (existing) {
      if (existing.status === "REJECTED") {
        // Allowlist menolak sebelumnya — wali berhak mengajukan ulang.
        const reRequested = await this.db.parentStudentLink.update({
          where: { id: existing.id },
          data: { status: "PENDING" }
        });
        await writeAudit({
          ctx: actor,
          action: "UPDATE",
          entity: "parent_student_link",
          entityId: existing.id,
          before: { status: "REJECTED" },
          after: { status: "PENDING" }
        });
        return reRequested;
      }
      throw new ConflictException("Relasi wali-anak sudah ada");
    }

    const link = await this.db.parentStudentLink.create({
      data: {
        parent_id: input.parentGuardianId,
        student_id: input.studentId,
        relationship: input.relationship,
        status: "PENDING" // Rv5-17: butuh persetujuan OPERATOR sebelum akses data.
      }
    });
    await writeAudit({
      ctx: actor,
      action: "CREATE",
      entity: "parent_student_link",
      entityId: link.id,
      after: {
        parent_id: input.parentGuardianId,
        student_id: input.studentId,
        relationship: input.relationship,
        status: "PENDING"
      }
    });
    return link;
  }

  /** Daftar anak — hanya ParentGuardian milik aktor & tautan APPROVED (SEC-001, Rv5-17). */
  async listChildren(parentGuardianId: string, actor: AuditActorContext) {
    await this.resolveOwnedParent(parentGuardianId, actor.userId);
    return this.db.parentStudentLink.findMany({
      where: { parent_id: parentGuardianId, status: "APPROVED" },
      include: { student: { select: { id: true, full_name: true, email: true, phone: true } } }
    });
  }

  /** Antrian persetujuan tautan (allowlist OPERATOR/SUPERADMIN — Rv5-17). */
  async listPendingLinks() {
    return this.db.parentStudentLink.findMany({
      where: { status: "PENDING" },
      include: {
        parent: { select: { id: true, full_name: true, phone: true } },
        student: { select: { id: true, full_name: true, email: true } }
      },
      orderBy: { created_at: "asc" }
    });
  }

  /** Setujui tautan wali-anak (allowlist OPERATOR/SUPERADMIN). */
  async approveLink(linkId: string, actor: AuditActorContext): Promise<ParentStudentLink> {
    return this.setLinkStatus(linkId, "APPROVED", actor);
  }

  /** Tolak tautan wali-anak (allowlist OPERATOR/SUPERADMIN). */
  async rejectLink(linkId: string, actor: AuditActorContext): Promise<ParentStudentLink> {
    return this.setLinkStatus(linkId, "REJECTED", actor);
  }

  /** Mutasi status tautan + audit; transisi ke status sama ditolak (409). */
  private async setLinkStatus(
    linkId: string,
    status: ParentLinkStatus,
    actor: AuditActorContext
  ): Promise<ParentStudentLink> {
    const link = await this.db.parentStudentLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException("Relasi wali-anak tidak ditemukan");
    if (link.status === status) {
      throw new ConflictException(`Relasi wali-anak sudah berstatus ${status}`);
    }
    const updated = await this.db.parentStudentLink.update({
      where: { id: linkId },
      data: { status }
    });
    await writeAudit({
      ctx: actor,
      action: "UPDATE",
      entity: "parent_student_link",
      entityId: linkId,
      before: { status: link.status },
      after: { status }
    });
    return updated;
  }

  /** Izin anak: daftar consent data anak yang tercatat. */
  async getChildConsents(parentGuardianId: string, studentId: string, actor: AuditActorContext) {
    await this.assertChildAccess(parentGuardianId, studentId, actor);
    return this.db.parentalConsent.findMany({
      where: { student_id: studentId },
      orderBy: { granted_at: "desc" }
    });
  }

  /** Ringkasan nilai/absensi/tagihan anak (read-only, scope SENDIRI). */
  async getStudentOverview(
    parentGuardianId: string,
    studentId: string,
    actor: AuditActorContext
  ): Promise<ParentOverview> {
    await this.assertChildAccess(parentGuardianId, studentId, actor);
    const student = await this.db.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException("Siswa tidak ditemukan");

    const gradesCount = await this.db.grade.count({ where: { student_id: studentId } });
    // Aggregasi status kehadiran dalam SATU query groupBy (bukan memuat seluruh
    // baris absensi lalu filter di memori — ringan untuk rekap lama).
    const attendanceAgg = await this.db.attendance.groupBy({
      by: ["status"],
      where: { student_id: studentId },
      _count: { _all: true }
    });
    const attendanceTotal = attendanceAgg.reduce((sum, r) => sum + r._count._all, 0);
    const alpa = attendanceAgg.find((r) => r.status === "ALPA")?._count._all ?? 0;
    const unpaidInvoices = await this.db.invoice.count({
      where: { student_id: studentId, status: { in: ["PENDING", "OVERDUE"] } }
    });

    return {
      studentId,
      studentName: student.full_name,
      gradesCount,
      attendance: { total: attendanceTotal, alpa },
      unpaidInvoices
    };
  }

  /** ParentGuardian milik aktor — WAJIB: parent.user_id === actor.userId (SEC-001). */
  private async resolveOwnedParent(
    parentGuardianId: string,
    actorUserId: string
  ): Promise<{ id: string }> {
    const parent = await this.db.parentGuardian.findFirst({
      where: { id: parentGuardianId, user_id: actorUserId }
    });
    if (!parent) {
      throw new ForbiddenException({
        error: {
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses ke data wali ini (bukan akun Anda)"
        }
      });
    }
    return parent;
  }

  /** Scope SENDIRI: parent hanya boleh akses anak yang terhubung & APPROVED (SEC-001, Rv5-17). */
  private async assertChildAccess(
    parentGuardianId: string,
    studentId: string,
    actor: AuditActorContext
  ): Promise<void> {
    const parent = await this.resolveOwnedParent(parentGuardianId, actor.userId);
    const link = await this.db.parentStudentLink.findFirst({
      where: { parent_id: parent.id, student_id: studentId, status: "APPROVED" }
    });
    if (!link) {
      throw new ForbiddenException({
        error: {
          code: "FORBIDDEN",
          message: "Anda tidak memiliki akses ke data anak ini (bukan anak Anda)"
        }
      });
    }
  }
}
