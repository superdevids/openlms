/**
 * Unit test — DTO validation modul PPDB: register (consent nested, phone,
 * gender, email, documents), selection, verify.
 */
import "reflect-metadata";
import { expectDtoInvalid, expectDtoValid } from "../helpers/dto-validation";
import {
  ConsentProofDto,
  RegisterPpdbDto,
  SelectionDto,
  VerifyDto
} from "../../src/modules/ppdb/dto/ppdb.dto";

const BASE = {
  fullName: "Budi Santoso",
  nisn: "0061234567",
  birthDate: "2010-05-01",
  birthPlace: "Jakarta",
  gender: "L",
  originSchool: "SDN 1",
  phone: "081234567890",
  email: "budi@example.com",
  parentName: "Siti Aminah",
  parentPhone: "081234567891",
  consent: { parentName: "Siti Aminah", documentUrl: "ppdb-consents/consent.pdf" }
};

describe("DTO — RegisterPpdbDto", () => {
  it("payload valid diterima", async () => {
    await expectDtoValid(RegisterPpdbDto, BASE);
  });

  it("fullName pendek (< 3) ditolak", async () => {
    await expectDtoInvalid(RegisterPpdbDto, { ...BASE, fullName: "ab" }, { property: "fullName" });
  });

  it("birthDate bukan ISO ditolak", async () => {
    await expectDtoInvalid(
      RegisterPpdbDto,
      { ...BASE, birthDate: "05/01/2010" },
      { property: "birthDate" }
    );
  });

  it("gender bukan L/P ditolak", async () => {
    await expectDtoInvalid(RegisterPpdbDto, { ...BASE, gender: "X" }, { property: "gender" });
  });

  it("phone pendek (< 9) ditolak", async () => {
    await expectDtoInvalid(RegisterPpdbDto, { ...BASE, phone: "0812" }, { property: "phone" });
  });

  it("email invalid ditolak saat dikirim", async () => {
    await expectDtoInvalid(
      RegisterPpdbDto,
      { ...BASE, email: "bukan-email" },
      { property: "email" }
    );
  });

  it("email kosong boleh (opsional)", async () => {
    await expectDtoValid(RegisterPpdbDto, { ...BASE, email: undefined });
  });

  it("consent hilang ditolak", async () => {
    const { consent: _c, ...noConsent } = BASE;
    await expectDtoInvalid(RegisterPpdbDto, noConsent, { property: "consent" });
  });

  it("consent nested invalid ditolak", async () => {
    await expectDtoInvalid(
      RegisterPpdbDto,
      { ...BASE, consent: { parentName: "ab", documentUrl: "x" } },
      { property: "consent" }
    );
  });

  it("documents nested invalid ditolak (bukan string)", async () => {
    await expectDtoInvalid(
      RegisterPpdbDto,
      { ...BASE, documents: [{ type: 123, url: "x" }] },
      { property: "documents" }
    );
  });

  it("documents valid diterima", async () => {
    await expectDtoValid(RegisterPpdbDto, {
      ...BASE,
      documents: [{ type: "ijazah", url: "ppdb-documents/ijazah.pdf" }]
    });
  });
});

describe("DTO — ConsentProofDto", () => {
  it("parentName/documentUrl pendek ditolak", async () => {
    await expectDtoInvalid(
      ConsentProofDto,
      { parentName: "ab", documentUrl: "ok" },
      { property: "parentName" }
    );
    await expectDtoInvalid(
      ConsentProofDto,
      { parentName: "ok", documentUrl: "x" },
      { property: "documentUrl" }
    );
  });
});

describe("DTO — SelectionDto & VerifyDto", () => {
  it("selectionScore 0..100 valid", async () => {
    await expectDtoValid(SelectionDto, { selectionScore: 80 });
    await expectDtoValid(SelectionDto, { selectionScore: 0 });
    await expectDtoValid(SelectionDto, { selectionScore: 100 });
  });

  it("selectionScore di luar rentang / bukan int ditolak", async () => {
    await expectDtoInvalid(SelectionDto, { selectionScore: -1 }, { property: "selectionScore" });
    await expectDtoInvalid(SelectionDto, { selectionScore: 101 }, { property: "selectionScore" });
    await expectDtoInvalid(SelectionDto, { selectionScore: 50.5 }, { property: "selectionScore" });
  });

  it("verify approve boolean valid; string ditolak", async () => {
    await expectDtoValid(VerifyDto, { approve: true });
    await expectDtoValid(VerifyDto, { approve: false });
    await expectDtoInvalid(VerifyDto, { approve: "yes" }, { property: "approve" });
  });
});
