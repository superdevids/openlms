import { RaporClassQueryDto, RaporStudentQueryDto } from "../dto/rapor.dto";
import { expectDtoInvalid, expectDtoValid } from "../../../../test/helpers/dto-validation";

describe("DTO Rapor — validasi semester (FIX 5)", () => {
  describe("RaporStudentQueryDto", () => {
    it("semester GANJIL / GENAP valid", async () => {
      await expectDtoValid(RaporStudentQueryDto, { semester: "GANJIL" });
      await expectDtoValid(RaporStudentQueryDto, { semester: "GENAP" });
    });

    it("academicYear opsional — boleh dikosongkan (fallback tahun aktif)", async () => {
      await expectDtoValid(RaporStudentQueryDto, { semester: "GANJIL", academicYear: "2026/2027" });
      await expectDtoValid(RaporStudentQueryDto, { semester: "GANJIL" });
    });

    it.each([
      [{ semester: "ganjil" }, "semester", "matches"],
      [{ semester: "GANJIL/GENAP" }, "semester", "matches"],
      [{ semester: "2026/2027" }, "semester", "matches"],
      [{ semester: "" }, "semester", "matches"],
      [{ semester: undefined }, "semester", "matches"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(RaporStudentQueryDto, data, { property: prop, constraint });
    });
  });

  describe("RaporClassQueryDto", () => {
    it("semester GANJIL / GENAP valid", async () => {
      await expectDtoValid(RaporClassQueryDto, { semester: "GANJIL" });
      await expectDtoValid(RaporClassQueryDto, { semester: "GENAP", academicYear: "2026/2027" });
    });

    it.each([
      [{ semester: "genap" }, "semester", "matches"],
      [{ semester: "GANJIL-2026/2027" }, "semester", "matches"],
      [{ semester: "" }, "semester", "matches"],
      [{ semester: undefined }, "semester", "matches"]
    ])("menolak %#: %j", async (data, prop, constraint) => {
      await expectDtoInvalid(RaporClassQueryDto, data, { property: prop, constraint });
    });
  });
});
