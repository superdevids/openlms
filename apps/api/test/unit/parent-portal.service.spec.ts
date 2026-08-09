/**
 * Unit test — ParentPortalService: scope SENDIRI (prd04 §5.L, SEC-001).
 * Wali hanya boleh akses data anak yang terhubung ParentStudentLink dan
 * ParentGuardian milik akunnya (parent.user_id === actor.userId).
 */
import "reflect-metadata";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ParentPortalService } from "../../src/modules/parent-portal/parent-portal.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

const actor = { userId: "u-1", roles: ["WALI_MURID"] };

describe("ParentPortalService — scope SENDIRI", () => {
  let db: MockDb;
  let service: ParentPortalService;

  beforeEach(() => {
    db = createMockDb();
    service = new ParentPortalService(db);
    // ParentGuardian milik aktor — resolveOwnedParent memakai findFirst + user_id.
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue({
      id: "parent-1",
      user_id: "u-1"
    });
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "stu-1", full_name: "Budi" });
  });

  it("mengizinkan akses anak yang terhubung", async () => {
    mockFn(db, "parentStudentLink", "findFirst").mockResolvedValue({
      id: "link-1",
      parent_id: "parent-1",
      student_id: "stu-1"
    });
    mockFn(db, "grade", "count").mockResolvedValue(12);
    mockFn(db, "attendance", "groupBy").mockResolvedValue([
      { status: "HADIR", _count: { _all: 1 } },
      { status: "ALPA", _count: { _all: 1 } }
    ]);
    mockFn(db, "invoice", "count").mockResolvedValue(1);

    const overview = await service.getStudentOverview("parent-1", "stu-1", actor);
    expect(overview.gradesCount).toBe(12);
    expect(overview.attendance).toEqual({ total: 2, alpa: 1 });
    expect(overview.unpaidInvoices).toBe(1);
  });

  it("menolak akses anak yang TIDAK terhubung -> 403", async () => {
    mockFn(db, "parentStudentLink", "findFirst").mockResolvedValue(null);
    await expect(service.getStudentOverview("parent-1", "stu-lain", actor)).rejects.toThrow(
      ForbiddenException
    );
  });

  it("menolak akses bila ParentGuardian bukan milik aktor -> 403", async () => {
    mockFn(db, "parentGuardian", "findFirst").mockResolvedValue(null);
    await expect(service.getStudentOverview("parent-1", "stu-1", actor)).rejects.toThrow(
      ForbiddenException
    );
  });

  it("menolak akses bila siswa tidak ada -> 404", async () => {
    mockFn(db, "parentStudentLink", "findFirst").mockResolvedValue({
      id: "link-1",
      parent_id: "parent-1",
      student_id: "stu-1"
    });
    mockFn(db, "user", "findUnique").mockResolvedValue(null);
    await expect(service.getStudentOverview("parent-1", "stu-1", actor)).rejects.toThrow(
      NotFoundException
    );
  });

  it("membuat tautan anak dan menolak duplikat -> 409", async () => {
    mockFn(db, "user", "findUnique").mockResolvedValue({
      id: "stu-1",
      full_name: "Budi",
      is_active: true,
      roles: [{ role: "SISWA", status: "ACTIVE" }]
    });
    mockFn(db, "parentStudentLink", "findUnique").mockResolvedValue(null);
    mockFn(db, "parentStudentLink", "create").mockResolvedValue({ id: "link-1" });
    const link = await service.linkChild(
      {
        parentGuardianId: "parent-1",
        studentId: "stu-1",
        relationship: "AYAH"
      },
      actor
    );
    expect(link.id).toBe("link-1");

    mockFn(db, "parentStudentLink", "findUnique").mockResolvedValue({ id: "link-1" });
    await expect(
      service.linkChild(
        { parentGuardianId: "parent-1", studentId: "stu-1", relationship: "IBU" },
        actor
      )
    ).rejects.toThrow();
  });
});
