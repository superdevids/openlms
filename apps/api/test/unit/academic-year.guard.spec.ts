/**
 * Unit test — AcademicYearGuard (arsip: tulis ke tahun CLOSED ditolak 403).
 * Fokus: kontrak ARCHIVED_YEAR pada exception (prd04 §5.R).
 */
import "reflect-metadata";
import { ForbiddenException } from "@nestjs/common";
import {
  AcademicYearGuard,
  ARCHIVED_YEAR_CODE,
  ArchivedYearException
} from "../../src/modules/academic/academic-year.guard";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

describe("AcademicYearGuard — ARCHIVED_YEAR", () => {
  let db: MockDb;
  let guard: AcademicYearGuard;

  beforeEach(() => {
    db = createMockDb();
    guard = new AcademicYearGuard(db);
  });

  it("mengizinkan tulis ke tahun OPEN/DRAFT/CLOSING", () => {
    expect(() => guard.assertStatusWritable("OPEN", "2026/2027")).not.toThrow();
    expect(() => guard.assertStatusWritable("DRAFT", "2026/2027")).not.toThrow();
    expect(() => guard.assertStatusWritable("CLOSING", "2026/2027")).not.toThrow();
  });

  it("menolak tulis ke tahun CLOSED dengan kode ARCHIVED_YEAR (403)", () => {
    try {
      guard.assertStatusWritable("CLOSED", "2025/2026");
      fail("seharusnya melempar ArchivedYearException");
    } catch (err) {
      expect(err).toBeInstanceOf(ArchivedYearException);
      expect(err).toBeInstanceOf(ForbiddenException);
      const body = (err as ArchivedYearException).getResponse() as {
        error: { code: string; message: string };
      };
      expect(body.error.code).toBe(ARCHIVED_YEAR_CODE);
      expect(body.error.message).toContain("2025/2026");
    }
  });

  it("assertWritable membaca status dari DB dan menolak bila CLOSED", async () => {
    mockFn(db, "academicYear", "findUnique").mockResolvedValue({
      id: "year-1",
      code: "2025/2026",
      status: "CLOSED"
    });
    await expect(guard.assertWritable("year-1")).rejects.toThrow(ArchivedYearException);
  });

  it("assertWritable melempar Forbidden bila tahun tidak ditemukan", async () => {
    mockFn(db, "academicYear", "findUnique").mockResolvedValue(null);
    await expect(guard.assertWritable("year-x")).rejects.toThrow(ForbiddenException);
  });
});
