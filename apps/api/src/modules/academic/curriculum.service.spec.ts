import { NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "../database/database.constants";
import { CurriculumService } from "./curriculum.service";

function createMockDb() {
  const curriculumReference = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn()
  };
  const subject = { upsert: jest.fn() };
  const db = { curriculumReference, subject } as unknown as DatabaseClient;
  return { db, mocks: { curriculumReference, subject } };
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ref_1",
    subject_id: "subj_1",
    type: "CP",
    code: "CUR-MAT-E",
    name: "Matematika",
    content: {
      phase: "E",
      capaianPembelajaran: "Mampu mengoperasikan bilangan real.",
      alurTujuanPembelajaran: ["Operasi bilangan", "Persamaan linear"]
    },
    created_at: new Date(),
    updated_at: new Date(),
    subject: {
      id: "subj_1",
      code: "MAT",
      name: "Matematika",
      category: "WAJIB",
      is_competency_based: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    ...overrides
  };
}

describe("CurriculumService — persist Prisma (model CurriculumReference)", () => {
  let service: CurriculumService;
  let mocks: ReturnType<typeof createMockDb>["mocks"];

  beforeEach(() => {
    const mock = createMockDb();
    mocks = mock.mocks;
    service = new CurriculumService(mock.db);
    jest.clearAllMocks();
  });

  it("list → memetakan row (content.phase) ke kontrak CurriculumReference", async () => {
    mocks.curriculumReference.findMany.mockResolvedValue([makeRow()]);

    const result = await service.list({ phase: "E" });

    expect(result).toEqual([
      {
        id: "ref_1",
        subjectCode: "MAT",
        subjectName: "Matematika",
        phase: "E",
        capaianPembelajaran: "Mampu mengoperasikan bilangan real.",
        alurTujuanPembelajaran: ["Operasi bilangan", "Persamaan linear"]
      }
    ]);
    expect(mocks.curriculumReference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { content: { path: ["phase"], equals: "E" } }
      })
    );
  });

  it("getById tidak ditemukan → NotFoundException", async () => {
    mocks.curriculumReference.findUnique.mockResolvedValue(null);

    await expect(service.getById("ref_x")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("upsert → resolve Subject by code + upsert curriculum_reference (type CP)", async () => {
    mocks.subject.upsert.mockResolvedValue({
      id: "subj_new",
      code: "BINDO",
      name: "Bahasa Indonesia",
      category: "WAJIB",
      is_competency_based: false,
      created_at: new Date(),
      updated_at: new Date()
    });
    mocks.curriculumReference.upsert.mockResolvedValue(
      makeRow({ id: "ref_new", subject_id: "subj_new", code: "CUR-BINDO-E" })
    );

    const result = await service.upsert({
      subjectCode: "BINDO",
      subjectName: "Bahasa Indonesia",
      phase: "E",
      capaianPembelajaran: "Mampu memproduksi teks eksposisi.",
      alurTujuanPembelajaran: ["Struktur teks", "Teks prosedur"]
    });

    expect(mocks.subject.upsert).toHaveBeenCalledWith({
      where: { code: "BINDO" },
      create: { code: "BINDO", name: "Bahasa Indonesia", category: "WAJIB" },
      update: { name: "Bahasa Indonesia" }
    });
    expect(mocks.curriculumReference.upsert).toHaveBeenCalledWith({
      where: {
        subject_id_type_code: { subject_id: "subj_new", type: "CP", code: "CUR-BINDO-E" }
      },
      create: expect.objectContaining({
        subject_id: "subj_new",
        type: "CP",
        code: "CUR-BINDO-E",
        name: "Bahasa Indonesia",
        content: expect.objectContaining({ phase: "E" })
      }),
      update: expect.objectContaining({ name: "Bahasa Indonesia" }),
      include: { subject: true }
    });
    expect(result.subjectCode).toBe("MAT"); // row mock subject.code
  });

  it("remove → delete by id; row tidak ada (P2025) → false", async () => {
    mocks.curriculumReference.delete.mockResolvedValue({});
    expect(await service.remove("ref_1")).toBe(true);

    mocks.curriculumReference.delete.mockRejectedValue({ code: "P2025" });
    expect(await service.remove("ref_1")).toBe(false);
  });

  it("onModuleInit → seed idempoten dari SEED_CURRICULUM_REFERENCES", async () => {
    mocks.subject.upsert.mockResolvedValue({
      id: "subj_seed",
      code: "MAT",
      name: "Matematika",
      category: "WAJIB",
      is_competency_based: false,
      created_at: new Date(),
      updated_at: new Date()
    });
    mocks.curriculumReference.upsert.mockResolvedValue(makeRow());

    await service.onModuleInit();

    // 5 referensi seed: MAT:E, MAT:F, BINDO:E, BING:E, PROD:F
    expect(mocks.subject.upsert).toHaveBeenCalledTimes(5);
    expect(mocks.curriculumReference.upsert).toHaveBeenCalledTimes(5);
  });
});
