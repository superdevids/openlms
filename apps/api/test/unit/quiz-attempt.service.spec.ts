/**
 * Unit test — QuizAttemptService: anti-IDOR (student_id diikat actor untuk
 * SISWA; operasi mutasi/baca wajib kepemilikan attempt untuk scope SENDIRI).
 */
import { ForbiddenException } from "@nestjs/common";
import { AttemptStatus } from "@prisma/client";

jest.mock("@openlms/database", () => ({
  prisma: {
    quiz: { findUnique: jest.fn() },
    quizAttempt: { findUnique: jest.fn(), findMany: jest.fn() },
    grade: { upsert: jest.fn() },
    $transaction: jest.fn()
  }
}));

import { prisma } from "@openlms/database";
import { QuizAttemptService } from "../../src/modules/quiz/quiz-attempt.service";

const db = prisma as unknown as {
  quiz: { findUnique: jest.Mock };
  quizAttempt: { findUnique: jest.Mock; findMany: jest.Mock };
  $transaction: jest.Mock;
};

function txMock(overrides: Record<string, unknown> = {}) {
  return {
    quiz: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    quizAttempt: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    grade: { upsert: jest.fn() },
    ...overrides
  };
}

const BASE_QUIZ = {
  id: "q1",
  status: "PUBLISHED",
  open_at: null,
  close_at: null,
  duration_min: 60,
  shuffle_questions: false,
  questions: []
};

describe("QuizAttemptService — anti-IDOR", () => {
  let service: QuizAttemptService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuizAttemptService();
  });

  it("start(): SISWA selalu diikat ke actor.userId — student_id client DIIGNOR", async () => {
    db.quiz.findUnique.mockResolvedValue(BASE_QUIZ);
    const tx = txMock({
      quizAttempt: {
        create: jest.fn().mockResolvedValue({
          id: "att-1",
          status: AttemptStatus.IN_PROGRESS,
          started_at: new Date(),
          score: null
        })
      }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await service.start(
      "q1",
      { student_id: "student-lain" },
      { userId: "siswa-1", roles: ["SISWA"] }
    );

    const createCall = tx.quizAttempt.create as jest.Mock;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ student_id: "siswa-1" })
      })
    );
  });

  it("start(): staff (GURU, quiz:attempt:school) boleh memakai dto.student_id", async () => {
    db.quiz.findUnique.mockResolvedValue(BASE_QUIZ);
    const tx = txMock({
      quizAttempt: {
        create: jest.fn().mockResolvedValue({
          id: "att-2",
          status: AttemptStatus.IN_PROGRESS,
          started_at: new Date(),
          score: null
        })
      }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await service.start(
      "q1",
      { student_id: "siswa-target" },
      { userId: "guru-1", roles: ["GURU"] }
    );

    const createCall = tx.quizAttempt.create as jest.Mock;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ student_id: "siswa-target" })
      })
    );
  });

  it("start(): staf tanpa student_id -> BadRequestException", async () => {
    db.quiz.findUnique.mockResolvedValue(BASE_QUIZ);

    await expect(service.start("q1", {}, { userId: "guru-1", roles: ["GURU"] })).rejects.toThrow(
      "student_id wajib"
    );
  });

  it("saveAnswer(): SISWA mencoba attempt milik siswa lain -> ForbiddenException", async () => {
    const tx = txMock({
      quizAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          id: "att-lain",
          student_id: "siswa-lain",
          status: AttemptStatus.IN_PROGRESS,
          started_at: new Date(),
          answers: {},
          quiz: { questions: [], class_subject: null }
        })
      }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await expect(
      service.saveAnswer(
        "att-lain",
        { question_id: "qq1", answer: "A" },
        { userId: "siswa-1", roles: ["SISWA"] }
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("submit(): SISWA mencoba submit attempt milik siswa lain -> ForbiddenException", async () => {
    const tx = txMock({
      quizAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          id: "att-lain",
          student_id: "siswa-lain",
          status: AttemptStatus.IN_PROGRESS,
          started_at: new Date(),
          answers: {},
          quiz: { questions: [], class_subject: null }
        })
      }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await expect(
      service.submit("att-lain", {}, { userId: "siswa-1", roles: ["SISWA"] })
    ).rejects.toThrow(ForbiddenException);
  });

  it("getAttempt(): SISWA membaca attempt milik siswa lain -> ForbiddenException", async () => {
    db.quizAttempt.findUnique.mockResolvedValue({
      id: "att-lain",
      student_id: "siswa-lain",
      status: AttemptStatus.IN_PROGRESS,
      started_at: new Date(),
      score: null,
      quiz: { duration_min: 60, shuffle_questions: false, questions: [] }
    });

    await expect(
      service.getAttempt("att-lain", { userId: "siswa-1", roles: ["SISWA"] })
    ).rejects.toThrow(ForbiddenException);
  });

  it("staff (GURU) boleh operasikan attempt siswa lain (ownership dilewati)", async () => {
    const tx = txMock({
      quizAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          id: "att-lain",
          student_id: "siswa-lain",
          status: AttemptStatus.IN_PROGRESS,
          started_at: new Date(),
          answers: {},
          quiz: { questions: [], class_subject: null, duration_min: 600 }
        }),
        update: jest.fn().mockResolvedValue({ id: "att-lain" })
      }
    });
    db.$transaction.mockImplementation((cb: (t: unknown) => Promise<unknown>) => cb(tx));

    await expect(
      service.saveAnswer(
        "att-lain",
        { question_id: "qq1", answer: "A" },
        { userId: "guru-1", roles: ["GURU"] }
      )
    ).resolves.toBeDefined();
  });
});
