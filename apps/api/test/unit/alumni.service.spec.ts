/**
 * Unit test — AlumniService: direktori dari GRADUATED, tracking dasar.
 */
import "reflect-metadata";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AlumniService } from "../../src/modules/alumni/alumni.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

describe("AlumniService", () => {
  let db: MockDb;
  let service: AlumniService;

  beforeEach(() => {
    db = createMockDb();
    service = new AlumniService(db);
  });

  it("menolak create alumni bila siswa tidak memiliki enrollment di tahun kelulusan", async () => {
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "stu-1", full_name: "Budi" });
    mockFn(db, "enrollment", "findFirst").mockResolvedValue(null);
    await expect(
      service.createFromGraduation({ studentId: "stu-1", graduationYearId: "year-2026" })
    ).rejects.toThrow(BadRequestException);
  });

  it("membuat alumni dari enrollment GRADUATED", async () => {
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "stu-1", full_name: "Budi" });
    mockFn(db, "enrollment", "findFirst").mockResolvedValue({
      id: "enroll-1",
      status: "GRADUATED"
    });
    mockFn(db, "alumni", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "alumni-1", ...data })
    );
    const alumni = await service.createFromGraduation({
      studentId: "stu-1",
      graduationYearId: "year-2026",
      finalNisn: "0061234567"
    });
    expect(alumni.student_id).toBe("stu-1");
    expect(alumni.final_nisn).toBe("0061234567");
  });

  it("direktori memfilter tahun kelulusan dan status (paged)", async () => {
    mockFn(db, "alumni", "findMany").mockResolvedValue([{ id: "alumni-1" }]);
    mockFn(db, "alumni", "count").mockResolvedValue(1);
    const rows = await service.list({ graduationYearId: "year-2026", status: "ACTIVE" });
    expect(rows.items).toHaveLength(1);
    expect(rows.total).toBe(1);
    expect(rows.page).toBe(1);
    expect(rows.limit).toBe(20);
    const where = mockFn(db, "alumni", "findMany").mock.calls[0][0].where;
    expect(where.graduation_academic_year_id).toBe("year-2026");
    expect(where.status).toBe("ACTIVE");
  });

  it("archive mengubah status, dan menolak alumni tak dikenal", async () => {
    mockFn(db, "alumni", "findUnique").mockResolvedValue({ id: "alumni-1", status: "ACTIVE" });
    mockFn(db, "alumni", "update").mockResolvedValue({ id: "alumni-1", status: "ARCHIVED" });
    const archived = await service.archive("alumni-1", { userId: "op-1", roles: ["OPERATOR"] });
    expect(archived.status).toBe("ARCHIVED");

    mockFn(db, "alumni", "findUnique").mockResolvedValue(null);
    await expect(
      service.archive("alumni-x", { userId: "op-1", roles: ["OPERATOR"] })
    ).rejects.toThrow(NotFoundException);
  });
});
