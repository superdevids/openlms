/**
 * InternshipService — PKL/Prakerin (prd04 §5.R: SMK).
 * Jurnal harian + verifikasi oleh pembimbing (sekolah ATAU industri).
 * Penilaian pembimbing industri = verifikasi jurnal + penutupan (COMPLETED).
 * RBAC enforced di SmkController (internship:write:school, internship:journal:self,
 * internship:grade:self); operasi verifikasi/complete di-bind ke actorId terautentikasi.
 */
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { Internship, InternshipJournal } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { writeAudit, type AuditActorContext } from "../lms/lms-audit";

export interface CreateInternshipInput {
  studentId: string;
  partnerId: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  schoolMentorId?: string;
  industryMentorId?: string;
}

export interface AddJournalInput {
  entryDate: string;
  activity: string;
  note?: string;
}

/** Role staf sekolah yang boleh melihat/menulis jurnal PKL (pemegang internship:write:school). */
const SCHOOL_STAFF_ROLES = [
  "SUPERADMIN",
  "KEPSEK",
  "WAKEPSEK",
  "KAPRODI",
  "OPERATOR",
  "GURU",
  "BK",
  "KEUANGAN",
  "AUDITOR"
] as const;

@Injectable()
export class InternshipService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async create(input: CreateInternshipInput, actor: AuditActorContext): Promise<Internship> {
    if (!input.studentId || !input.partnerId || !input.academicYearId) {
      throw new BadRequestException("studentId, partnerId, academicYearId wajib diisi");
    }
    const student = await this.db.user.findUnique({ where: { id: input.studentId } });
    if (!student) throw new NotFoundException("Siswa tidak ditemukan");
    const partner = await this.db.internshipPartner.findUnique({
      where: { id: input.partnerId }
    });
    if (!partner) throw new NotFoundException("Mitra DUDI tidak ditemukan");
    const year = await this.db.academicYear.findUnique({ where: { id: input.academicYearId } });
    if (!year) throw new NotFoundException("Tahun ajaran tidak ditemukan");

    const internship = await this.db.internship.create({
      data: {
        student_id: input.studentId,
        partner_id: input.partnerId,
        academic_year_id: input.academicYearId,
        start_date: new Date(input.startDate),
        end_date: new Date(input.endDate),
        school_mentor_id: input.schoolMentorId,
        industry_mentor_id: input.industryMentorId,
        status: "PLACED"
      }
    });
    await writeAudit({
      ctx: actor,
      action: "CREATE",
      entity: "internship",
      entityId: internship.id,
      after: { student_id: input.studentId, partner_id: input.partnerId, status: "PLACED" }
    });
    return internship;
  }

  async addJournal(
    internshipId: string,
    input: AddJournalInput,
    actor: AuditActorContext
  ): Promise<InternshipJournal> {
    const internship = await this.requireInternship(internshipId);
    this.assertJournalActor(internship, actor);
    if (internship.status === "COMPLETED" || internship.status === "TERMINATED") {
      throw new ForbiddenException(
        `PKL berstatus ${internship.status}; jurnal tidak dapat ditambah`
      );
    }
    const journal = await this.db.internshipJournal.create({
      data: {
        internship_id: internshipId,
        entry_date: new Date(input.entryDate),
        activity: input.activity,
        note: input.note
      }
    });
    await writeAudit({
      ctx: actor,
      action: "CREATE",
      entity: "internship_journal",
      entityId: journal.id,
      after: { internship_id: internshipId, entry_date: journal.entry_date }
    });
    return journal;
  }

  /** Verifikasi jurnal: hanya pembimbing (sekolah/industri) siswa tsb. */
  async verifyJournal(
    journalId: string,
    mentorUserId: string,
    actor: AuditActorContext
  ): Promise<InternshipJournal> {
    const journal = await this.db.internshipJournal.findUnique({
      where: { id: journalId },
      include: {
        internship: { include: { school_mentor: true, industry_mentor: true } }
      }
    });
    if (!journal) throw new NotFoundException("Jurnal tidak ditemukan");
    this.assertMentor(journal.internship, mentorUserId);
    const updated = await this.db.internshipJournal.update({
      where: { id: journalId },
      data: { verified_by_mentor: true }
    });
    await writeAudit({
      ctx: actor,
      action: "UPDATE",
      entity: "internship_journal",
      entityId: journalId,
      before: { verified_by_mentor: false },
      after: { verified_by_mentor: true }
    });
    return updated;
  }

  /** Penilaian pembimbing industri: tutup PKL sebagai COMPLETED. */
  async complete(
    internshipId: string,
    mentorUserId: string,
    actor: AuditActorContext
  ): Promise<Internship> {
    const internship = await this.requireInternship(internshipId);
    this.assertMentor(internship, mentorUserId);
    const updated = await this.db.internship.update({
      where: { id: internshipId },
      data: { status: "COMPLETED" }
    });
    await writeAudit({
      ctx: actor,
      action: "UPDATE",
      entity: "internship",
      entityId: internshipId,
      before: { status: internship.status },
      after: { status: "COMPLETED" }
    });
    return updated;
  }

  async listByMentor(
    mentorUserId: string,
    query: { page?: number; limit?: number } = {}
  ): Promise<{ items: Internship[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      OR: [{ school_mentor_id: mentorUserId }, { industry_mentor: { user_id: mentorUserId } }]
    };
    const [items, total] = await Promise.all([
      this.db.internship.findMany({
        where,
        include: { student: { select: { id: true, full_name: true } } },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.db.internship.count({ where })
    ]);
    return { items, total, page, limit };
  }

  /**
   * Daftar PKL per siswa (paged). Anti-IDOR: hanya staf sekolah (pemegang
   * internship:write:school) yang boleh memfilter bebas per siswa; aktor lain
   * (SISWA dengan internship:journal:self) DIPAKSA ke dirinya sendiri —
   * query studentId dari klien tidak dipercaya (media-review M-04).
   */
  async listByStudent(
    studentId: string,
    actor: AuditActorContext,
    query: { page?: number; limit?: number } = {}
  ): Promise<{ items: Internship[]; total: number; page: number; limit: number }> {
    const isSchoolStaff = actor.roles.some((r) =>
      (SCHOOL_STAFF_ROLES as readonly string[]).includes(r)
    );
    const targetStudentId = isSchoolStaff ? studentId : actor.userId;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { student_id: targetStudentId };
    const [items, total] = await Promise.all([
      this.db.internship.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.db.internship.count({ where })
    ]);
    return { items, total, page, limit };
  }

  async listJournals(internshipId: string, actor: AuditActorContext): Promise<InternshipJournal[]> {
    const internship = await this.requireInternship(internshipId);
    this.assertJournalActor(internship, actor);
    return this.db.internshipJournal.findMany({
      where: { internship_id: internshipId },
      orderBy: { entry_date: "asc" }
    });
  }

  /**
   * Otorisasi akses jurnal PKL (anti-IDOR): pemilik (siswa), pembimbing
   * (sekolah/industri), atau role staf sekolah.
   */
  private assertJournalActor(
    internship: {
      student_id: string;
      school_mentor_id: string | null;
      industry_mentor?: { user_id: string | null } | null;
    },
    actor: AuditActorContext
  ): void {
    const isStudent = actor.userId === internship.student_id;
    const isSchoolMentor = actor.userId === internship.school_mentor_id;
    const isIndustryMentor = actor.userId === internship.industry_mentor?.user_id;
    const isSchoolStaff = actor.roles.some((r) =>
      (SCHOOL_STAFF_ROLES as readonly string[]).includes(r)
    );
    if (!isStudent && !isSchoolMentor && !isIndustryMentor && !isSchoolStaff) {
      throw new ForbiddenException({
        error: {
          code: "FORBIDDEN",
          message: "Anda tidak berhak mengakses jurnal PKL ini"
        }
      });
    }
  }

  private assertMentor(
    internship: {
      school_mentor_id: string | null;
      industry_mentor?: { user_id: string | null } | null;
    },
    mentorUserId: string
  ): void {
    const isSchoolMentor = internship.school_mentor_id === mentorUserId;
    const isIndustryMentor = internship.industry_mentor?.user_id === mentorUserId;
    if (!isSchoolMentor && !isIndustryMentor) {
      throw new ForbiddenException({
        error: {
          code: "FORBIDDEN",
          message: "Anda bukan pembimbing siswa ini"
        }
      });
    }
  }

  private async requireInternship(
    internshipId: string
  ): Promise<Internship & { industry_mentor?: { user_id: string | null } | null }> {
    const internship = await this.db.internship.findUnique({
      where: { id: internshipId },
      include: { industry_mentor: true }
    });
    if (!internship) throw new NotFoundException("PKL tidak ditemukan");
    return internship;
  }
}
