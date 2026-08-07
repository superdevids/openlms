/**
 * Unit test — InternshipService: scope bimbingan pembimbing industri (SMK).
 */
import "reflect-metadata";
import { ForbiddenException } from "@nestjs/common";
import { InternshipService } from "../../src/modules/smk/internship.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

function internship(overrides: Record<string, unknown> = {}) {
  return {
    id: "intern-1",
    student_id: "stu-1",
    partner_id: "partner-1",
    academic_year_id: "year-1",
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-03-31"),
    school_mentor_id: "mentor-sekolah-1",
    industry_mentor_id: "mentor-industri-1",
    status: "ONGOING",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

describe("InternshipService — scope bimbingan", () => {
  let db: MockDb;
  let service: InternshipService;

  beforeEach(() => {
    db = createMockDb();
    service = new InternshipService(db);
  });

  it("pembimbing industri berhak verifikasi jurnal siswa bimbingannya", async () => {
    mockFn(db, "internshipJournal", "findUnique").mockResolvedValue({
      id: "journal-1",
      internship: {
        ...internship(),
        school_mentor: { user_id: "mentor-sekolah-user" },
        industry_mentor: { user_id: "mentor-industri-user" }
      }
    });
    mockFn(db, "internshipJournal", "update").mockResolvedValue({
      id: "journal-1",
      verified_by_mentor: true
    });
    const journal = await service.verifyJournal("journal-1", "mentor-industri-user");
    expect(journal.verified_by_mentor).toBe(true);
  });

  it("user yang bukan pembimbing ditolak -> 403", async () => {
    mockFn(db, "internshipJournal", "findUnique").mockResolvedValue({
      id: "journal-1",
      internship: {
        ...internship(),
        school_mentor: { user_id: "mentor-sekolah-user" },
        industry_mentor: { user_id: "mentor-industri-user" }
      }
    });
    await expect(service.verifyJournal("journal-1", "orang-luar")).rejects.toThrow(
      ForbiddenException
    );
  });

  it("pembimbing industri berhak menutup PKL (COMPLETED)", async () => {
    mockFn(db, "internship", "findUnique").mockResolvedValue({
      ...internship(),
      school_mentor: { user_id: null },
      industry_mentor: { user_id: "mentor-industri-user" }
    });
    mockFn(db, "internship", "update").mockResolvedValue(internship({ status: "COMPLETED" }));
    const done = await service.complete("intern-1", "mentor-industri-user");
    expect(done.status).toBe("COMPLETED");
  });

  it("listByMentor mencari bimbingan sekolah ATAU industri", async () => {
    mockFn(db, "internship", "findMany").mockResolvedValue([internship()]);
    await service.listByMentor("mentor-industri-user");
    const where = mockFn(db, "internship", "findMany").mock.calls[0][0].where;
    expect(where.OR).toHaveLength(2);
  });
});
