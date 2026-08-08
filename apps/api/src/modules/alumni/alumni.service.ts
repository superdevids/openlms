/**
 * AlumniService — direktori & tracking lulusan (prd04 §5.J/§5.R).
 * Data alumni lahir dari proses rollover (GRADUATED -> Alumni).
 * RBAC enforced di AlumniController (baca = user:read:school; tulis/arsip =
 * user:write:school).
 */
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Alumni } from "@prisma/client";
import type { AlumniStatus } from "@opensis/types";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { writeAudit, type AuditActorContext } from "../lms/lms-audit";

export interface AlumniFilter {
  graduationYearId?: string;
  status?: AlumniStatus;
  search?: string;
}

export interface CreateAlumniInput {
  studentId: string;
  graduationYearId: string;
  finalNisn?: string;
  graduationDate?: string;
}

@Injectable()
export class AlumniService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  /** Direktori alumni — filter angkatan/status + pencarian nama/NISN. */
  async list(filter: AlumniFilter = {}): Promise<Alumni[]> {
    return this.db.alumni.findMany({
      where: {
        graduation_academic_year_id: filter.graduationYearId,
        status: filter.status,
        ...(filter.search
          ? {
              OR: [
                { student: { full_name: { contains: filter.search, mode: "insensitive" } } },
                { final_nisn: { contains: filter.search } }
              ]
            }
          : {})
      },
      include: {
        student: { select: { id: true, full_name: true, email: true, phone: true } }
      },
      orderBy: { graduation_date: "desc" }
    });
  }

  /** Buat alumni dari siswa dengan enrollment GRADUATED di tahun tersebut. */
  async createFromGraduation(input: CreateAlumniInput): Promise<Alumni> {
    const student = await this.db.user.findUnique({ where: { id: input.studentId } });
    if (!student) throw new NotFoundException("Siswa tidak ditemukan");

    const graduated = await this.db.enrollment.findFirst({
      where: { student_id: input.studentId, academic_year_id: input.graduationYearId }
    });
    if (!graduated) {
      throw new BadRequestException(
        "Siswa tidak memiliki enrollment di tahun kelulusan; buat melalui rollover"
      );
    }

    return this.db.alumni.create({
      data: {
        student_id: input.studentId,
        graduation_academic_year_id: input.graduationYearId,
        final_nisn: input.finalNisn,
        graduation_date: input.graduationDate ? new Date(input.graduationDate) : new Date()
      }
    });
  }

  async archive(id: string, actor: AuditActorContext): Promise<Alumni> {
    return this.updateStatus(id, "ARCHIVED", actor);
  }

  async unarchive(id: string, actor: AuditActorContext): Promise<Alumni> {
    return this.updateStatus(id, "ACTIVE", actor);
  }

  private async updateStatus(
    id: string,
    status: AlumniStatus,
    actor: AuditActorContext
  ): Promise<Alumni> {
    const alumni = await this.db.alumni.findUnique({ where: { id } });
    if (!alumni) throw new NotFoundException("Alumni tidak ditemukan");
    if (alumni.status === status) return alumni;
    const updated = await this.db.alumni.update({ where: { id }, data: { status } });
    await writeAudit({
      ctx: actor,
      action: "UPDATE",
      entity: "alumni",
      entityId: id,
      before: { status: alumni.status },
      after: { status }
    });
    return updated;
  }
}
