import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { prisma } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import { assertTeacherOfClassSubject, isSchoolScope } from "../lms-scope";
import { writeAudit } from "../lms-audit";
import { StorageService } from "../storage/storage.service";
import { NotificationService } from "../../notifications/notifications.service";
import { RealtimeGateway } from "../../realtime/realtime.gateway";
import { SUBMISSION_GRADED_EVENT } from "../../notifications/notification-events";
import { GradeSubmissionDto, SubmitSubmissionDto } from "./dto/submissions.dto";

/**
 * Store idempotensi in-process (skeleton, F2-T7).
 * Schema Submission TIDAK memiliki kolom idempotency_key — integrasi distributed
 * (multiple instance) memerlukan migrasi kolom tersebut (lihat ISSUES). Untuk
 * satu instance, unique(assignment_id, student_id) + store ini cukup.
 */
const idempotencyStore = new Map<string, string>(); // key -> submissionId

function idempotencyKeyOf(assignmentId: string, studentId: string, key: string): string {
  return `${assignmentId}:${studentId}:${key}`;
}

export interface SubmitResult {
  id: string;
  status: "DRAFT" | "SUBMITTED" | "LATE" | "GRADED" | "RETURNED";
  submittedAt: Date | null;
  isLate: boolean;
  idempotentReplay: boolean;
  replaced?: boolean;
}

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly storageService: StorageService,
    private readonly notifications: NotificationService,
    private readonly realtime: RealtimeGateway
  ) {}

  /** Minta signed URL upload jawaban ke bucket `submissions` (F2-T4). */
  async requestSignedUpload(
    dto: { filename: string; assignmentId: string; contentType?: string },
    ctx: RequestContext
  ) {
    const assignment = await prisma.assignment.findUnique({ where: { id: dto.assignmentId } });
    if (!assignment) throw new NotFoundException("Tugas tidak ditemukan");
    if (!(await this.isEnrolled(ctx.userId, assignment.class_subject_id))) {
      throw new ForbiddenException("Akses ditolak: bukan siswa di kelas ini");
    }
    const objectPath = this.storageService.submissionPath(
      dto.assignmentId,
      ctx.userId,
      dto.filename
    );
    return this.storageService.createSignedUploadUrl({
      bucket: "submissions",
      objectPath,
      contentType: dto.contentType,
      expiresIn: 15 * 60
    });
  }

  /**
   * Submit (idempotent, `Idempotency-Key` wajib):
   * - submit ulang dengan key sama → replay (data tidak ditulis dua kali).
   * - ganti jawaban diizinkan selama belum deadline dan belum dinilai.
   * - deteksi keterlambatan: setelah due_at → status LATE; bila allow_late=false
   *   submission lewat deadline ditolak 409.
   */
  async submit(
    assignmentId: string,
    dto: SubmitSubmissionDto,
    ctx: RequestContext,
    idempotencyKey?: string
  ): Promise<SubmitResult> {
    if (!idempotencyKey || idempotencyKey.trim() === "") {
      throw new BadRequestException("Header Idempotency-Key wajib");
    }
    const key = idempotencyKey.trim();

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException("Tugas tidak ditemukan");

    if (assignment.status === "CLOSED") {
      throw new ConflictException("Tugas sudah ditutup, tidak menerima submission");
    }
    if (!(await this.isEnrolled(ctx.userId, assignment.class_subject_id))) {
      throw new ForbiddenException("Akses ditolak: bukan siswa di kelas ini");
    }

    const now = new Date();
    const isLate = now.getTime() > assignment.due_at.getTime();
    if (isLate && !assignment.allow_late) {
      throw new ConflictException(
        "Tugas sudah lewat deadline dan tidak menerima keterlambatan (allow_late=false)"
      );
    }

    const existing = await prisma.submission.findUnique({
      where: {
        assignment_id_student_id: { assignment_id: assignmentId, student_id: ctx.userId }
      }
    });

    if (existing) {
      return this.handleExisting(existing, dto, assignment, ctx, key, now, isLate);
    }

    const submission = await prisma.submission.create({
      data: {
        assignment_id: assignmentId,
        student_id: ctx.userId,
        content: dto.content,
        attachment_url: dto.attachmentUrl ?? null,
        submitted_at: now,
        status: isLate ? "LATE" : "SUBMITTED"
      }
    });
    idempotencyStore.set(idempotencyKeyOf(assignmentId, ctx.userId, key), submission.id);
    await writeAudit({
      ctx,
      action: "CREATE",
      entity: "submission",
      entityId: submission.id,
      after: submission
    });
    return {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submitted_at,
      isLate,
      idempotentReplay: false
    };
  }

  private async handleExisting(
    existing: {
      id: string;
      status: string;
      submitted_at: Date | null;
      graded_by: string | null;
      graded_at: Date | null;
    },
    dto: SubmitSubmissionDto,
    assignment: { id: string; due_at: Date; allow_late: boolean },
    ctx: RequestContext,
    key: string,
    now: Date,
    isLate: boolean
  ): Promise<SubmitResult> {
    const storeKey = idempotencyKeyOf(assignment.id, ctx.userId, key);

    // Replay idempotent: key sama dengan submit sebelumnya → kembalikan data sama.
    if (idempotencyStore.get(storeKey) === existing.id) {
      const sub = await prisma.submission.findUnique({ where: { id: existing.id } });
      if (sub) {
        return {
          id: sub.id,
          status: sub.status,
          submittedAt: sub.submitted_at,
          isLate: sub.status === "LATE",
          idempotentReplay: true
        };
      }
    }

    if (existing.graded_by || existing.graded_at) {
      throw new ConflictException("Submission sudah dinilai, tidak dapat diganti");
    }

    const isBeforeDeadline =
      existing.submitted_at !== null && existing.submitted_at <= assignment.due_at;
    if (!isBeforeDeadline && isLate && !assignment.allow_late) {
      throw new ConflictException("Tidak dapat mengganti submission setelah deadline");
    }

    const updated = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        content: dto.content,
        attachment_url: dto.attachmentUrl ?? null,
        submitted_at: now,
        status: isLate ? "LATE" : "SUBMITTED"
      }
    });
    idempotencyStore.set(storeKey, existing.id);
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "submission",
      entityId: existing.id,
      before: existing,
      after: updated
    });
    return {
      id: updated.id,
      status: updated.status,
      submittedAt: updated.submitted_at,
      isLate,
      idempotentReplay: false,
      replaced: true
    };
  }

  /** Batalkan submission (status kembali DRAFT) — hanya sebelum deadline & belum dinilai. */
  async cancel(id: string, ctx: RequestContext) {
    const sub = await prisma.submission.findUnique({
      where: { id },
      include: { assignment: true }
    });
    if (!sub) throw new NotFoundException("Submission tidak ditemukan");
    if (!isSchoolScope(ctx) && sub.student_id !== ctx.userId) {
      throw new ForbiddenException("Akses ditolak: bukan submission milik Anda");
    }
    if (sub.graded_by || sub.graded_at) {
      throw new ConflictException("Submission sudah dinilai, tidak dapat dibatalkan");
    }
    if (sub.submitted_at !== null && sub.submitted_at > sub.assignment.due_at) {
      throw new ConflictException("Tidak dapat membatalkan submission setelah deadline");
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: { status: "DRAFT", submitted_at: null }
    });
    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "submission",
      entityId: id,
      before: sub,
      after: updated
    });
    return updated;
  }

  /** Semua submission satu tugas (untuk dinilai) — scope guru pengampu. */
  async findAllByAssignment(assignmentId: string, ctx: RequestContext) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class_subject: true }
    });
    if (!assignment) throw new NotFoundException("Tugas tidak ditemukan");
    assertTeacherOfClassSubject(ctx, assignment.class_subject);

    return prisma.submission.findMany({
      where: { assignment_id: assignmentId },
      include: {
        student: { select: { id: true, full_name: true, username: true } },
        graded_by_user: { select: { id: true, full_name: true } }
      },
      orderBy: { submitted_at: "asc" }
    });
  }

  /**
   * Penilaian skor + feedback (F2-T8): update Submission → GRADED, tulis Grade
   * (type TUGAS, source_id = submission) + AuditLog. Regrade memakai upsert
   * agar unique(grade) tidak bentrok.
   */
  async grade(submissionId: string, dto: GradeSubmissionDto, ctx: RequestContext) {
    const sub = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            class_subject: { include: { class: { include: { academic_year: true } } } }
          }
        }
      }
    });
    if (!sub) throw new NotFoundException("Submission tidak ditemukan");
    assertTeacherOfClassSubject(ctx, sub.assignment.class_subject);

    if (dto.score > sub.assignment.max_score) {
      throw new BadRequestException(`Skor maksimal ${sub.assignment.max_score}`);
    }

    const graded = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback ?? null,
        status: "GRADED",
        graded_by: ctx.userId,
        graded_at: new Date()
      }
    });

    const gradeKey = {
      student_id: sub.student_id,
      class_subject_id: sub.assignment.class_subject_id,
      semester: sub.assignment.class_subject.semester,
      type: "TUGAS" as const,
      source_id: sub.id
    };
    await prisma.grade.upsert({
      where: { student_id_class_subject_id_semester_type_source_id: gradeKey },
      create: {
        ...gradeKey,
        academic_year: sub.assignment.class_subject.class.academic_year.code,
        score: dto.score,
        weight: 1,
        note: dto.feedback ?? `Nilai ${sub.assignment.title}`
      },
      update: {
        score: dto.score,
        note: dto.feedback ?? undefined
      }
    });

    await writeAudit({
      ctx,
      action: "UPDATE",
      entity: "submission",
      entityId: submissionId,
      before: sub,
      after: graded
    });
    await this.notifyGraded(graded, sub.assignment.title);
    return graded;
  }

  /**
   * Notifikasi + event realtime ke siswa saat submission dinilai (best-effort):
   * - NotificationService → notifikasi inbox (notification:new + assignment:graded);
   * - event eksplisit submission:graded ke room user:{studentId} (payload ringan).
   * Gagal emit tidak menggagalkan penilaian — REST tetap sumber kebenaran.
   */
  private async notifyGraded(
    graded: { id: string; student_id: string; score: number | null; status: string },
    assignmentTitle: string
  ): Promise<void> {
    try {
      await this.notifications.createForUser({
        userId: graded.student_id,
        type: "TASK_GRADED",
        title: "Tugas dinilai",
        body: `${assignmentTitle} — skor ${graded.score ?? "-"}`,
        data: { submissionId: graded.id, score: graded.score }
      });
      this.realtime.emitToUser(graded.student_id, SUBMISSION_GRADED_EVENT, {
        submissionId: graded.id,
        assignmentTitle,
        score: graded.score,
        status: graded.status
      });
    } catch {
      // best-effort
    }
  }

  private async isEnrolled(studentId: string, classSubjectId: string): Promise<boolean> {
    const cs = await prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: {
        class: {
          include: { enrollments: { where: { student_id: studentId }, select: { id: true } } }
        }
      }
    });
    return (cs?.class.enrollments.length ?? 0) > 0;
  }
}
