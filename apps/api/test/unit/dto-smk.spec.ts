/**
 * Unit test — DTO validation modul SMK (class-validator): internship,
 * journal, competency test + rubric + grading, partner, mentor.
 */
import "reflect-metadata";
import { expectDtoInvalid, expectDtoValid } from "../helpers/dto-validation";
import {
  AddJournalDto,
  AddMentorDto,
  CreateCompetencyTestDto,
  CreateInternshipDto,
  CreatePartnerDto,
  GradeCompetencyTestDto,
  GradeRubricItemDto,
  RubricItemDto
} from "../../src/modules/smk/dto/smk.dto";

describe("DTO — CreateInternshipDto", () => {
  const base = {
    studentId: "s1",
    partnerId: "p1",
    academicYearId: "y1",
    startDate: "2026-01-01",
    endDate: "2026-06-30"
  };

  it("payload valid diterima", async () => {
    await expectDtoValid(CreateInternshipDto, base);
  });

  it("field wajib hilang ditolak (IsString tanpa IsOptional)", async () => {
    const { studentId: _a, ...noStudent } = base;
    await expectDtoInvalid(CreateInternshipDto, noStudent, { property: "studentId" });
    const { partnerId: _b, ...noPartner } = base;
    await expectDtoInvalid(CreateInternshipDto, noPartner, { property: "partnerId" });
    const { academicYearId: _c, ...noYear } = base;
    await expectDtoInvalid(CreateInternshipDto, noYear, { property: "academicYearId" });
  });

  it("tanggal bukan ISO 8601 ditolak", async () => {
    await expectDtoInvalid(
      CreateInternshipDto,
      { ...base, startDate: "01/01/2026" },
      { property: "startDate" }
    );
    await expectDtoInvalid(
      CreateInternshipDto,
      { ...base, endDate: "kemarin" },
      { property: "endDate" }
    );
  });
});

describe("DTO — AddJournalDto", () => {
  const base = { entryDate: "2026-03-01", activity: "Menginstal jaringan" };

  it("payload valid diterima", async () => {
    await expectDtoValid(AddJournalDto, base);
  });

  it("entryDate invalid / activity pendek ditolak", async () => {
    await expectDtoInvalid(AddJournalDto, { ...base, entryDate: "x" }, { property: "entryDate" });
    await expectDtoInvalid(AddJournalDto, { ...base, activity: "ab" }, { property: "activity" });
  });
});

describe("DTO — RubricItemDto", () => {
  it("maxScore >= 1 valid, 0/negatif ditolak", async () => {
    await expectDtoValid(RubricItemDto, { criterion: "Akurasi", maxScore: 50 });
    await expectDtoInvalid(
      RubricItemDto,
      { criterion: "Akurasi", maxScore: 0 },
      { property: "maxScore" }
    );
    await expectDtoInvalid(
      RubricItemDto,
      { criterion: "Akurasi", maxScore: -5 },
      { property: "maxScore" }
    );
  });

  it("maxScore bukan integer ditolak", async () => {
    await expectDtoInvalid(
      RubricItemDto,
      { criterion: "x", maxScore: 1.5 },
      { property: "maxScore" }
    );
  });
});

describe("DTO — CreateCompetencyTestDto", () => {
  const base = { title: "UKK TKJ", competencyStandard: "Instalasi Jaringan", studentId: "s1" };

  it("payload valid diterima", async () => {
    await expectDtoValid(CreateCompetencyTestDto, base);
  });

  it("title/competencyStandard pendek ditolak", async () => {
    await expectDtoInvalid(
      CreateCompetencyTestDto,
      { ...base, title: "ab" },
      { property: "title" }
    );
    await expectDtoInvalid(
      CreateCompetencyTestDto,
      { ...base, competencyStandard: "" },
      { property: "competencyStandard" }
    );
  });

  it("rubricItems nested invalid ditolak", async () => {
    await expectDtoInvalid(
      CreateCompetencyTestDto,
      { ...base, rubricItems: [{ criterion: "x", maxScore: 0 }] },
      { property: "rubricItems" }
    );
  });
});

describe("DTO — GradeRubricItemDto & GradeCompetencyTestDto", () => {
  it("score 0..100 valid", async () => {
    await expectDtoValid(GradeRubricItemDto, { rubricItemId: "r1", score: 85 });
    await expectDtoValid(GradeRubricItemDto, { rubricItemId: "r1", score: 0 });
  });

  it("score di luar rentang / bukan integer ditolak", async () => {
    await expectDtoInvalid(
      GradeRubricItemDto,
      { rubricItemId: "r1", score: -1 },
      { property: "score" }
    );
    await expectDtoInvalid(
      GradeRubricItemDto,
      { rubricItemId: "r1", score: 101 },
      { property: "score" }
    );
    await expectDtoInvalid(
      GradeRubricItemDto,
      { rubricItemId: "r1", score: 50.5 },
      { property: "score" }
    );
  });

  it("GradeCompetencyTestDto tanpa items ditolak (wajib array)", async () => {
    await expectDtoValid(GradeCompetencyTestDto, { items: [{ rubricItemId: "r1", score: 80 }] });
    await expectDtoInvalid(GradeCompetencyTestDto, {}, { property: "items" });
  });

  it("items nested invalid ditolak", async () => {
    await expectDtoInvalid(
      GradeCompetencyTestDto,
      { items: [{ rubricItemId: "r1", score: 150 }] },
      { property: "items" }
    );
  });
});

describe("DTO — CreatePartnerDto & AddMentorDto", () => {
  it("partner name pendek ditolak", async () => {
    await expectDtoInvalid(CreatePartnerDto, { name: "ab" }, { property: "name" });
    await expectDtoValid(CreatePartnerDto, { name: "PT Maju Jaya" });
  });

  it("mentor fullName pendek ditolak", async () => {
    await expectDtoInvalid(AddMentorDto, { fullName: "ab" }, { property: "fullName" });
    await expectDtoValid(AddMentorDto, { fullName: "Budi Santoso" });
  });
});
