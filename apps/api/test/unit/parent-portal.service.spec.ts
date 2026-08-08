/**
 * Unit test — ParentPortalService: scope SENDIRI (prd04 §5.L).
 * Wali hanya boleh akses data anak yang terhubung ParentStudentLink.
 */
import "reflect-metadata";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ParentPortalService } from "../../src/modules/parent-portal/parent-portal.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

describe("ParentPortalService — scope SENDIRI", () => {
  let db: MockDb;
  let service: ParentPortalService;

  beforeEach(() => {
    db = createMockDb();
    service = new ParentPortalService(db);
    mockFn(db, "parentGuardian", "findUnique").mockResolvedValue({ id: "parent-1" });
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "stu-1", full_name: "Budi" });
  });

  it("mengizinkan akses anak yang terhubung", async () => {
    mockFn(db, "parentStudentLink", "findFirst").mockResolvedValue({
      id: "link-1",
      parent_id: "parent-1",
      student_id: "stu-1"
    });
    mockFn(db, "grade", "count").mockResolvedValue(12);
    mockFn(db, "attendance", "findMany").mockResolvedValue([
      { status: "HADIR" },
      { status: "ALPA" }
    ]);
    mockFn(db, "invoice", "count").mockResolvedValue(1);

    const overview = await service.getStudentOverview("parent-1", "stu-1");
    expect(overview.gradesCount).toBe(12);
    expect(overview.attendance).toEqual({ total: 2, alpa: 1 });
    expect(overview.unpaidInvoices).toBe(1);
  });

  it("menolak akses anak yang TIDAK terhubung -> 403", async () => {
    mockFn(db, "parentStudentLink", "findFirst").mockResolvedValue(null);
    await expect(service.getStudentOverview("parent-1", "stu-lain")).rejects.toThrow(
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
    await expect(service.getStudentOverview("parent-1", "stu-1")).rejects.toThrow(
      NotFoundException
    );
  });

  it("membuat tautan anak dan menolak duplikat -> 409", async () => {
    mockFn(db, "parentStudentLink", "findUnique").mockResolvedValue(null);
    mockFn(db, "parentStudentLink", "create").mockResolvedValue({ id: "link-1" });
    const link = await service.linkChild(
      {
        parentGuardianId: "parent-1",
        studentId: "stu-1",
        relationship: "AYAH"
      },
      { userId: "parent-1", roles: ["WALI_MURID"] }
    );
    expect(link.id).toBe("link-1");

    mockFn(db, "parentStudentLink", "findUnique").mockResolvedValue({ id: "link-1" });
    await expect(
      service.linkChild(
        { parentGuardianId: "parent-1", studentId: "stu-1", relationship: "IBU" },
        { userId: "parent-1", roles: ["WALI_MURID"] }
      )
    ).rejects.toThrow();
  });
});
