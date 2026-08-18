/**
 * Unit test — SMK: CompetencyTestService (UKK grading + examiner scope) dan
 * PartnerService (DUDI) — edge cases.
 */
import "reflect-metadata";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { CompetencyTestService } from "../../src/modules/smk/competency-test.service";
import { PartnerService } from "../../src/modules/smk/partner.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

const ACTOR = { userId: "guru-1", roles: ["GURU"] };

describe("CompetencyTestService — UKK grading", () => {
  let db: MockDb;
  let service: CompetencyTestService;

  beforeEach(() => {
    db = createMockDb();
    service = new CompetencyTestService(db);
  });

  it("create menolak payload tidak lengkap -> 400", async () => {
    await expect(
      service.create({ title: "", competencyStandard: "x", studentId: "s1" }, ACTOR)
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create({ title: "x", competencyStandard: "", studentId: "s1" }, ACTOR)
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create({ title: "x", competencyStandard: "c", studentId: "" }, ACTOR)
    ).rejects.toThrow(BadRequestException);
    expect(mockFn(db, "competencyTest", "create")).not.toHaveBeenCalled();
  });

  it("create membuat status SCHEDULED + rubric items + audit", async () => {
    mockFn(db, "competencyTest", "create").mockResolvedValue({
      id: "ct-1",
      status: "SCHEDULED",
      title: "UKK TKJ"
    });
    mockFn(db, "competencyRubricItem", "createMany").mockResolvedValue({ count: 2 });
    mockFn(db, "competencyTest", "findUniqueOrThrow").mockResolvedValue({
      id: "ct-1",
      status: "SCHEDULED",
      title: "UKK TKJ"
    });

    const test = await service.create(
      {
        title: "UKK TKJ",
        competencyStandard: "Instalasi Jaringan",
        studentId: "s1",
        rubricItems: [
          { criterion: "Kecepatan", maxScore: 50 },
          { criterion: "Akurasi", maxScore: 50 }
        ]
      },
      ACTOR
    );

    expect(test.status).toBe("SCHEDULED");
    expect(mockFn(db, "competencyRubricItem", "createMany")).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.any(Object)]) })
    );
  });

  it("addRubricItem menolak maxScore <= 0 -> 400", async () => {
    mockFn(db, "competencyTest", "findUnique").mockResolvedValue({ id: "ct-1" });
    await expect(service.addRubricItem("ct-1", "Kriteria", 0, ACTOR)).rejects.toThrow(
      BadRequestException
    );
  });

  it("grade menolak UKK tanpa penguji -> 403", async () => {
    mockFn(db, "competencyTest", "findUnique").mockResolvedValue({
      id: "ct-1",
      examiner_id: null,
      rubric_items: []
    });
    await expect(
      service.grade("ct-1", "guru-1", [{ rubricItemId: "r1", score: 50 }], ACTOR)
    ).rejects.toThrow(ForbiddenException);
  });

  it("grade menolak penguji yang bukan ditugaskan -> 403", async () => {
    mockFn(db, "competencyTest", "findUnique").mockResolvedValue({
      id: "ct-1",
      examiner_id: "penguji-1",
      rubric_items: []
    });
    await expect(
      service.grade("ct-1", "guru-1", [{ rubricItemId: "r1", score: 50 }], ACTOR)
    ).rejects.toThrow(ForbiddenException);
  });

  it("grade menolak rubrik kosong -> 400", async () => {
    mockFn(db, "competencyTest", "findUnique").mockResolvedValue({
      id: "ct-1",
      examiner_id: "penguji-1",
      rubric_items: []
    });
    await expect(service.grade("ct-1", "penguji-1", [], ACTOR)).rejects.toThrow(
      BadRequestException
    );
  });

  it("grade menolak skor di luar 0..max_score -> 400", async () => {
    mockFn(db, "competencyTest", "findUnique").mockResolvedValue({
      id: "ct-1",
      examiner_id: "penguji-1",
      rubric_items: [{ id: "r1", max_score: 50 }]
    });
    await expect(
      service.grade("ct-1", "penguji-1", [{ rubricItemId: "r1", score: 51 }], ACTOR)
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.grade("ct-1", "penguji-1", [{ rubricItemId: "r1", score: -1 }], ACTOR)
    ).rejects.toThrow(BadRequestException);
  });

  it("grade lulus (>=70) → PASSED", async () => {
    mockFn(db, "competencyTest", "findUnique").mockResolvedValue({
      id: "ct-1",
      status: "SCHEDULED",
      examiner_id: "penguji-1",
      rubric_items: [
        { id: "r1", max_score: 100 },
        { id: "r2", max_score: 100 }
      ]
    });
    mockFn(db, "competencyRubricItem", "update").mockResolvedValue({});
    mockFn(db, "competencyTest", "update").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "ct-1", ...data })
    );
    // M-02: grade memakai $transaction — mock-db default meneruskan callback.

    const test = await service.grade(
      "ct-1",
      "penguji-1",
      [
        { rubricItemId: "r1", score: 80 },
        { rubricItemId: "r2", score: 60 }
      ],
      ACTOR
    );
    expect(test.status).toBe("PASSED");
    expect(test.final_score).toBe(70);
  });

  it("grade gagal (<70) → FAILED", async () => {
    mockFn(db, "competencyTest", "findUnique").mockResolvedValue({
      id: "ct-1",
      status: "SCHEDULED",
      examiner_id: "penguji-1",
      rubric_items: [{ id: "r1", max_score: 100 }]
    });
    mockFn(db, "competencyRubricItem", "update").mockResolvedValue({});
    mockFn(db, "competencyTest", "update").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "ct-1", ...data })
    );

    const test = await service.grade(
      "ct-1",
      "penguji-1",
      [{ rubricItemId: "r1", score: 50 }],
      ACTOR
    );
    expect(test.status).toBe("FAILED");
    expect(test.final_score).toBe(50);
  });

  it("grade UKK tidak ditemukan -> 404", async () => {
    mockFn(db, "competencyTest", "findUnique").mockResolvedValue(null);
    await expect(
      service.grade("missing", "penguji-1", [{ rubricItemId: "r1", score: 50 }], ACTOR)
    ).rejects.toThrow(NotFoundException);
  });
});

describe("PartnerService — DUDI", () => {
  let db: MockDb;
  let service: PartnerService;

  beforeEach(() => {
    db = createMockDb();
    service = new PartnerService(db);
  });

  it("create menolak tanpa name -> 400", async () => {
    await expect(service.create({ name: "" }, ACTOR)).rejects.toThrow(BadRequestException);
  });

  it("create menolak nama duplikat -> 409", async () => {
    mockFn(db, "internshipPartner", "findFirst").mockResolvedValue({ id: "p1", name: "PT Maju" });
    await expect(service.create({ name: "PT Maju" }, ACTOR)).rejects.toThrow(ConflictException);
    expect(mockFn(db, "internshipPartner", "create")).not.toHaveBeenCalled();
  });

  it("create membuat mitra baru (audit via writeAudit global)", async () => {
    mockFn(db, "internshipPartner", "findFirst").mockResolvedValue(null);
    mockFn(db, "internshipPartner", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "p2", ...data })
    );
    const partner = await service.create({ name: "PT Teknologi", industryType: "IT" }, ACTOR);
    expect(partner.name).toBe("PT Teknologi");
    expect(partner.industry_type).toBe("IT");
  });

  it("update menolak mitra tidak ada -> 404", async () => {
    mockFn(db, "internshipPartner", "findUnique").mockResolvedValue(null);
    await expect(service.update("p-x", { name: "X" }, ACTOR)).rejects.toThrow(NotFoundException);
  });

  it("addMentor menolak tanpa fullName -> 400", async () => {
    mockFn(db, "internshipPartner", "findUnique").mockResolvedValue({ id: "p1" });
    await expect(service.addMentor("p1", { fullName: "" }, ACTOR)).rejects.toThrow(
      BadRequestException
    );
  });

  it("list memfilter search OR + agreementYear", async () => {
    mockFn(db, "internshipPartner", "findMany").mockResolvedValue([]);
    await service.list({ search: "tekn", agreementYear: "2026" });
    const where = mockFn(db, "internshipPartner", "findMany").mock.calls[0][0].where;
    expect(where.OR).toHaveLength(2);
    expect(where.agreement_year).toBe("2026");
  });

  it("list tanpa filter tidak memakai OR", async () => {
    mockFn(db, "internshipPartner", "findMany").mockResolvedValue([]);
    await service.list({});
    const where = mockFn(db, "internshipPartner", "findMany").mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });

  it("listMentors menolak partner tidak ada -> 404", async () => {
    mockFn(db, "internshipPartner", "findUnique").mockResolvedValue(null);
    await expect(service.listMentors("p-x")).rejects.toThrow(NotFoundException);
  });
});
