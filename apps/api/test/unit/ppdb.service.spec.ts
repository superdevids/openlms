/**
 * Unit test — PpdbService: consent WAJIB (timestamp + bukti) (prd04 §5.J, G13).
 */
import "reflect-metadata";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { PpdbService } from "../../src/modules/ppdb/ppdb.service";
import { AcademicYearGuard } from "../../src/modules/academic/academic-year.guard";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

const BASE = {
  fullName: "Budi Santoso",
  birthDate: "2010-05-01",
  birthPlace: "Jakarta",
  gender: "L" as const,
  phone: "081234567890",
  parentName: "Siti",
  parentPhone: "081234567891"
};

describe("PpdbService — consent", () => {
  let db: MockDb;
  let service: PpdbService;

  beforeEach(() => {
    db = createMockDb();
    service = new PpdbService(db, new AcademicYearGuard(db));
    mockFn(db, "parentalConsent", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "consent-1", ...data })
    );
    mockFn(db, "ppdbApplicant", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "applicant-1", ...data })
    );
  });

  it("register WAJIB consent berisi parentName + documentUrl (bukti) -> 400 bila tidak", async () => {
    await expect(
      service.register({ ...BASE, consent: { parentName: "", documentUrl: "" } })
    ).rejects.toThrow(BadRequestException);

    await expect(service.register({ ...BASE, consent: undefined as never })).rejects.toThrow(
      BadRequestException
    );
  });

  it("register membuat ParentalConsent GRANTED bertimestamp + bukti, lalu applicant SUBMITTED", async () => {
    const applicant = await service.register({
      ...BASE,
      documents: [{ type: "ijazah", url: "ppdb-documents/ijazah-budi.jpg" }],
      consent: {
        parentName: "Siti Aminah",
        documentUrl: "ppdb-consents/consent-budi.pdf"
      }
    });

    const consentCreate = mockFn(db, "parentalConsent", "create");
    expect(consentCreate).toHaveBeenCalledTimes(1);
    const consentData = consentCreate.mock.calls[0][0].data;
    expect(consentData.status).toBe("GRANTED");
    expect(consentData.consent_type).toBe("DATA_CHILD");
    expect(consentData.document_url).toBe("ppdb-consents/consent-budi.pdf");
    expect(consentData.granted_at).toBeInstanceOf(Date);

    const applicantData = mockFn(db, "ppdbApplicant", "create").mock.calls[0][0].data;
    expect(applicantData.status).toBe("SUBMITTED");
    expect(applicantData.consent_id).toBe("consent-1");
    expect(applicantData.documents).toHaveLength(1);
    expect(applicant.registration_no).toContain("PPDB-");
  });

  it("verifikasi hanya untuk status SUBMITTED -> 409 untuk status lain", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "applicant-1",
      status: "VERIFIED"
    });
    await expect(service.verify("applicant-1", true)).rejects.toThrow(ConflictException);
  });

  it("enroll menolak calon tanpa akun User -> 403 CONFLICT", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "applicant-1",
      status: "SELECTED",
      user_id: null
    });
    mockFn(db, "academicYear", "findUnique").mockResolvedValue({
      id: "year-1",
      code: "2026/2027",
      status: "OPEN"
    });
    await expect(service.enroll("applicant-1", "year-1", "cls-1")).rejects.toThrow();
  });
});
