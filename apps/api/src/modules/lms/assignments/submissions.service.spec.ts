import { BadRequestException, ConflictException } from "@nestjs/common";
import type { RequestContext } from "@opensis/types";

jest.mock("@opensis/database", () => ({
  prisma: {
    assignment: { findUnique: jest.fn() },
    classSubject: { findUnique: jest.fn() },
    submission: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    grade: { upsert: jest.fn() },
    auditLog: { create: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { SubmissionsService } from "./submissions.service";
import { StorageService } from "../storage/storage.service";

const prismaMock = prisma as unknown as {
  assignment: { findUnique: jest.Mock };
  classSubject: { findUnique: jest.Mock };
  submission: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  grade: { upsert: jest.Mock };
  auditLog: { create: jest.Mock };
};

const studentCtx: RequestContext = {
  userId: "s_1",
  roles: ["SISWA"],
  classIds: ["c_1"],
  homeroomClassId: null,
  requestId: "req_test"
};

const teacherCtx: RequestContext = {
  userId: "t_1",
  roles: ["GURU"],
  classIds: ["c_1"],
  homeroomClassId: null,
  requestId: "req_test"
};

function mockEnrolled(): void {
  prismaMock.classSubject.findUnique.mockResolvedValue({
    id: "cs_1",
    teacher_id: "t_1",
    class: { enrollments: [{ id: "enr_1" }] }
  });
}

function makeAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "asg_1",
    class_subject_id: "cs_1",
    title: "Tugas 1",
    due_at: new Date(Date.now() + 3_600_000), // +1 jam
    allow_late: false,
    status: "PUBLISHED",
    max_score: 100,
    ...overrides
  };
}

describe("SubmissionsService", () => {
  let service: SubmissionsService;
  const notifications = { createForUser: jest.fn(), createForRoles: jest.fn() };
  const realtime = {
    emitToUser: jest.fn(),
    emitToClass: jest.fn(),
    emitToExam: jest.fn(),
    emitToAll: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubmissionsService(
      new StorageService(),
      notifications as never,
      realtime as never
    );
    mockEnrolled();
  });

  describe("submit idempotent (F2-T7)", () => {
    it("tanpa Idempotency-Key → 400", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue(makeAssignment());
      await expect(
        service.submit("asg_1", { content: "jawaban" }, studentCtx, undefined)
      ).rejects.toThrow(BadRequestException);
    });

    it("submit pertama membuat 1 submission; replay dengan key sama tidak membuat lagi", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue(makeAssignment());
      prismaMock.submission.findUnique
        .mockResolvedValueOnce(null) // belum ada
        .mockResolvedValue({
          id: "sub_1",
          status: "SUBMITTED",
          submitted_at: new Date(),
          graded_by: null,
          graded_at: null
        }); // replay: data yang sama untuk semua panggilan berikutnya
      prismaMock.submission.create.mockResolvedValue({
        id: "sub_1",
        status: "SUBMITTED",
        submitted_at: new Date()
      });

      const first = await service.submit("asg_1", { content: "v1" }, studentCtx, "key-1");
      const replay = await service.submit("asg_1", { content: "v1" }, studentCtx, "key-1");

      expect(first.idempotentReplay).toBe(false);
      expect(first.isLate).toBe(false);
      expect(replay.idempotentReplay).toBe(true);
      expect(prismaMock.submission.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1); // hanya CREATE pertama
    });
  });

  describe("deteksi keterlambatan", () => {
    it("submit setelah due_at dengan allow_late=true → status LATE", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue(
        makeAssignment({
          due_at: new Date(Date.now() - 3_600_000),
          allow_late: true
        })
      );
      prismaMock.submission.findUnique.mockResolvedValue(null);
      prismaMock.submission.create.mockResolvedValue({
        id: "sub_late",
        status: "LATE",
        submitted_at: new Date()
      });

      const result = await service.submit("asg_1", { content: "telat" }, studentCtx, "key-late");
      expect(result.isLate).toBe(true);
      expect(result.status).toBe("LATE");
      expect(prismaMock.submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "LATE" })
        })
      );
    });

    it("submit setelah due_at dengan allow_late=false → ditolak 409", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue(
        makeAssignment({ due_at: new Date(Date.now() - 3_600_000), allow_late: false })
      );
      prismaMock.submission.findUnique.mockResolvedValue(null);

      await expect(
        service.submit("asg_1", { content: "telat" }, studentCtx, "key-late2")
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.submission.create).not.toHaveBeenCalled();
    });
  });

  describe("batalkan-ganti sebelum deadline", () => {
    it("submit ulang dengan key berbeda sebelum deadline → replace (update), bukan create", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue(makeAssignment());
      prismaMock.submission.findUnique.mockResolvedValue({
        id: "sub_1",
        status: "SUBMITTED",
        submitted_at: new Date(Date.now() - 3_600_000), // sudah submit sebelum deadline
        graded_by: null,
        graded_at: null
      });
      prismaMock.submission.update.mockResolvedValue({
        id: "sub_1",
        status: "SUBMITTED",
        submitted_at: new Date()
      });

      const result = await service.submit("asg_1", { content: "v2" }, studentCtx, "key-2");

      expect(result.replaced).toBe(true);
      expect(prismaMock.submission.update).toHaveBeenCalled();
      expect(prismaMock.submission.create).not.toHaveBeenCalled();
    });

    it("tidak bisa mengganti submission yang sudah dinilai → 409", async () => {
      prismaMock.assignment.findUnique.mockResolvedValue(makeAssignment());
      prismaMock.submission.findUnique.mockResolvedValue({
        id: "sub_1",
        status: "GRADED",
        submitted_at: new Date(Date.now() - 3_600_000),
        graded_by: "t_1",
        graded_at: new Date()
      });

      await expect(service.submit("asg_1", { content: "v2" }, studentCtx, "key-3")).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe("penilaian (F2-T8)", () => {
    it("grade menulis Submission GRADED + Grade TUGAS + AuditLog", async () => {
      prismaMock.submission.findUnique.mockResolvedValue({
        id: "sub_1",
        student_id: "s_1",
        status: "SUBMITTED",
        assignment: {
          id: "asg_1",
          class_subject_id: "cs_1",
          title: "Tugas 1",
          max_score: 100,
          class_subject: {
            id: "cs_1",
            semester: "GANJIL",
            teacher_id: "t_1",
            class: { academic_year: { code: "2026/2027" } }
          }
        }
      });
      prismaMock.submission.update.mockResolvedValue({
        id: "sub_1",
        status: "GRADED",
        score: 85,
        feedback: "Bagus"
      });
      prismaMock.grade.upsert.mockResolvedValue({ id: "g_1" });

      const result = await service.grade("sub_1", { score: 85, feedback: "Bagus" }, teacherCtx);

      expect(result.status).toBe("GRADED");
      expect(prismaMock.grade.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            type: "TUGAS",
            source_id: "sub_1",
            score: 85,
            semester: "GANJIL",
            academic_year: "2026/2027"
          })
        })
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "UPDATE",
            entity: "submission",
            entity_id: "sub_1"
          })
        })
      );
    });

    it("skor melebihi max_score ditolak 400", async () => {
      prismaMock.submission.findUnique.mockResolvedValue({
        id: "sub_1",
        student_id: "s_1",
        assignment: {
          max_score: 100,
          class_subject_id: "cs_1",
          class_subject: {
            id: "cs_1",
            semester: "GANJIL",
            teacher_id: "t_1",
            class: { academic_year: { code: "2026/2027" } }
          }
        }
      });

      await expect(service.grade("sub_1", { score: 101 }, teacherCtx)).rejects.toThrow(
        BadRequestException
      );
      expect(prismaMock.submission.update).not.toHaveBeenCalled();
    });
  });
});
