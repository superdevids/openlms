/**
 * Unit test — ExamAttemptService: anti-IDOR (student_id diikat actor untuk
 * SISWA; operasi mutasi/baca wajib kepemilikan attempt untuk scope SENDIRI).
 */
import { ForbiddenException } from "@nestjs/common";
import { AssessmentStatus, AttemptStatus } from "@prisma/client";
import { hashToken } from "../../src/modules/exam/exam.util";

jest.mock("@opensis/database", () => ({
  prisma: {
    examSession: { findUnique: jest.fn() },
    examAttempt: { findUnique: jest.fn(), findFirst: jest.fn() },
    examAnswerLog: { findMany: jest.fn(), findFirst: jest.fn() },
    examPackage: { findMany: jest.fn() },
    question: { findMany: jest.fn() },
    exam: { updateMany: jest.fn() },
    enrollment: { findFirst: jest.fn() },
    grade: { upsert: jest.fn() },
    $transaction: jest.fn()
  }
}));

import { prisma } from "@opensis/database";
import { ExamAttemptService } from "../../src/modules/exam/exam-attempt.service";
import type { RealtimeGateway } from "../../src/modules/realtime/realtime.gateway";

const db = prisma as unknown as {
  examSession: { findUnique: jest.Mock };
  examAttempt: { findUnique: jest.Mock; findFirst: jest.Mock };
  examAnswerLog: { findMany: jest.Mock; findFirst: jest.Mock };
  $transaction: jest.Mock;
};

const mockRealtime = { emitToExam: jest.fn() } as unknown as RealtimeGateway;

const TOKEN = "ABC234";
const TOKEN_HASH = hashToken(TOKEN);

function sessionRow() {
  return {
    id: "s1",
    starts_at: new Date(Date.now() - 60_000),
    ends_at: new Date(Date.now() + 60 * 60_000),
    access_token: TOKEN_HASH,
    token_expires_at: new Date(Date.now() + 60 * 60_000),
    exam: { id: "e1", status: AssessmentStatus.PUBLISHED, duration_min: 60, title: "Ujian" }
  };
}

function txMock(overrides: Record<string, unknown> = {}) {
  return {
    examAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      findUnique: jest.fn()
    },
    exam: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    examPackage: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: "p1", name: "Paket A", total_score: 100, shuffle_options: true }])
    },
    question: { findMany: jest.fn().mockResolvedValue([]) },
    examAnswerLog: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    grade: { upsert: jest.fn() },
    ...overrides
  };
}

const baseAttempt = {
  id: "att-lain",
  student_id: "siswa-lain",
  status: AttemptStatus.IN_PROGRESS,
  started_at: new Date(),
  exam_session_id: "s1",
  exam_package_id: "p1",
  device_info: { activities: [] },
  exam_session: {
    name: "Sesi 1",
    exam_id: "e1",
    exam: { title: "Ujian", duration_min: 60 }
  },
  exam_package: { name: "Paket A", questions: [] }
};

describe("ExamAttemptService — anti-IDOR", () => {
  let service: ExamAttemptService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExamAttemptService(mockRealtime);
  });

  it("start(): SISWA selalu diikat ke actor.userId — student_id client DIIGNOR", async () => {
    db.examSession.findUnique.mockResolvedValue(sessionRow());
    const tx = txMock({
      examAttempt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "att-1",
          status: AttemptStatus.IN_PROGRESS,
          started_at: new Date()
        })
      }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await service.start(
      "s1",
      { student_id: "student-lain", access_token: TOKEN },
      { userId: "siswa-1", roles: ["SISWA"] }
    );

    const createCall = tx.examAttempt.create as jest.Mock;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ student_id: "siswa-1" })
      })
    );
  });

  it("start(): staff (GURU) yang mengajar kelas siswa boleh memakai dto.student_id", async () => {
    db.examSession.findUnique.mockResolvedValue(sessionRow());
    // GURU mengajar kelas target → Enrollment ACTIVE ketemu (hardening kelas).
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "e1" });
    const tx = txMock({
      examAttempt: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "att-2",
          status: AttemptStatus.IN_PROGRESS,
          started_at: new Date()
        })
      }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await service.start(
      "s1",
      { student_id: "siswa-target", access_token: TOKEN },
      { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] }
    );

    const createCall = tx.examAttempt.create as jest.Mock;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ student_id: "siswa-target" })
      })
    );
  });

  it("start(): GURU tanpa keanggotaan kelas siswa -> ForbiddenException", async () => {
    db.examSession.findUnique.mockResolvedValue(sessionRow());
    (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.start(
        "s1",
        { student_id: "siswa-target", access_token: TOKEN },
        { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] }
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("start(): staf tanpa student_id -> BadRequestException", async () => {
    db.examSession.findUnique.mockResolvedValue(sessionRow());

    await expect(
      service.start("s1", { access_token: TOKEN }, { userId: "guru-1", roles: ["GURU"] })
    ).rejects.toThrow("student_id wajib");
  });

  it("saveAnswers(): SISWA mencoba attempt milik siswa lain -> ForbiddenException", async () => {
    const tx = txMock({
      examAttempt: { findUnique: jest.fn().mockResolvedValue(baseAttempt) }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await expect(
      service.saveAnswers(
        "att-lain",
        { answers: [{ question_id: "qq1", answer: "A" }] },
        { userId: "siswa-1", roles: ["SISWA"] },
        "idem-1"
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("submit(): SISWA mencoba submit attempt milik siswa lain -> ForbiddenException", async () => {
    const tx = txMock({
      examAttempt: { findUnique: jest.fn().mockResolvedValue(baseAttempt) }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await expect(
      service.submit("att-lain", { userId: "siswa-1", roles: ["SISWA"] })
    ).rejects.toThrow(ForbiddenException);
  });

  it("getAttempt(): SISWA membaca attempt milik siswa lain -> ForbiddenException", async () => {
    db.examAttempt.findUnique.mockResolvedValue(baseAttempt);

    await expect(
      service.getAttempt("att-lain", { userId: "siswa-1", roles: ["SISWA"] })
    ).rejects.toThrow(ForbiddenException);
  });

  it("getLogs(): SISWA membaca log attempt milik siswa lain -> ForbiddenException", async () => {
    db.examAttempt.findUnique.mockResolvedValue(baseAttempt);

    await expect(
      service.getLogs("att-lain", { userId: "siswa-1", roles: ["SISWA"] })
    ).rejects.toThrow(ForbiddenException);
  });

  it("logActivity(): SISWA menulis log attempt milik siswa lain -> ForbiddenException", async () => {
    db.examAttempt.findUnique.mockResolvedValue(baseAttempt);

    await expect(
      service.logActivity(
        "att-lain",
        { event: "TAB_SWITCH", payload: {} },
        { userId: "siswa-1", roles: ["SISWA"] }
      )
    ).rejects.toThrow(ForbiddenException);
  });
});
