import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { DatabaseClient } from "../database/database.constants";
import { InternshipService } from "./internship.service";
import type { AuditActorContext } from "../lms/lms-audit";

function createMockDb() {
  const internship = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  };
  const internshipJournal = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  };
  const user = { findUnique: jest.fn() };
  const internshipPartner = { findUnique: jest.fn() };
  const academicYear = { findUnique: jest.fn() };
  const db = {
    internship,
    internshipJournal,
    user,
    internshipPartner,
    academicYear
  } as unknown as DatabaseClient;
  return { db, mocks: { internship, internshipJournal, user, internshipPartner, academicYear } };
}

function makeInternship(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "int_1",
    student_id: "usr_siswa",
    partner_id: "partner_1",
    academic_year_id: "year_1",
    start_date: new Date("2026-08-01"),
    end_date: new Date("2026-12-31"),
    school_mentor_id: "usr_guru_mentor",
    industry_mentor_id: null,
    status: "PLACED",
    created_at: new Date(),
    updated_at: new Date(),
    industry_mentor: null,
    ...overrides
  };
}

const ACTOR_SISWA_LAIN: AuditActorContext = { userId: "usr_siswa_lain", roles: ["SISWA"] };
const ACTOR_SISWA_OWNER: AuditActorContext = { userId: "usr_siswa", roles: ["SISWA"] };
const ACTOR_GURU: AuditActorContext = { userId: "usr_guru_1", roles: ["GURU"] };

describe("InternshipService — ownership jurnal (anti-IDOR)", () => {
  let service: InternshipService;
  let mocks: ReturnType<typeof createMockDb>["mocks"];

  beforeEach(() => {
    const mock = createMockDb();
    mocks = mock.mocks;
    service = new InternshipService(mock.db);
    jest.clearAllMocks();
  });

  describe("addJournal", () => {
    const input = { entryDate: "2026-08-10", activity: "Orientasi tempat PKL" };

    it("siswa BUKAN pemilik → ForbiddenException", async () => {
      mocks.internship.findUnique.mockResolvedValue(makeInternship());

      await expect(service.addJournal("int_1", input, ACTOR_SISWA_LAIN)).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(mocks.internshipJournal.create).not.toHaveBeenCalled();
    });

    it("GURU (staf sekolah) → diizinkan", async () => {
      mocks.internship.findUnique.mockResolvedValue(makeInternship());
      mocks.internshipJournal.create.mockResolvedValue({
        id: "jour_1",
        internship_id: "int_1",
        entry_date: new Date("2026-08-10"),
        activity: "Orientasi tempat PKL",
        note: null,
        verified_by_mentor: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      const result = await service.addJournal("int_1", input, ACTOR_GURU);
      expect(result.id).toBe("jour_1");
      expect(mocks.internshipJournal.create).toHaveBeenCalledTimes(1);
    });

    it("siswa pemilik → diizinkan", async () => {
      mocks.internship.findUnique.mockResolvedValue(makeInternship());
      mocks.internshipJournal.create.mockResolvedValue({
        id: "jour_2",
        internship_id: "int_1",
        entry_date: new Date("2026-08-10"),
        activity: "Orientasi tempat PKL",
        note: null,
        verified_by_mentor: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      const result = await service.addJournal("int_1", input, ACTOR_SISWA_OWNER);
      expect(result.id).toBe("jour_2");
    });

    it("PKL tidak ditemukan → NotFoundException (sebelum cek ownership)", async () => {
      mocks.internship.findUnique.mockResolvedValue(null);
      await expect(service.addJournal("int_x", input, ACTOR_GURU)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe("listJournals", () => {
    it("siswa BUKAN pemilik → ForbiddenException, tanpa query jurnal", async () => {
      mocks.internship.findUnique.mockResolvedValue(makeInternship());

      await expect(service.listJournals("int_1", ACTOR_SISWA_LAIN)).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(mocks.internshipJournal.findMany).not.toHaveBeenCalled();
    });

    it("pembimbing industri → diizinkan", async () => {
      mocks.internship.findUnique.mockResolvedValue(
        makeInternship({
          industry_mentor: { user_id: "usr_pembimbing_industri" }
        })
      );
      mocks.internshipJournal.findMany.mockResolvedValue([]);

      const result = await service.listJournals("int_1", {
        userId: "usr_pembimbing_industri",
        roles: ["PEMBIMBING_INDUSTRI"]
      });
      expect(result).toEqual([]);
      expect(mocks.internshipJournal.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("listByStudent (anti-IDOR)", () => {
    it("SISWA meminta studentId lain → dikunci ke dirinya sendiri (query memakai actor.userId)", async () => {
      mocks.internship.findMany.mockResolvedValue([]);

      await service.listByStudent("usr_korban", ACTOR_SISWA_OWNER);

      const where = mocks.internship.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ student_id: "usr_siswa" });
    });

    it("staf sekolah (GURU) boleh filter bebas per siswa", async () => {
      mocks.internship.findMany.mockResolvedValue([]);

      await service.listByStudent("usr_siswa_x", ACTOR_GURU);

      const where = mocks.internship.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ student_id: "usr_siswa_x" });
    });
  });

  describe("verifyJournal & complete — scope pembimbing (dipindah dari test/unit)", () => {
    it("pembimbing industri berhak verifikasi jurnal siswa bimbingannya", async () => {
      mocks.internshipJournal.findUnique.mockResolvedValue({
        id: "journal-1",
        internship: makeInternship({
          school_mentor: { user_id: "usr_guru_mentor" },
          industry_mentor: { user_id: "usr_pembimbing_industri" }
        })
      });
      mocks.internshipJournal.update.mockResolvedValue({
        id: "journal-1",
        verified_by_mentor: true
      });

      const journal = await service.verifyJournal("journal-1", "usr_pembimbing_industri", {
        userId: "usr_pembimbing_industri",
        roles: ["PEMBIMBING_INDUSTRI"]
      });
      expect(journal.verified_by_mentor).toBe(true);
    });

    it("user yang bukan pembimbing ditolak → ForbiddenException", async () => {
      mocks.internshipJournal.findUnique.mockResolvedValue({
        id: "journal-1",
        internship: makeInternship({
          school_mentor: { user_id: "usr_guru_mentor" },
          industry_mentor: { user_id: "usr_pembimbing_industri" }
        })
      });

      await expect(
        service.verifyJournal("journal-1", "orang-luar", {
          userId: "orang-luar",
          roles: ["GURU"]
        })
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("pembimbing industri berhak menutup PKL (COMPLETED)", async () => {
      mocks.internship.findUnique.mockResolvedValue(
        makeInternship({
          school_mentor: { user_id: null },
          industry_mentor: { user_id: "usr_pembimbing_industri" }
        })
      );
      mocks.internship.update.mockResolvedValue(makeInternship({ status: "COMPLETED" }));

      const done = await service.complete("int_1", "usr_pembimbing_industri", {
        userId: "usr_pembimbing_industri",
        roles: ["PEMBIMBING_INDUSTRI"]
      });
      expect(done.status).toBe("COMPLETED");
    });

    it("listByMentor mencari bimbingan sekolah ATAU industri", async () => {
      mocks.internship.findMany.mockResolvedValue([]);

      await service.listByMentor("usr_guru_mentor");

      const where = mocks.internship.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(2);
    });
  });
});
