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

  async listByMentor(mentorUserId: string): Promise<Internship[]> {
    return this.db.internship.findMany({
      where: {
        OR: [{ school_mentor_id: mentorUserId }, { industry_mentor: { user_id: mentorUserId } }]
      },
      include: { student: { select: { id: true, full_name: true } } },
      orderBy: { created_at: "desc" }
    });
  }

  async listByStudent(studentId: string): Promise<Internship[]> {
    return this.db.internship.findMany({
      where: { student_id: studentId },
      orderBy: { created_at: "desc" }
    });
  }

  async listJournals(internshipId: string): Promise<InternshipJournal[]> {
    await this.requireInternship(internshipId);
    return this.db.internshipJournal.findMany({
      where: { internship_id: internshipId },
      orderBy: { entry_date: "asc" }
    });
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
