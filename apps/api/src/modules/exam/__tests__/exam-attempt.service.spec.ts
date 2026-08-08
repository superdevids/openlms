import { AssessmentStatus, AttemptStatus, GradeType, QuestionType } from "@prisma/client";
import { ExamAttemptService } from "../exam-attempt.service";
import { hashToken } from "../exam.util";
import { prisma } from "@openlms/database";
import { EXAM_FORCE_SUBMIT_EVENT, EXAM_TICK_EVENT } from "../../notifications/notification-events";
import type { RealtimeGateway } from "../../realtime/realtime.gateway";

jest.mock("@openlms/database", () => ({
  prisma: {
    $transaction: jest.fn(),
    exam: { updateMany: jest.fn() },
    examSession: { findUnique: jest.fn() },
    examPackage: { findMany: jest.fn(), findUnique: jest.fn() },
    examAttempt: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    question: { findMany: jest.fn(), findUnique: jest.fn() },
    examAnswerLog: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    enrollment: { findFirst: jest.fn() },
    classSubject: { findFirst: jest.fn() },
    grade: { upsert: jest.fn() }
  }
}));

describe("ExamAttemptService", () => {
  let service: ExamAttemptService;

  const mockAttemptFindUnique = prisma.examAttempt.findUnique as jest.Mock;
  const mockAttemptUpdate = prisma.examAttempt.update as jest.Mock;
  const mockLogCreate = prisma.examAnswerLog.create as jest.Mock;
  const mockGradeUpsert = prisma.grade.upsert as jest.Mock;
  const mockEmitToExam = jest.fn();
  const mockRealtime = { emitToExam: mockEmitToExam } as unknown as RealtimeGateway;

  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)
    );
    service = new ExamAttemptService(mockRealtime);
  });

  describe("saveAnswers (autosave batch idempotent M-EXAM-T5 / G-01)", () => {
    const inProgressAttempt = {
      id: "att1",
      exam_session_id: "sess1",
      exam_package_id: "pkg1",
      started_at: new Date(),
      status: AttemptStatus.IN_PROGRESS,
      exam_session: { exam: { duration_min: 60 } }
    };

    it("Idempotency-Key sama tidak membuat log duplikat (per soal)", async () => {
      mockAttemptFindUnique.mockResolvedValue(inProgressAttempt);
      (prisma.question.findMany as jest.Mock).mockResolvedValue([{ id: "q1" }]);
      (prisma.examAnswerLog.findMany as jest.Mock).mockResolvedValue([
        { idempotency_key: "key-1:q1" }
      ]);

      const result = await service.saveAnswers(
        "att1",
        { answers: [{ question_id: "q1", answer: "B" }] },
        { userId: "guru-1", roles: ["GURU"] },
        "key-1",
        "127.0.0.1"
      );
      expect(result.duplicated).toBe(1);
      expect(result.saved).toBe(0);
      expect(mockLogCreate).not.toHaveBeenCalled();
    });

    it("batch baru menyimpan log append-only dengan key per soal", async () => {
      mockAttemptFindUnique.mockResolvedValue(inProgressAttempt);
      (prisma.question.findMany as jest.Mock).mockResolvedValue([{ id: "q1" }, { id: "q2" }]);
      (prisma.examAnswerLog.findMany as jest.Mock).mockResolvedValue([]);
      mockLogCreate.mockResolvedValue({ id: "log2", answer: "B" });

      const result = await service.saveAnswers(
        "att1",
        {
          answers: [
            { question_id: "q1", answer: "B", saved_at_client: "2026-08-07T00:00:00.000Z" },
            { question_id: "q2", answer: "Jakarta" }
          ]
        },
        { userId: "guru-1", roles: ["GURU"] },
        "key-2",
        "127.0.0.1"
      );
      expect(result.duplicated).toBe(0);
      expect(result.saved).toBe(2);
      const createArg = mockLogCreate.mock.calls[0]?.[0] as {
        data: { attempt_id: string; question_id: string; idempotency_key: string; saved_at: Date };
      };
      expect(createArg.data.attempt_id).toBe("att1");
      expect(createArg.data.question_id).toBe("q1");
      expect(createArg.data.idempotency_key).toBe("key-2:q1");
      expect(createArg.data.saved_at).toBeInstanceOf(Date);
      const createArg2 = mockLogCreate.mock.calls[1]?.[0] as {
        data: { question_id: string; idempotency_key: string };
      };
      expect(createArg2.data.question_id).toBe("q2");
      expect(createArg2.data.idempotency_key).toBe("key-2:q2");
    });

    it("menolak soal yang bukan milik paket attempt", async () => {
      mockAttemptFindUnique.mockResolvedValue(inProgressAttempt);
      (prisma.question.findMany as jest.Mock).mockResolvedValue([{ id: "q1" }]);

      await expect(
        service.saveAnswers(
          "att1",
          { answers: [{ question_id: "qLain", answer: "X" }] },
          { userId: "guru-1", roles: ["GURU"] },
          "key-3",
          "127.0.0.1"
        )
      ).rejects.toThrow("tidak termasuk paket attempt ini");
      expect(mockLogCreate).not.toHaveBeenCalled();
    });
  });

  describe("submit (auto-grade M-EXAM-T7)", () => {
    it("menghitung score_auto dan menulis Grade sumatif", async () => {
      const startedAt = new Date();
      mockAttemptFindUnique.mockResolvedValue({
        id: "att1",
        exam_session_id: "sess1",
        student_id: "s1",
        exam_package_id: "pkg1",
        token_used: "hash",
        started_at: startedAt,
        submitted_at: null,
        status: AttemptStatus.IN_PROGRESS,
        score_auto: null,
        score_manual: null,
        device_info: null,
        ip_address: null
      });
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue({
        id: "sess1",
        exam: { id: "e1", subject_id: "sub1", duration_min: 60 }
      });
      (prisma.examPackage.findUnique as jest.Mock).mockResolvedValue({
        id: "pkg1",
        total_score: 100,
        questions: [{ id: "q1", type: QuestionType.PILIHAN_GANDA, correct_answer: "B" }]
      });
      (prisma.examAnswerLog.findMany as jest.Mock).mockResolvedValue([
        { question_id: "q1", answer: "B", saved_at: new Date(1000) }
      ]);
      mockAttemptUpdate.mockResolvedValue({
        id: "att1",
        status: AttemptStatus.SUBMITTED,
        score_auto: 100
      });
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ class_id: "c1" });
      (prisma.classSubject.findFirst as jest.Mock).mockResolvedValue({ id: "cs1" });
      mockGradeUpsert.mockResolvedValue({ id: "g1" });

      const result = await service.submit("att1", { userId: "guru-1", roles: ["GURU"] });
      expect(result.score_auto).toBe(100);
      expect(result.status).toBe(AttemptStatus.SUBMITTED);

      const updateArg = mockAttemptUpdate.mock.calls[0]?.[0] as {
        data: { status: AttemptStatus; score_auto: number };
      };
      expect(updateArg.data.status).toBe(AttemptStatus.SUBMITTED);
      expect(updateArg.data.score_auto).toBe(100);

      const gradeArg = mockGradeUpsert.mock.calls[0]?.[0] as {
        create: { type: GradeType; source_id: string };
      };
      expect(gradeArg.create.type).toBe(GradeType.SUMATIF);
      expect(gradeArg.create.source_id).toBe("att1");
    });
  });

  describe("autoSubmitExpired (M-EXAM-T6)", () => {
    it("attempt yang melewati durasi di-set AUTO_SUBMITTED", async () => {
      const startedAt = new Date(Date.now() - 61 * 60000); // 61 menit lalu, durasi 60
      (prisma.examAttempt.findMany as jest.Mock).mockResolvedValue([
        {
          id: "att1",
          exam_session_id: "sess1",
          student_id: "s1",
          exam_package_id: "pkg1",
          token_used: "hash",
          started_at: startedAt,
          submitted_at: null,
          status: AttemptStatus.IN_PROGRESS,
          score_auto: null,
          score_manual: null,
          device_info: null,
          ip_address: null,
          exam_session: { exam: { id: "e1", subject_id: "sub1", duration_min: 60 } }
        }
      ]);
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue({
        id: "sess1",
        exam: { id: "e1", subject_id: "sub1", duration_min: 60 }
      });
      (prisma.examPackage.findUnique as jest.Mock).mockResolvedValue({
        id: "pkg1",
        total_score: 100,
        questions: []
      });
      (prisma.examAnswerLog.findMany as jest.Mock).mockResolvedValue([]);
      mockAttemptUpdate.mockResolvedValue({
        id: "att1",
        status: AttemptStatus.AUTO_SUBMITTED,
        score_auto: 0
      });
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ class_id: "c1" });
      (prisma.classSubject.findFirst as jest.Mock).mockResolvedValue({ id: "cs1" });
      mockGradeUpsert.mockResolvedValue({ id: "g1" });

      const result = await service.autoSubmitExpired();
      expect(result.submitted).toBe(1);

      const updateArg = mockAttemptUpdate.mock.calls[0]?.[0] as {
        data: { status: AttemptStatus };
      };
      expect(updateArg.data.status).toBe(AttemptStatus.AUTO_SUBMITTED);
    });

    it("push exam:force-submit ke room sesi untuk tiap attempt expired (R-29)", async () => {
      const startedAt = new Date(Date.now() - 61 * 60000);
      (prisma.examAttempt.findMany as jest.Mock).mockResolvedValue([
        {
          id: "att1",
          exam_session_id: "sess1",
          student_id: "s1",
          exam_package_id: "pkg1",
          token_used: "hash",
          started_at: startedAt,
          submitted_at: null,
          status: AttemptStatus.IN_PROGRESS,
          score_auto: null,
          score_manual: null,
          device_info: null,
          ip_address: null,
          exam_session: { exam: { id: "e1", subject_id: "sub1", duration_min: 60 } }
        }
      ]);
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue({
        id: "sess1",
        exam: { id: "e1", subject_id: "sub1", duration_min: 60 }
      });
      (prisma.examPackage.findUnique as jest.Mock).mockResolvedValue({
        id: "pkg1",
        total_score: 100,
        questions: []
      });
      (prisma.examAnswerLog.findMany as jest.Mock).mockResolvedValue([]);
      mockAttemptUpdate.mockResolvedValue({
        id: "att1",
        status: AttemptStatus.AUTO_SUBMITTED,
        score_auto: 0
      });
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ class_id: "c1" });
      (prisma.classSubject.findFirst as jest.Mock).mockResolvedValue({ id: "cs1" });
      mockGradeUpsert.mockResolvedValue({ id: "g1" });

      await service.autoSubmitExpired();
      expect(mockEmitToExam).toHaveBeenCalledWith("sess1", EXAM_FORCE_SUBMIT_EVENT, {
        attemptId: "att1"
      });
    });
  });

  describe("tickActiveExams (R-29)", () => {
    function attemptWithRemaining(remainingSeconds: number) {
      return {
        id: "att1",
        exam_session_id: "sess1",
        student_id: "s1",
        exam_package_id: "pkg1",
        token_used: "hash",
        started_at: new Date(Date.now() - (3600 - remainingSeconds) * 1000),
        submitted_at: null,
        status: AttemptStatus.IN_PROGRESS,
        score_auto: null,
        score_manual: null,
        device_info: null,
        ip_address: null,
        exam_session: { exam: { id: "e1", subject_id: "sub1", duration_min: 60 } }
      };
    }

    it("emit exam:tick hanya saat menembus ambang 60/30/10/0", async () => {
      (prisma.examAttempt.findMany as jest.Mock).mockResolvedValue([attemptWithRemaining(45)]);
      const first = await service.tickActiveExams();
      expect(first.ticked).toBe(1);
      expect(mockEmitToExam).toHaveBeenCalledWith(
        "sess1",
        EXAM_TICK_EVENT,
        expect.objectContaining({ attemptId: "att1", remainingSeconds: expect.any(Number) })
      );

      // Ambang sama (<= 60) tidak dikirim ulang — ticked 0.
      mockEmitToExam.mockClear();
      (prisma.examAttempt.findMany as jest.Mock).mockResolvedValue([attemptWithRemaining(40)]);
      const second = await service.tickActiveExams();
      expect(second.ticked).toBe(0);
      expect(mockEmitToExam).not.toHaveBeenCalled();
    });

    it("tidak emit saat sisa waktu > 60 detik", async () => {
      (prisma.examAttempt.findMany as jest.Mock).mockResolvedValue([attemptWithRemaining(300)]);
      const result = await service.tickActiveExams();
      expect(result.ticked).toBe(0);
      expect(mockEmitToExam).not.toHaveBeenCalled();
    });
  });

  describe("start (M-EXAM-T4)", () => {
    const validPlain = "ABC234"; // format valid, tanpa karakter ambigu

    function mockSession(overrides: Record<string, unknown> = {}) {
      return {
        id: "sess1",
        starts_at: new Date(Date.now() - 1000),
        ends_at: new Date(Date.now() + 3600000),
        access_token: hashToken(validPlain),
        token_expires_at: null,
        exam: { id: "e1", status: AssessmentStatus.PUBLISHED, duration_min: 60 },
        ...overrides
      };
    }

    it("menolak token yang sudah dipakai (sekali pakai)", async () => {
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue(mockSession());
      (prisma.examAttempt.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // cek existing attempt (satu akun satu sesi)
        .mockResolvedValueOnce({ id: "attOld", token_used: hashToken(validPlain) }); // token sudah dipakai

      await expect(
        service.start(
          "sess1",
          { student_id: "s2", access_token: validPlain },
          { userId: "guru-1", roles: ["GURU"] },
          "10.0.0.2"
        )
      ).rejects.toThrow("sudah dipakai");
      expect(prisma.examAttempt.create).not.toHaveBeenCalled();
    });

    it("menolak login ganda (satu akun satu sesi)", async () => {
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue(mockSession());
      (prisma.examAttempt.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "attOld",
        student_id: "s1",
        status: AttemptStatus.IN_PROGRESS
      });

      await expect(
        service.start(
          "sess1",
          { student_id: "s1", access_token: validPlain },
          { userId: "guru-1", roles: ["GURU"] },
          "10.0.0.1"
        )
      ).rejects.toThrow("satu attempt per sesi");
    });

    it("menolak token yang salah / bukan hash yang tersimpan", async () => {
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue(mockSession());

      await expect(
        service.start(
          "sess1",
          { student_id: "s1", access_token: "XYZ789" },
          { userId: "guru-1", roles: ["GURU"] },
          "10.0.0.1"
        )
      ).rejects.toThrow("Token sesi tidak valid");
    });
  });
});
