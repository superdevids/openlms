/**
 * Unit test — ScheduleService: validasi bentrok guru/ruang + guard arsip.
 */
import "reflect-metadata";
import { ConflictException } from "@nestjs/common";
import { ScheduleService, hasOverlap } from "../../src/modules/academic/schedule.service";
import { AcademicYearGuard } from "../../src/modules/academic/academic-year.guard";
import { ArchivedYearException } from "../../src/modules/academic/academic-year.guard";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

const CLASS = {
  id: "cls-1",
  name: "X IPA 1",
  grade_level: 10,
  academic_year_id: "year-1",
  homeroom_teacher_id: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  academic_year: { id: "year-1", code: "2026/2027", status: "OPEN" }
};

describe("ScheduleService", () => {
  let db: MockDb;
  let service: ScheduleService;

  beforeEach(() => {
    db = createMockDb();
    service = new ScheduleService(db, new AcademicYearGuard(db));
    mockFn(db, "class", "findUnique").mockResolvedValue(CLASS);
    mockFn(db, "academicYear", "findUnique").mockResolvedValue({
      id: "year-1",
      code: "2026/2027",
      status: "OPEN"
    });
    mockFn(db, "user", "findUnique").mockResolvedValue({ id: "user-teacher", full_name: "Guru" });
    mockFn(db, "subject", "findUnique").mockResolvedValue({
      id: "subj-1",
      code: "MAT",
      name: "Matematika"
    });
  });

  describe("hasOverlap", () => {
    it("mendeteksi tumpang tindih periode", () => {
      expect(hasOverlap(1, 2, 2, 3)).toBe(true);
      expect(hasOverlap(1, 2, 3, 4)).toBe(false);
      expect(hasOverlap(3, 4, 1, 2)).toBe(false);
    });
  });

  it("menolak bentrok guru pada hari+jam yang sama -> 409", async () => {
    mockFn(db, "scheduleEntry", "findMany").mockResolvedValue([
      {
        id: "sch-lain",
        teacher_id: "user-teacher",
        day_of_week: 1,
        start_period: 1,
        end_period: 2,
        room: "A1",
        academic_year: "2026/2027"
      }
    ]);
    await expect(
      service.create({
        class_id: "cls-1",
        subject_id: "subj-1",
        teacher_id: "user-teacher",
        day_of_week: 1,
        start_period: 2,
        end_period: 3
      })
    ).rejects.toThrow(ConflictException);
  });

  it("menolak bentrok ruang pada hari+jam yang sama -> 409", async () => {
    mockFn(db, "scheduleEntry", "findMany").mockResolvedValue([
      {
        id: "sch-lain",
        teacher_id: "guru-2",
        day_of_week: 1,
        start_period: 1,
        end_period: 2,
        room: "LAB-FIS",
        academic_year: "2026/2027"
      }
    ]);
    await expect(
      service.create({
        class_id: "cls-1",
        subject_id: "subj-1",
        teacher_id: "user-teacher",
        day_of_week: 1,
        start_period: 1,
        end_period: 2,
        room: "LAB-FIS"
      })
    ).rejects.toThrow(ConflictException);
  });

  it("menolak tulis ke kelas tahun CLOSED -> ARCHIVED_YEAR", async () => {
    mockFn(db, "class", "findUnique").mockResolvedValue({
      ...CLASS,
      academic_year: { id: "year-1", code: "2025/2026", status: "CLOSED" }
    });
    mockFn(db, "academicYear", "findUnique").mockResolvedValue({
      id: "year-1",
      code: "2025/2026",
      status: "CLOSED"
    });
    await expect(
      service.create({
        class_id: "cls-1",
        subject_id: "subj-1",
        teacher_id: "user-teacher",
        day_of_week: 1,
        start_period: 1,
        end_period: 2
      })
    ).rejects.toThrow(ArchivedYearException);
  });

  it("membuat jadwal valid", async () => {
    mockFn(db, "scheduleEntry", "findMany").mockResolvedValue([]);
    mockFn(db, "scheduleEntry", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "sch-1", ...data })
    );
    const entry = await service.create({
      class_id: "cls-1",
      subject_id: "subj-1",
      teacher_id: "user-teacher",
      day_of_week: 1,
      start_period: 3,
      end_period: 4,
      room: "A1"
    });
    expect(entry.academic_year).toBe("2026/2027");
  });
});
