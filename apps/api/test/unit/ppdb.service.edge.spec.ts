/**
 * Unit test — PpdbService edge: register validasi, seleksi (score range),
 * waitlist, track public (anti PII), listSelection, enroll tanpa user.
 */
import "reflect-metadata";

// writeAudit (lms-audit) memakai prisma global @opensis/database — mock agar
// unit test tidak menyentuh DB nyata (writeAudit cepat resolve).
jest.mock("@opensis/database", () => ({
  prisma: {
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit_1", created_at: new Date() }) }
  }
}));

import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
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

const CONSENT = { parentName: "Siti Aminah", documentUrl: "ppdb-consents/consent-budi.pdf" };

describe("PpdbService edge", () => {
  let db: MockDb;
  let service: PpdbService;
  const notif = { createForUser: jest.fn() } as never;

  beforeEach(() => {
    db = createMockDb();
    service = new PpdbService(db, new AcademicYearGuard(db), notif);
    mockFn(db, "parentalConsent", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "consent-1", ...data })
    );
    mockFn(db, "ppdbApplicant", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "applicant-1", ...data })
    );
    mockFn(db, "academicYear", "findUnique").mockResolvedValue({
      id: "year-1",
      code: "2026/2027",
      status: "OPEN"
    });
  });

  it("register menolak fullName/phone/parentName kosong -> 400", async () => {
    await expect(service.register({ ...BASE, fullName: "" } as never)).rejects.toThrow(
      BadRequestException
    );
    await expect(service.register({ ...BASE, phone: "" } as never)).rejects.toThrow(
      BadRequestException
    );
    await expect(service.register({ ...BASE, parentName: "" } as never)).rejects.toThrow(
      BadRequestException
    );
    expect(mockFn(db, "ppdbApplicant", "create")).not.toHaveBeenCalled();
  });

  it("register menolak consent tanpa documentUrl -> 400", async () => {
    await expect(
      service.register({ ...BASE, consent: { parentName: "Siti", documentUrl: "" } })
    ).rejects.toThrow(BadRequestException);
  });

  it("register membuat registration_no berformat PPDB-YYYYMMDD-XXXX", async () => {
    const applicant = await service.register({ ...BASE, consent: CONSENT });
    expect(applicant.registration_no).toMatch(/^PPDB-\d{8}-[A-Z0-9]{4}$/);
  });

  it("track pendaftar tidak ditemukan -> 404", async () => {
    mockFn(db, "ppdbApplicant", "findFirst").mockResolvedValue(null);
    await expect(service.track("PPDB-20260807-ABCD")).rejects.toThrow(NotFoundException);
  });

  it("trackPublic hanya mengembalikan field minimal (anti bocor PII)", async () => {
    mockFn(db, "ppdbApplicant", "findFirst").mockResolvedValue({
      registration_no: "PPDB-X",
      full_name: "Budi",
      status: "VERIFIED"
    });
    const result = await service.trackPublic("PPDB-X");
    expect(result).toEqual({
      registration_no: "PPDB-X",
      full_name: "Budi",
      status: "VERIFIED"
    });
    expect(result).not.toHaveProperty("phone");
    // Service meminta hanya field minimal lewat select (PII tidak diambil dari DB).
    expect(mockFn(db, "ppdbApplicant", "findFirst")).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { registration_no: true, full_name: true, status: true }
      })
    );
  });

  it("verify(approve=true) → VERIFIED; verify(approve=false) → REJECTED", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "a1",
      status: "SUBMITTED",
      registration_no: "PPDB-X"
    });
    mockFn(db, "ppdbApplicant", "update").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "a1", ...data })
    );

    const approved = await service.verify("a1", true, { userId: "op", roles: ["OPERATOR"] });
    expect(approved.status).toBe("VERIFIED");
    const rejected = await service.verify("a1", false, { userId: "op", roles: ["OPERATOR"] });
    expect(rejected.status).toBe("REJECTED");
  });

  it("select menolak selectionScore di luar 0-100 -> 400", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "a1",
      status: "VERIFIED"
    });
    await expect(
      service.select("a1", { selectionScore: -1 }, { userId: "op", roles: ["OPERATOR"] })
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.select("a1", { selectionScore: 101 }, { userId: "op", roles: ["OPERATOR"] })
    ).rejects.toThrow(BadRequestException);
    expect(mockFn(db, "ppdbApplicant", "update")).not.toHaveBeenCalled();
  });

  it("select hanya untuk VERIFIED -> 409 untuk SUBMITTED", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "a1",
      status: "SUBMITTED"
    });
    await expect(
      service.select("a1", { selectionScore: 80 }, { userId: "op", roles: ["OPERATOR"] })
    ).rejects.toThrow(ConflictException);
  });

  it("select mengisi selection_score + status SELECTED", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({ id: "a1", status: "VERIFIED" });
    mockFn(db, "ppdbApplicant", "update").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "a1", ...data })
    );
    const updated = await service.select(
      "a1",
      { selectionScore: 92.5 },
      {
        userId: "op",
        roles: ["OPERATOR"]
      }
    );
    expect(updated.status).toBe("SELECTED");
    expect(updated.selection_score).toBe(92.5);
  });

  it("waitlist hanya untuk VERIFIED -> 409 untuk SELECTED", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "a1",
      status: "SELECTED"
    });
    await expect(
      service.waitlist("a1", { selectionScore: 50 }, { userId: "op", roles: ["OPERATOR"] })
    ).rejects.toThrow(ConflictException);
  });

  it("waitlist mengisi status WAITLIST", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({ id: "a1", status: "VERIFIED" });
    mockFn(db, "ppdbApplicant", "update").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "a1", ...data })
    );
    const updated = await service.waitlist(
      "a1",
      { selectionScore: 40 },
      {
        userId: "op",
        roles: ["OPERATOR"]
      }
    );
    expect(updated.status).toBe("WAITLIST");
  });

  it("listSelection mengurutkan selection_score desc + hanya SELECTED/WAITLIST", async () => {
    mockFn(db, "ppdbApplicant", "findMany").mockResolvedValue([]);
    await service.listSelection();
    expect(mockFn(db, "ppdbApplicant", "findMany")).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["SELECTED", "WAITLIST"] } },
        orderBy: { selection_score: "desc" }
      })
    );
  });

  it("enroll menolak status selain SELECTED -> 409", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "a1",
      status: "VERIFIED"
    });
    await expect(
      service.enroll("a1", "year-1", "cls-1", { userId: "op", roles: ["OPERATOR"] })
    ).rejects.toThrow(ConflictException);
  });

  it("enroll menolak calon tanpa akun User -> throw CONFLICT", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "a1",
      status: "SELECTED",
      user_id: null
    });
    await expect(
      service.enroll("a1", "year-1", "cls-1", { userId: "op", roles: ["OPERATOR"] })
    ).rejects.toThrow();
  });

  it("enroll membuat UserRole SISWA + Enrollment + status ENROLLED", async () => {
    mockFn(db, "ppdbApplicant", "findUnique").mockResolvedValue({
      id: "a1",
      status: "SELECTED",
      user_id: "usr-1",
      consent_id: "consent-1"
    });
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "usr-1", full_name: "Budi" });
    mockFn(db, "userRole", "findFirst").mockResolvedValue(null);
    mockFn(db, "userRole", "create").mockResolvedValue({ id: "ur-1" });
    mockFn(db, "enrollment", "create").mockResolvedValue({ id: "enr-1" });
    mockFn(db, "parentalConsent", "update").mockResolvedValue({ id: "consent-1" });
    mockFn(db, "ppdbApplicant", "update").mockResolvedValue({ id: "a1", status: "ENROLLED" });

    const updated = await service.enroll("a1", "year-1", "cls-1", {
      userId: "op",
      roles: ["OPERATOR"]
    });
    expect(updated.status).toBe("ENROLLED");
    expect(mockFn(db, "userRole", "create")).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_id: "usr-1", role: "SISWA", status: "ACTIVE" })
      })
    );
    expect(mockFn(db, "enrollment", "create")).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ student_id: "usr-1", status: "ACTIVE" })
      })
    );
  });
});
