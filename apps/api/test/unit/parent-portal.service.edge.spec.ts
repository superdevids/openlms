/**
 * Unit test — ParentPortalService edge: ensureParent, listChildren, consent,
 * overview aggregation dengan attendance kosong / tanpa alpa.
 * Scope SENDIRI (SEC-001): parent WAJIB milik aktor.
 */
import "reflect-metadata";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ParentPortalService } from "../../src/modules/parent-portal/parent-portal.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

const actor = { userId: "u1", roles: ["WALI_MURID"] };
const ownedParent = { id: "pg-1", user_id: "u1" };

describe("ParentPortalService edge", () => {
  let db: MockDb;
  let service: ParentPortalService;

  beforeEach(() => {
    db = createMockDb();
    service = new ParentPortalService(db);
  });

  it("ensureParent memakai ParentGuardian yang sudah ada", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue({
      id: "pg-1",
      user_id: "u1"
    });
    const parent = await service.ensureParent("u1", "Siti", "0812");
    expect(parent.id).toBe("pg-1");
    expect(mockFn(db, "parentGuardian", "create")).not.toHaveBeenCalled();
  });

  it("ensureParent membuat ParentGuardian baru bila belum ada", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(null);
    mockFn(db, "parentGuardian", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "pg-2", ...data })
    );
    const parent = await service.ensureParent("u2", "Budi", "0813");
    expect(parent.id).toBe("pg-2");
    expect(mockFn(db, "parentGuardian", "create")).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user_id: "u2", full_name: "Budi", phone: "0813" })
      })
    );
  });

  it("linkChild menolak parent bukan milik aktor -> 403", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(null);
    await expect(
      service.linkChild(
        { parentGuardianId: "pg-x", studentId: "stu-1", relationship: "AYAH" },
        actor
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("linkChild menolak siswa tidak ditemukan -> 404", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(ownedParent);
    mockFn(db, "user", "findUnique").mockResolvedValue(null);
    await expect(
      service.linkChild(
        { parentGuardianId: "pg-1", studentId: "stu-x", relationship: "AYAH" },
        actor
      )
    ).rejects.toThrow(NotFoundException);
  });

  it("linkChild menolak siswa non-SISWA -> 403", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(ownedParent);
    mockFn(db, "user", "findUnique").mockResolvedValue({
      id: "stu-1",
      is_active: true,
      roles: [{ role: "GURU", status: "ACTIVE" }]
    });
    await expect(
      service.linkChild(
        { parentGuardianId: "pg-1", studentId: "stu-1", relationship: "WALI" },
        actor
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("linkChild duplikat -> 409", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(ownedParent);
    mockFn(db, "user", "findUnique").mockResolvedValue({
      id: "stu-1",
      is_active: true,
      roles: [{ role: "SISWA", status: "ACTIVE" }]
    });
    mockFn(db, "parentStudentLink", "findUnique").mockResolvedValue({ id: "link-1" });
    await expect(
      service.linkChild(
        { parentGuardianId: "pg-1", studentId: "stu-1", relationship: "WALI" },
        actor
      )
    ).rejects.toThrow(ConflictException);
  });

  it("listChildren include data siswa (select minimal)", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(ownedParent);
    mockFn(db, "parentStudentLink", "findMany").mockResolvedValue([]);
    await service.listChildren("pg-1", actor);
    expect(mockFn(db, "parentStudentLink", "findMany")).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parent_id: "pg-1" },
        include: { student: { select: { id: true, full_name: true, email: true, phone: true } } }
      })
    );
  });

  it("listChildren menolak parent bukan milik aktor -> 403", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(null);
    await expect(service.listChildren("pg-1", actor)).rejects.toThrow(ForbiddenException);
    expect(mockFn(db, "parentStudentLink", "findMany")).not.toHaveBeenCalled();
  });

  it("getChildConsents menolak anak bukan milik parent -> 403", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(ownedParent);
    mockFn(db, "parentStudentLink", "findFirst").mockResolvedValue(null);
    await expect(service.getChildConsents("pg-1", "stu-x", actor)).rejects.toThrow();
  });

  it("getChildConsents menolak parent yang tidak punya akses (403)", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(null);
    await expect(service.getChildConsents("pg-1", "stu-1", actor)).rejects.toThrow(
      ForbiddenException
    );
  });

  it("overview dengan attendance kosong → total 0, alpa 0", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(ownedParent);
    mockFn(db, "parentStudentLink", "findFirst").mockResolvedValue({ id: "link-1" });
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "stu-1", full_name: "Budi" });
    mockFn(db, "grade", "count").mockResolvedValue(0);
    mockFn(db, "attendance", "groupBy").mockResolvedValue([]);
    mockFn(db, "invoice", "count").mockResolvedValue(0);

    const overview = await service.getStudentOverview("pg-1", "stu-1", actor);
    expect(overview.attendance).toEqual({ total: 0, alpa: 0 });
    expect(overview.gradesCount).toBe(0);
  });

  it("overview memakai groupBy status untuk menghitung alpa", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(ownedParent);
    mockFn(db, "parentStudentLink", "findFirst").mockResolvedValue({ id: "link-1" });
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "stu-1", full_name: "Budi" });
    mockFn(db, "grade", "count").mockResolvedValue(5);
    mockFn(db, "attendance", "groupBy").mockResolvedValue([
      { status: "HADIR", _count: { _all: 3 } },
      { status: "ALPA", _count: { _all: 1 } },
      { status: "IZIN", _count: { _all: 2 } }
    ]);
    mockFn(db, "invoice", "count").mockResolvedValue(2);

    const overview = await service.getStudentOverview("pg-1", "stu-1", actor);
    expect(overview.attendance.total).toBe(6);
    expect(overview.attendance.alpa).toBe(1);
    expect(overview.unpaidInvoices).toBe(2);
  });
});
