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
import type { ParentStudentLink } from "@prisma/client";
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

  async linkChild(input: LinkChildInput, actor: AuditActorContext): Promise<ParentStudentLink> {
    const parent = await this.db.parentGuardian.findUnique({
      where: { id: input.parentGuardianId }
    });
    if (!parent) throw new NotFoundException("ParentGuardian tidak ditemukan");
    const student = await this.db.user.findUnique({ where: { id: input.studentId } });
    if (!student) throw new NotFoundException("Siswa tidak ditemukan");

    const existing = await this.db.parentStudentLink.findUnique({
      where: {
        parent_id_student_id: {
          parent_id: input.parentGuardianId,
          student_id: input.studentId
        }
      }
    });
    if (existing) throw new ConflictException("Relasi wali-anak sudah ada");

    const link = await this.db.parentStudentLink.create({
      data: {
        parent_id: input.parentGuardianId,
        student_id: input.studentId,
        relationship: input.relationship
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
        relationship: input.relationship
      }
    });
    return link;
  }

  async listChildren(parentGuardianId: string) {
    return this.db.parentStudentLink.findMany({
      where: { parent_id: parentGuardianId },
      include: { student: { select: { id: true, full_name: true, email: true, phone: true } } }
    });
  }

  /** Izin anak: daftar consent data anak yang tercatat. */
  async getChildConsents(parentGuardianId: string, studentId: string) {
    await this.assertChildAccess(parentGuardianId, studentId);
    return this.db.parentalConsent.findMany({
      where: { student_id: studentId },
      orderBy: { granted_at: "desc" }
    });
  }

  /** Ringkasan nilai/absensi/tagihan anak (read-only, scope SENDIRI). */
  async getStudentOverview(parentGuardianId: string, studentId: string): Promise<ParentOverview> {
    await this.assertChildAccess(parentGuardianId, studentId);
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

  /** Scope SENDIRI: parent hanya boleh akses anak yang terhubung. */
  private async assertChildAccess(parentGuardianId: string, studentId: string): Promise<void> {
    const link = await this.db.parentStudentLink.findFirst({
      where: { parent_id: parentGuardianId, student_id: studentId }
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
