import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { CompetencyTestService, type GradeRubricItemInput } from "./competency-test.service";
import type { DatabaseClient } from "../database/database.constants";

jest.mock("@opensis/database", () => ({
  prisma: {
    auditLog: { create: jest.fn() }
  }
}));

/** DatabaseClient mock — $transaction meneruskan callback dengan db yang sama. */
function makeDbMock() {
  const db = {
    competencyTest: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    competencyRubricItem: { update: jest.fn() },
    $transaction: jest.fn()
  };
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
  return db as unknown as {
    competencyTest: { findUnique: jest.Mock; update: jest.Mock };
    competencyRubricItem: { update: jest.Mock };
    $transaction: jest.Mock;
  };
}

const ACTOR = { userId: "exam_1", roles: ["PENGUJI_EKSTERNAL"] };

function makeTest(overrides: Record<string, unknown> = {}) {
  return {
    id: "test_1",
    title: "UKK Akuntansi",
    competency_standard: "AKL",
    student_id: "stu_1",
    examiner_id: "exam_1",
    scheduled_at: null,
    status: "SCHEDULED",
    final_score: null,
    certificate_url: null,
    created_at: new Date(),
    updated_at: new Date(),
    rubric_items: [
      { id: "rub_1", competency_test_id: "test_1", criterion: "Persiapan", max_score: 100, score: null, comment: null, created_at: new Date(), updated_at: new Date() },
      { id: "rub_2", competency_test_id: "test_1", criterion: "Proses", max_score: 100, score: null, comment: null, created_at: new Date(), updated_at: new Date() },
      { id: "rub_3", competency_test_id: "test_1", criterion: "Hasil", max_score: 100, score: null, comment: null, created_at: new Date(), updated_at: new Date() }
    ],
    ...overrides
  };
}

describe("CompetencyTestService.grade — M-02: semua rubrik wajib dinilai + transaksional", () => {
  let service: CompetencyTestService;
  let db: ReturnType<typeof makeDbMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    db = makeDbMock();
    service = new CompetencyTestService(db as unknown as DatabaseClient);
  });

  it("kirim 1 dari 3 rubrik → 400 (semua rubrik wajib dinilai — cegah inflate skor)", async () => {
    db.competencyTest.findUnique.mockResolvedValue(makeTest());
    const partial: GradeRubricItemInput[] = [{ rubricItemId: "rub_1", score: 100 }];

    await expect(
      service.grade("test_1", "exam_1", partial, ACTOR)
    ).rejects.toBeInstanceOf(BadRequestException);
    // Tidak ada satu pun item/test yang diupdate.
    expect(db.competencyRubricItem.update).not.toHaveBeenCalled();
    expect(db.competencyTest.update).not.toHaveBeenCalled();
  });

  it("kirim lengkap 3/3 → finalScore benar (di seluruh rubrik) + update dalam SATU transaksi", async () => {
    db.competencyTest.findUnique.mockResolvedValue(makeTest());
    db.competencyTest.update.mockResolvedValue({ ...makeTest(), final_score: 80, status: "PASSED" });

    const full: GradeRubricItemInput[] = [
      { rubricItemId: "rub_1", score: 70 },
      { rubricItemId: "rub_2", score: 80 },
      { rubricItemId: "rub_3", score: 90 }
    ];
    const result = await service.grade("test_1", "exam_1", full, ACTOR);

    // (70+80+90)/300 * 100 = 80 → PASSED
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.competencyRubricItem.update).toHaveBeenCalledTimes(3);
    expect(db.competencyRubricItem.update).toHaveBeenCalledWith({
      where: { id: "rub_1" },
      data: { score: 70 }
    });
    expect(db.competencyRubricItem.update).toHaveBeenCalledWith({
      where: { id: "rub_3" },
      data: { score: 90 }
    });
    expect(db.competencyTest.update).toHaveBeenCalledWith({
      where: { id: "test_1" },
      data: { final_score: 80, status: "PASSED" }
    });
    expect(result.status).toBe("PASSED");
  });

  it("rubrik tidak dikenal → 400, tanpa transaksi", async () => {
    db.competencyTest.findUnique.mockResolvedValue(makeTest());
    await expect(
      service.grade("test_1", "exam_1", [{ rubricItemId: "rub_x", score: 50 }], ACTOR)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("duplikat rubrik dalam satu pengiriman → 400", async () => {
    db.competencyTest.findUnique.mockResolvedValue(makeTest());
    await expect(
      service.grade(
        "test_1",
        "exam_1",
        [
          { rubricItemId: "rub_1", score: 50 },
          { rubricItemId: "rub_1", score: 60 },
          { rubricItemId: "rub_2", score: 50 },
          { rubricItemId: "rub_3", score: 50 }
        ],
        ACTOR
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("bukan penguji yang ditugaskan → 403", async () => {
    db.competencyTest.findUnique.mockResolvedValue(makeTest({ examiner_id: "exam_lain" }));
    await expect(
      service.grade("test_1", "exam_1", [{ rubricItemId: "rub_1", score: 50 }], ACTOR)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("UKK tidak ditemukan → 404", async () => {
    db.competencyTest.findUnique.mockResolvedValue(null);
    await expect(service.grade("test_x", "exam_1", [], ACTOR)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
