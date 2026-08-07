/**
 * PpdbService — Penerimaan Peserta Didik Baru (prd04 §5.J).
 *
 * Alur: register (form publik, Wajib consent ParentalConsent bertimestamp)
 * -> SUBMITTED -> verifikasi OPERATOR (VERIFIED/REJECTED) -> seleksi
 * (SELECTED/WAITLIST) -> pengumuman (data-level) -> enroll ke tahun ajaran
 * (UserRole SISWA + Enrollment, status ENROLLED).
 *
 * RBAC enforced di PpdbController: register @Public; track CALON_SISWA
 * (ppdb:read:self); verify/select/waitlist/enroll = ppdb:verify:school /
 * ppdb:select:school / ppdb:enroll:school (OPERATOR/SUPERADMIN).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { PpdbApplicant } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { AcademicYearGuard } from "../academic/academic-year.guard";

export interface ConsentProofInput {
  parentName: string;
  /** Path bukti consent (bucket ppdb-consents). WAJIB ada. */
  documentUrl: string;
}

export interface RegisterPpdbInput {
  fullName: string;
  nisn?: string;
  birthDate: string;
  birthPlace: string;
  gender: "L" | "P";
  originSchool?: string;
  phone: string;
  email?: string;
  parentName: string;
  parentPhone: string;
  /** Path dokumen pendaftaran (bucket ppdb-documents). */
  documents?: { type: string; url: string }[];
  consent: ConsentProofInput;
}

export interface SelectionInput {
  selectionScore: number;
}

@Injectable()
export class PpdbService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    private readonly yearGuard: AcademicYearGuard
  ) {}

  /** Register publik: membuat ParentalConsent (GRANTED + timestamp) + applicant. */
  async register(input: RegisterPpdbInput): Promise<PpdbApplicant> {
    if (!input.fullName || !input.phone || !input.parentName) {
      throw new BadRequestException("fullName, phone, parentName wajib diisi");
    }
    if (!input.consent?.parentName || !input.consent?.documentUrl) {
      throw new BadRequestException(
        "Consent wajib menyertakan parentName dan documentUrl (bukti persetujuan)"
      );
    }

    const consent = await this.db.parentalConsent.create({
      data: {
        parent_name: input.consent.parentName,
        consent_type: "DATA_CHILD",
        status: "GRANTED",
        granted_at: new Date(),
        document_url: input.consent.documentUrl
      }
    });

    const registrationNo = `PPDB-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const applicant = await this.db.ppdbApplicant.create({
      data: {
        registration_no: registrationNo,
        full_name: input.fullName,
        nisn: input.nisn,
        birth_date: new Date(input.birthDate),
        birth_place: input.birthPlace,
        gender: input.gender,
        origin_school: input.originSchool,
        phone: input.phone,
        email: input.email,
        parent_name: input.parentName,
        parent_phone: input.parentPhone,
        status: "SUBMITTED",
        documents: input.documents ?? [],
        consent_id: consent.id
      }
    });

    return applicant;
  }

  /** Tracking publik dengan token (registration_no). */
  async track(registrationNo: string): Promise<PpdbApplicant> {
    // registration_no hanya @@index (bukan unik) di schema -> pakai findFirst.
    const applicant = await this.db.ppdbApplicant.findFirst({
      where: { registration_no: registrationNo }
    });
    if (!applicant) throw new NotFoundException("Pendaftar tidak ditemukan");
    return applicant;
  }

  /** Verifikasi OPERATOR: VERIFIED atau REJECTED (dengan alasan opsional). */
  async verify(applicantId: string, approve: boolean): Promise<PpdbApplicant> {
    const applicant = await this.requireApplicant(applicantId);
    if (!["SUBMITTED"].includes(applicant.status)) {
      throw new ConflictException(
        `Verifikasi hanya untuk status SUBMITTED (saat ini ${applicant.status})`
      );
    }
    return this.db.ppdbApplicant.update({
      where: { id: applicant.id },
      data: { status: approve ? "VERIFIED" : "REJECTED" }
    });
  }

  /** Seleksi: SELECTED (lolos) atau WAITLIST berdasarkan skor. */
  async select(applicantId: string, input: SelectionInput): Promise<PpdbApplicant> {
    const applicant = await this.requireApplicant(applicantId);
    if (applicant.status !== "VERIFIED") {
      throw new ConflictException("Seleksi hanya untuk pendaftar VERIFIED");
    }
    if (input.selectionScore < 0 || input.selectionScore > 100) {
      throw new BadRequestException("selectionScore harus 0-100");
    }
    return this.db.ppdbApplicant.update({
      where: { id: applicant.id },
      data: { selection_score: input.selectionScore, status: "SELECTED" }
    });
  }

  async waitlist(applicantId: string, input: SelectionInput): Promise<PpdbApplicant> {
    const applicant = await this.requireApplicant(applicantId);
    if (applicant.status !== "VERIFIED") {
      throw new ConflictException("Seleksi hanya untuk pendaftar VERIFIED");
    }
    return this.db.ppdbApplicant.update({
      where: { id: applicant.id },
      data: { selection_score: input.selectionScore, status: "WAITLIST" }
    });
  }

  /** Pengumuman: daftar pendaftar lolos seleksi. */
  async listSelection(): Promise<PpdbApplicant[]> {
    return this.db.ppdbApplicant.findMany({
      where: { status: { in: ["SELECTED", "WAITLIST"] } },
      orderBy: { selection_score: "desc" }
    });
  }

  /** Enroll calon terpilih ke tahun ajaran baru: UserRole SISWA + Enrollment. */
  async enroll(
    applicantId: string,
    academicYearId: string,
    classId: string
  ): Promise<PpdbApplicant> {
    const applicant = await this.requireApplicant(applicantId);
    if (applicant.status !== "SELECTED") {
      throw new ConflictException(
        `Enroll hanya untuk status SELECTED (saat ini ${applicant.status})`
      );
    }
    await this.yearGuard.assertWritable(academicYearId);

    const user = applicant.user_id
      ? await this.db.user.findUnique({ where: { id: applicant.user_id } })
      : null;
    if (!user) {
      throw new ForbiddenException({
        error: {
          code: "CONFLICT",
          message:
            "Calon belum punya akun User; tautkan akun (user_id) pada pendaftar sebelum enroll"
        }
      });
    }

    const existingRole = await this.db.userRole.findFirst({
      where: { user_id: user.id, role: "SISWA" }
    });
    if (!existingRole) {
      await this.db.userRole.create({
        data: { user_id: user.id, role: "SISWA", status: "ACTIVE" }
      });
    }

    await this.db.enrollment.create({
      data: {
        student_id: user.id,
        class_id: classId,
        academic_year_id: academicYearId,
        status: "ACTIVE"
      }
    });

    // Tautkan consent ke siswa aktif.
    if (applicant.consent_id) {
      await this.db.parentalConsent.update({
        where: { id: applicant.consent_id },
        data: { student_id: user.id }
      });
    }

    return this.db.ppdbApplicant.update({
      where: { id: applicant.id },
      data: { status: "ENROLLED" }
    });
  }

  private async requireApplicant(applicantId: string): Promise<PpdbApplicant> {
    const applicant = await this.db.ppdbApplicant.findUnique({ where: { id: applicantId } });
    if (!applicant) throw new NotFoundException("Pendaftar tidak ditemukan");
    return applicant;
  }
}
