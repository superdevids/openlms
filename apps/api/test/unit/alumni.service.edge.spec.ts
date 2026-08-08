/**
 * Unit test — AlumniService edge: createFromGraduation validasi, archive/unarchive
 * idempoten, filter search, graduation_date default.
 */
import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { AlumniService } from "../../src/modules/alumni/alumni.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

describe("AlumniService edge", () => {
  let db: MockDb;
  let service: AlumniService;

  beforeEach(() => {
    db = createMockDb();
    service = new AlumniService(db);
  });

  it("createFromGraduation menolak siswa tidak ditemukan -> 404", async () => {
    mockFn(db, "user", "findUnique").mockResolvedValue(null);
    await expect(
      service.createFromGraduation({ studentId: "nobody", graduationYearId: "y1" })
    ).rejects.toThrow(NotFoundException);
    expect(mockFn(db, "alumni", "create")).not.toHaveBeenCalled();
  });

  it("createFromGraduation memakai graduationDate eksplisit", async () => {
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "stu-1" });
    mockFn(db, "enrollment", "findFirst").mockResolvedValue({ id: "enr-1" });
    mockFn(db, "alumni", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "alumni-1", ...data })
    );

    await service.createFromGraduation({
      studentId: "stu-1",
      graduationYearId: "y1",
      graduationDate: "2026-06-10"
    });
    const data = mockFn(db, "alumni", "create").mock.calls[0][0].data;
    expect(data.graduation_date).toEqual(new Date("2026-06-10"));
  });

  it("createFromGraduation default graduation_date = hari ini", async () => {
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "stu-1" });
    mockFn(db, "enrollment", "findFirst").mockResolvedValue({ id: "enr-1" });
    mockFn(db, "alumni", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "alumni-1", ...data })
    );

    await service.createFromGraduation({ studentId: "stu-1", graduationYearId: "y1" });
    const data = mockFn(db, "alumni", "create").mock.calls[0][0].data;
    expect(data.graduation_date).toBeInstanceOf(Date);
  });

  it("unarchive mengubah ARCHIVED → ACTIVE", async () => {
    mockFn(db, "alumni", "findUnique").mockResolvedValue({ id: "a1", status: "ARCHIVED" });
    mockFn(db, "alumni", "update").mockResolvedValue({ id: "a1", status: "ACTIVE" });
    const updated = await service.unarchive("a1", { userId: "op-1", roles: ["OPERATOR"] });
    expect(updated.status).toBe("ACTIVE");
  });

  it("archive/alumni yang sudah ARCHIVED idempoten (tanpa update)", async () => {
    mockFn(db, "alumni", "findUnique").mockResolvedValue({ id: "a1", status: "ARCHIVED" });
    const updated = await service.archive("a1", { userId: "op-1", roles: ["OPERATOR"] });
    expect(updated.status).toBe("ARCHIVED");
    expect(mockFn(db, "alumni", "update")).not.toHaveBeenCalled();
  });

  it("unarchive alumni yang tidak ada -> 404", async () => {
    mockFn(db, "alumni", "findUnique").mockResolvedValue(null);
    await expect(service.unarchive("a-x", { userId: "op-1", roles: ["OPERATOR"] })).rejects.toThrow(
      NotFoundException
    );
  });

  it("list dengan search memfilter nama/NISN via OR", async () => {
    mockFn(db, "alumni", "findMany").mockResolvedValue([]);
    await service.list({ search: "budi" });
    const where = mockFn(db, "alumni", "findMany").mock.calls[0][0].where;
    expect(where.OR).toHaveLength(2);
    expect(where.OR[0]).toEqual({
      student: { full_name: { contains: "budi", mode: "insensitive" } }
    });
    expect(where.OR[1]).toEqual({ final_nisn: { contains: "budi" } });
  });

  it("list tanpa filter tidak memakai OR", async () => {
    mockFn(db, "alumni", "findMany").mockResolvedValue([]);
    await service.list({});
    const where = mockFn(db, "alumni", "findMany").mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });

  it("list mengurutkan graduation_date desc", async () => {
    mockFn(db, "alumni", "findMany").mockResolvedValue([]);
    await service.list();
    expect(mockFn(db, "alumni", "findMany")).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { graduation_date: "desc" } })
    );
  });
});
