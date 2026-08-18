import { ForbiddenException } from "@nestjs/common";
import { AssessmentStatus, AttemptStatus, GradeType, QuestionType } from "@prisma/client";
import { QuizAttemptService } from "../quiz-attempt.service";
import { prisma } from "@opensis/database";

jest.mock("@opensis/database", () => ({
  prisma: {
    $transaction: jest.fn(),
    quiz: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    quizAttempt: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    enrollment: { findFirst: jest.fn() },
    grade: { upsert: jest.fn() }
  }
}));

describe("QuizAttemptService", () => {
  let service: QuizAttemptService;

  const mockAttemptFindUnique = prisma.quizAttempt.findUnique as jest.Mock;
  const mockAttemptUpdate = prisma.quizAttempt.update as jest.Mock;
  const mockGradeUpsert = prisma.grade.upsert as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)
    );
    service = new QuizAttemptService();
  });

  describe("submit", () => {
    const attemptFixture = () => ({
      id: "att1",
      quiz_id: "q1",
      student_id: "s1",
      started_at: new Date(),
      submitted_at: null,
      status: AttemptStatus.IN_PROGRESS,
      score: null,
      answers: { q1: { answer: "B" }, q2: { answer: " jakarta " } },
      quiz: {
        id: "q1",
        class_subject_id: "cs1",
        duration_min: 30,
        status: AssessmentStatus.PUBLISHED,
        class_subject: { semester: "GANJIL" },
        questions: [
          { id: "q1", type: QuestionType.PILIHAN_GANDA, correct_answer: "B" },
          { id: "q2", type: QuestionType.ISIAN_SINGKAT, correct_answer: "Jakarta" }
        ]
      }
    });

    it("auto-grade PG/isian, status SUBMITTED, tulis Grade KUIS", async () => {
      mockAttemptFindUnique.mockResolvedValue(attemptFixture());
      // GURU mengajar kelas siswa "s1" → lolos cek keanggotaan.
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "e1" });
      mockAttemptUpdate.mockResolvedValue({
        id: "att1",
        status: AttemptStatus.SUBMITTED,
        score: 100
      });
      mockGradeUpsert.mockResolvedValue({ id: "g1" });

      const result = await service.submit(
        "att1",
        {},
        { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] }
      );
      expect(result.score).toBe(100);
      expect(result.status).toBe(AttemptStatus.SUBMITTED);

      const updateArg = mockAttemptUpdate.mock.calls[0]?.[0] as {
        data: { status: AttemptStatus; score: number };
      };
      expect(updateArg.data.status).toBe(AttemptStatus.SUBMITTED);
      expect(updateArg.data.score).toBe(100);

      const gradeArg = mockGradeUpsert.mock.calls[0]?.[0] as {
        create: { type: GradeType; source_id: string; score: number };
      };
      expect(gradeArg.create.type).toBe(GradeType.KUIS);
      expect(gradeArg.create.source_id).toBe("att1");
      expect(gradeArg.create.score).toBe(100);
    });

    it("GURU tanpa keanggotaan kelas siswa → 403 (anti-IDOR lintas kelas)", async () => {
      mockAttemptFindUnique.mockResolvedValue(attemptFixture());
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.submit("att1", {}, { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] })
      ).rejects.toThrow("di luar kelas yang diampu");
      expect(mockAttemptUpdate).not.toHaveBeenCalled();
    });
  });

  describe("autoSubmitExpired", () => {
    it("attempt yang melewati durasi di-auto-submit (AUTO_SUBMITTED)", async () => {
      const startedAt = new Date(Date.now() - 31 * 60000); // 31 menit lalu, durasi 30
      (prisma.quizAttempt.findMany as jest.Mock).mockResolvedValue([
        {
          id: "att1",
          quiz_id: "q1",
          student_id: "s1",
          started_at: startedAt,
          submitted_at: null,
          status: AttemptStatus.IN_PROGRESS,
          score: null,
          answers: { q1: { answer: "B" } },
          quiz: {
            id: "q1",
            class_subject_id: "cs1",
            duration_min: 30,
            status: AssessmentStatus.ONGOING,
            class_subject: { semester: "GANJIL" },
            questions: [{ id: "q1", type: QuestionType.PILIHAN_GANDA, correct_answer: "B" }]
          }
        }
      ]);
      mockAttemptUpdate.mockResolvedValue({
        id: "att1",
        status: AttemptStatus.AUTO_SUBMITTED,
        score: 100
      });
      mockGradeUpsert.mockResolvedValue({ id: "g1" });

      const result = await service.autoSubmitExpired();
      expect(result.submitted).toBe(1);

      const updateArg = mockAttemptUpdate.mock.calls[0]?.[0] as {
        data: { status: AttemptStatus };
      };
      expect(updateArg.data.status).toBe(AttemptStatus.AUTO_SUBMITTED);
    });
  });

  describe("start", () => {
    it("menolak start sebelum jadwal buka (open_at)", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue({
        id: "q1",
        status: AssessmentStatus.PUBLISHED,
        open_at: new Date(Date.now() + 3600000),
        close_at: null
      });
      await expect(
        service.start("q1", { student_id: "s1" }, { userId: "s1", roles: ["SISWA"] })
      ).rejects.toThrow("belum dibuka");
    });

    it("start sukses: status ONGOING + attempt IN_PROGRESS + sisa waktu > 0", async () => {
      (prisma.quiz.findUnique as jest.Mock).mockResolvedValue({
        id: "q1",
        class_subject_id: "cs1",
        status: AssessmentStatus.PUBLISHED,
        open_at: null,
        close_at: null,
        duration_min: 10,
        shuffle_questions: false,
        questions: [
          {
            id: "q1",
            type: QuestionType.PILIHAN_GANDA,
            text: "Soal?",
            options: ["A", "B"],
            correct_answer: "B",
            explanation: null,
            difficulty: "MUDAH",
            tags: []
          }
        ]
      });
      (prisma.quizAttempt.create as jest.Mock).mockResolvedValue({
        id: "att1",
        quiz_id: "q1",
        student_id: "s1",
        started_at: new Date(),
        status: AttemptStatus.IN_PROGRESS,
        score: null
      });

      const result = await service.start(
        "q1",
        { student_id: "s1" },
        { userId: "s1", roles: ["SISWA"] }
      );
      expect(prisma.quiz.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: AssessmentStatus.ONGOING } })
      );
      expect(result.attempt.id).toBe("att1");
      expect(result.attempt.remaining_seconds).toBeGreaterThan(0);
      // correct_answer disembunyikan saat IN_PROGRESS
      expect(result.questions[0]).not.toHaveProperty("correct_answer");
    });
  });
});

describe("QuizAttemptService — anti-IDOR (SEC-001)", () => {
  let service: QuizAttemptService;

  const db = prisma as unknown as {
    quiz: { findUnique: jest.Mock };
    quizAttempt: { findUnique: jest.Mock; findMany: jest.Mock };
    enrollment: { findFirst: jest.Mock };
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

  it("start(): staff (GURU) yang mengajar kelas siswa boleh memakai dto.student_id", async () => {
    db.quiz.findUnique.mockResolvedValue(BASE_QUIZ);
    // GURU mengajar kelas target → Enrollment ACTIVE ketemu (hardening kelas).
    db.enrollment.findFirst.mockResolvedValue({ id: "e1" });
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
      { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] }
    );

    const createCall = tx.quizAttempt.create as jest.Mock;
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ student_id: "siswa-target" })
      })
    );
  });

  it("start(): GURU tanpa keanggotaan kelas siswa -> ForbiddenException", async () => {
    db.quiz.findUnique.mockResolvedValue(BASE_QUIZ);
    db.enrollment.findFirst.mockResolvedValue(null);

    await expect(
      service.start("q1", { student_id: "siswa-target" }, { userId: "guru-1", roles: ["GURU"] })
    ).rejects.toThrow(ForbiddenException);
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

  it("GURU yang mengajar kelas siswa boleh operasikan attempt siswa lain", async () => {
    db.enrollment.findFirst.mockResolvedValue({ id: "e1" });
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
        { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] }
      )
    ).resolves.toBeDefined();
  });

  it("GURU tanpa keanggotaan kelas siswa -> ForbiddenException (anti-IDOR lintas kelas)", async () => {
    db.enrollment.findFirst.mockResolvedValue(null);
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
        { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] }
      )
    ).rejects.toThrow(ForbiddenException);
  });
});
