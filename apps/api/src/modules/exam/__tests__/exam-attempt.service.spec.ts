import { ForbiddenException } from "@nestjs/common";
import { AssessmentStatus, AttemptStatus, GradeType, QuestionType } from "@prisma/client";
import { ExamAttemptService } from "../exam-attempt.service";
import { hashToken } from "../exam.util";
import { prisma } from "@opensis/database";
import { EXAM_FORCE_SUBMIT_EVENT, EXAM_TICK_EVENT } from "../../notifications/notification-events";
import type { RealtimeGateway } from "../../realtime/realtime.gateway";

jest.mock("@opensis/database", () => ({
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
    examAnswerLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn()
    },
    enrollment: { findFirst: jest.fn() },
    classSubject: { findFirst: jest.fn() },
    grade: { upsert: jest.fn() }
  }
}));

describe("ExamAttemptService", () => {
  let service: ExamAttemptService;

  const mockAttemptFindUnique = prisma.examAttempt.findUnique as jest.Mock;
  const mockAttemptUpdate = prisma.examAttempt.update as jest.Mock;
  const mockLogCreateMany = prisma.examAnswerLog.createMany as jest.Mock;
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
      student_id: "s1",
      started_at: new Date(),
      status: AttemptStatus.IN_PROGRESS,
      exam_session: { exam: { duration_min: 60 } }
    };

    // GURU (scope KELAS) hanya bisa akses attempt siswa di kelasnya — mock
    // Enrollment ACTIVE agar "guru-1" dianggap mengajar kelas "s1".
    const mockGuruTeachesS1 = () =>
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "e1" });

    it("Idempotency-Key sama tidak membuat log duplikat (per soal)", async () => {
      mockAttemptFindUnique.mockResolvedValue(inProgressAttempt);
      mockGuruTeachesS1();
      (prisma.question.findMany as jest.Mock).mockResolvedValue([{ id: "q1" }]);
      (prisma.examAnswerLog.findMany as jest.Mock).mockResolvedValue([
        { idempotency_key: "key-1:q1" }
      ]);

      const result = await service.saveAnswers(
        "att1",
        { answers: [{ question_id: "q1", answer: "B" }] },
        { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] },
        "key-1",
        "127.0.0.1"
      );
      expect(result.duplicated).toBe(1);
      expect(result.saved).toBe(0);
      expect(mockLogCreateMany).not.toHaveBeenCalled();
    });

    it("batch baru menyimpan log append-only dengan key per soal (createMany)", async () => {
      mockAttemptFindUnique.mockResolvedValue(inProgressAttempt);
      mockGuruTeachesS1();
      (prisma.question.findMany as jest.Mock).mockResolvedValue([{ id: "q1" }, { id: "q2" }]);
      (prisma.examAnswerLog.findMany as jest.Mock).mockResolvedValue([]);
      mockLogCreateMany.mockResolvedValue({ count: 2 });

      const result = await service.saveAnswers(
        "att1",
        {
          answers: [
            { question_id: "q1", answer: "B", saved_at_client: "2026-08-07T00:00:00.000Z" },
            { question_id: "q2", answer: "Jakarta" }
          ]
        },
        { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] },
        "key-2",
        "127.0.0.1"
      );
      expect(result.duplicated).toBe(0);
      expect(result.saved).toBe(2); // dari createMany result.count
      expect(mockLogCreateMany).toHaveBeenCalledTimes(1);
      const createArg = mockLogCreateMany.mock.calls[0]?.[0] as {
        data: Array<{ attempt_id: string; question_id: string; idempotency_key: string }>;
        skipDuplicates: boolean;
      };
      expect(createArg.skipDuplicates).toBe(true);
      expect(createArg.data).toHaveLength(2);
      expect(createArg.data[0]).toMatchObject({
        attempt_id: "att1",
        question_id: "q1",
        idempotency_key: "key-2:q1",
        is_auto_saved: true
      });
      expect(createArg.data[1]).toMatchObject({
        question_id: "q2",
        idempotency_key: "key-2:q2"
      });
    });

    it("menolak soal yang bukan milik paket attempt", async () => {
      mockAttemptFindUnique.mockResolvedValue(inProgressAttempt);
      mockGuruTeachesS1();
      (prisma.question.findMany as jest.Mock).mockResolvedValue([{ id: "q1" }]);

      await expect(
        service.saveAnswers(
          "att1",
          { answers: [{ question_id: "qLain", answer: "X" }] },
          { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] },
          "key-3",
          "127.0.0.1"
        )
      ).rejects.toThrow("tidak termasuk paket attempt ini");
      expect(mockLogCreateMany).not.toHaveBeenCalled();
    });

    it("GURU tanpa keanggotaan kelas siswa → 403 (anti-IDOR lintas kelas)", async () => {
      mockAttemptFindUnique.mockResolvedValue(inProgressAttempt);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.saveAnswers(
          "att1",
          { answers: [{ question_id: "q1", answer: "B" }] },
          { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] },
          "key-4",
          "127.0.0.1"
        )
      ).rejects.toThrow("di luar kelas yang diampu");
      expect(mockLogCreateMany).not.toHaveBeenCalled();
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

      const result = await service.submit("att1", {
        userId: "guru-1",
        roles: ["GURU"],
        classIds: ["c1"]
      });
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
      // GURU harus mengajar kelas siswa "s2" agar lolos cek keanggotaan.
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "e1" });
      (prisma.examAttempt.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // cek existing attempt (satu akun satu sesi)
        .mockResolvedValueOnce({ id: "attOld", token_used: hashToken(validPlain) }); // token sudah dipakai

      await expect(
        service.start(
          "sess1",
          { student_id: "s2", access_token: validPlain },
          { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] },
          "10.0.0.2"
        )
      ).rejects.toThrow("sudah dipakai");
      expect(prisma.examAttempt.create).not.toHaveBeenCalled();
    });

    it("menolak login ganda (satu akun satu sesi)", async () => {
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue(mockSession());
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "e1" });
      (prisma.examAttempt.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "attOld",
        student_id: "s1",
        status: AttemptStatus.IN_PROGRESS
      });

      await expect(
        service.start(
          "sess1",
          { student_id: "s1", access_token: validPlain },
          { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] },
          "10.0.0.1"
        )
      ).rejects.toThrow("satu attempt per sesi");
    });

    it("unique violation saat create (P2002) → 409 Token sesi sudah dipakai (PERF-05)", async () => {
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue(mockSession());
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "e1" });
      // Kedua guard fast-fail lolos (null) — simulasi race: dua start() paralel
      // dengan token sama sama-sama lolos cek, insert pertama sukses, yang
      // kedua kena unique (exam_session_id, token_used) → P2002.
      (prisma.examAttempt.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.examPackage.findMany as jest.Mock).mockResolvedValue([
        { id: "pkg1", name: "Paket A", total_score: 100, shuffle_options: true }
      ]);
      (prisma.examAttempt.create as jest.Mock).mockRejectedValue({ code: "P2002" });

      await expect(
        service.start(
          "sess1",
          { student_id: "s2", access_token: validPlain },
          { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] },
          "10.0.0.4"
        )
      ).rejects.toThrow("Token sesi sudah dipakai");
    });

    it("GURU tidak mengajar kelas siswa → start ditolak (anti-IDOR lintas kelas)", async () => {
      (prisma.examSession.findUnique as jest.Mock).mockResolvedValue(mockSession());
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.start(
          "sess1",
          { student_id: "s2", access_token: validPlain },
          { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] },
          "10.0.0.3"
        )
      ).rejects.toThrow("di luar kelas yang diampu");
      expect(prisma.examAttempt.create).not.toHaveBeenCalled();
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

  describe("markExpired (M-EXAM-T6 proctor)", () => {
    it("GURU yang mengajar kelas siswa boleh menandai EXPIRED", async () => {
      (prisma.examAttempt.findUnique as jest.Mock).mockResolvedValue({
        id: "att1",
        student_id: "s1",
        status: AttemptStatus.IN_PROGRESS
      });
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "e1" });
      mockAttemptUpdate.mockResolvedValue({
        id: "att1",
        status: AttemptStatus.EXPIRED,
        submitted_at: new Date()
      });

      const result = await service.markExpired("att1", {
        userId: "guru-1",
        roles: ["GURU"],
        classIds: ["c1"]
      });
      expect(result.status).toBe(AttemptStatus.EXPIRED);
      const updateArg = mockAttemptUpdate.mock.calls[0]?.[0] as {
        data: { status: AttemptStatus };
      };
      expect(updateArg.data.status).toBe(AttemptStatus.EXPIRED);
    });

    it("GURU tanpa keanggotaan kelas → 403 (anti-IDOR lintas kelas)", async () => {
      (prisma.examAttempt.findUnique as jest.Mock).mockResolvedValue({
        id: "att1",
        student_id: "s1",
        status: AttemptStatus.IN_PROGRESS
      });
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markExpired("att1", { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] })
      ).rejects.toThrow("di luar kelas yang diampu");
      expect(mockAttemptUpdate).not.toHaveBeenCalled();
    });
  });

  describe("manualGrade (M-EXAM-T7)", () => {
    const submittedAttempt = {
      id: "att1",
      student_id: "s1",
      status: AttemptStatus.SUBMITTED,
      score_auto: 0,
      score_manual: null,
      device_info: null,
      exam_session: { id: "sess1", exam: { id: "e1", title: "UAS", subject_id: "sub1" } },
      exam_package: {
        id: "pkg1",
        total_score: 100,
        questions: [{ id: "q1", type: QuestionType.ESAI, correct_answer: null }]
      }
    };

    it("GURU yang mengajar kelas siswa boleh mengisi nilai esai", async () => {
      mockAttemptFindUnique.mockResolvedValue(submittedAttempt);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue({ id: "e1" });
      (prisma.examAnswerLog.findMany as jest.Mock).mockResolvedValue([]);
      mockAttemptUpdate.mockResolvedValue({
        id: "att1",
        status: AttemptStatus.SUBMITTED,
        score_manual: 80
      });
      (prisma.classSubject.findFirst as jest.Mock).mockResolvedValue({ id: "cs1" });
      mockGradeUpsert.mockResolvedValue({ id: "g1" });

      const result = await service.manualGrade(
        "att1",
        { score_manual: 80, graded_by: "guru-1" },
        { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] }
      );
      expect(result.score_manual).toBe(80);
    });

    it("GURU tanpa keanggotaan kelas → 403 (anti-IDOR lintas kelas)", async () => {
      mockAttemptFindUnique.mockResolvedValue(submittedAttempt);
      (prisma.enrollment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.manualGrade(
          "att1",
          { score_manual: 80, graded_by: "guru-1" },
          { userId: "guru-1", roles: ["GURU"], classIds: ["c1"] }
        )
      ).rejects.toThrow("di luar kelas yang diampu");
      expect(mockAttemptUpdate).not.toHaveBeenCalled();
    });
  });
});

describe("ExamAttemptService — anti-IDOR (SEC-001)", () => {
  let service: ExamAttemptService;

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
          .mockResolvedValue([
            { id: "p1", name: "Paket A", total_score: 100, shuffle_options: true }
          ])
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
