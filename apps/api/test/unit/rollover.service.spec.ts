/**
 * Unit test — RolloverService (05 M-ROLLOVER-T4/T5/T6).
 * 1. dry-run vs execute konsisten (rencana identik -> sukses; berubah -> 409).
 * 2. rollback pristine (tanpa intrusi AuditLog -> sukses; ada intrusi -> 403).
 * 3. draft menolak tahun sumber CLOSED (guard arsip).
 */
import "reflect-metadata";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { RolloverService } from "../../src/modules/rollover/rollover.service";
import { ArchivedYearException } from "../../src/modules/academic/academic-year.guard";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";
import type { AcademicYear, Enrollment, RolloverRun } from "@prisma/client";

const SOURCE_YEAR: AcademicYear = {
  id: "year-2025",
  code: "2025/2026",
  name: "Tahun 2025/2026",
  start_date: new Date("2025-07-01"),
  end_date: new Date("2026-06-30"),
  status: "OPEN",
  created_by: "user-admin",
  created_at: new Date("2025-01-01"),
  updated_at: new Date("2025-01-01")
};

const TARGET_YEAR: AcademicYear = {
  ...SOURCE_YEAR,
  id: "year-2026",
  code: "2026/2027",
  name: "Tahun 2026/2027",
  status: "DRAFT"
};

const ENROLLMENT: Enrollment = {
  id: "enroll-1",
  student_id: "stu-1",
  class_id: "cls-10",
  academic_year_id: "year-2025",
  status: "ACTIVE",
  created_at: new Date(),
  updated_at: new Date()
};

interface RunOverrides {
  status?: RolloverRun["status"];
  stepState?: unknown;
  executedAt?: Date | null;
}

function makeRun(overrides: RunOverrides = {}): RolloverRun {
  return {
    id: "run-1",
    academic_year_id: "year-2025",
    new_academic_year_id: "year-2026",
    status: overrides.status ?? "PREVIEW",
    precheck_result: null,
    summary: null,
    step_state: (overrides.stepState ?? {}) as never,
    executed_by: null,
    executed_at: overrides.executedAt ?? null,
    rolled_back_by: null,
    rolled_back_at: null,
    rollback_reason: null,
    idempotency_key: "rollover:2025/2026:2026/2027",
    created_at: new Date(),
    updated_at: new Date()
  };
}

function preferences(extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    preferences: {
      passingScore: 60,
      minAttendanceRate: 0.75,
      overrides: {},
      backup: { confirmed: true }
    },
    steps: {},
    ...extra
  };
}

describe("RolloverService", () => {
  let db: MockDb;
  let service: RolloverService;
  /** stateful run agar dryRun -> execute saling melihat step_state. */
  let run: RolloverRun;

  function setupDbState(): void {
    db = createMockDb();
    service = new RolloverService(db);

    mockFn(db, "academicYear", "findUnique").mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        where.id === "year-2025" ? SOURCE_YEAR : TARGET_YEAR
    );
    mockFn(db, "rolloverRun", "findUnique").mockImplementation(async () => run);
    mockFn(db, "rolloverRun", "updateMany").mockResolvedValue({ count: 1 });
    mockFn(db, "rolloverRun", "update").mockImplementation(
      async ({ data }: { data: Partial<RolloverRun> }) => {
        run = { ...run, ...data };
        return run;
      }
    );
    mockFn(db, "enrollment", "findMany").mockResolvedValue([ENROLLMENT]);
    mockFn(db, "grade", "findMany").mockResolvedValue([
      {
        id: "g1",
        student_id: "stu-1",
        class_subject_id: "cs1",
        semester: "GANJIL",
        academic_year: "2025/2026",
        type: "SUMATIF",
        source_id: null,
        score: 80,
        weight: 1,
        note: null,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: "g2",
        student_id: "stu-1",
        class_subject_id: "cs2",
        semester: "GANJIL",
        academic_year: "2025/2026",
        type: "SUMATIF",
        source_id: null,
        score: 70,
        weight: 1,
        note: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    mockFn(db, "attendance", "count").mockResolvedValue(190);
    mockFn(db, "auditLog", "create").mockResolvedValue({ id: "log-1" });
    mockFn(db, "academicYear", "update").mockResolvedValue(SOURCE_YEAR);
    mockFn(db, "class", "create").mockImplementation(
      async ({ data }: { data: { name: string } }) => ({
        id: "new-class",
        name: data.name,
        grade_level: 11,
        academic_year_id: "year-2026",
        homeroom_teacher_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
    );
    mockFn(db, "classSubject", "findMany").mockResolvedValue([]);
    mockFn(db, "scheduleEntry", "findMany").mockResolvedValue([]);
    mockFn(db, "classSubject", "create").mockResolvedValue({ id: "cs-new" });
    mockFn(db, "scheduleEntry", "create").mockResolvedValue({ id: "sch-new" });
    mockFn(db, "alumni", "create").mockResolvedValue({ id: "alumni-1" });
    mockFn(db, "enrollment", "findFirst").mockResolvedValue(ENROLLMENT);
    mockFn(db, "enrollment", "update").mockResolvedValue(ENROLLMENT);
    mockFn(db, "enrollment", "create").mockResolvedValue({ ...ENROLLMENT, id: "enroll-new" });
    mockFn(db, "dataExportLog", "create").mockResolvedValue({ id: "export-1" });
    mockFn(db, "userRole", "findFirst").mockResolvedValue(null);
    mockFn(db, "userRole", "findMany").mockResolvedValue([{ role: "SUPERADMIN" }]);
    mockFn(db, "userRole", "create").mockResolvedValue({ id: "role-1" });
    mockFn(db, "ppdbApplicant", "findMany").mockResolvedValue([]);
    mockFn(db, "schoolProfile", "updateMany").mockResolvedValue({ count: 1 });
    mockFn(db, "schoolProfile", "findFirst").mockResolvedValue({
      current_academic_year_id: "year-2025"
    });
  }

  describe("dry-run vs execute konsisten (T4/T5)", () => {
    beforeEach(() => {
      run = makeRun({ status: "PREVIEW", stepState: preferences() });
      setupDbState();
    });

    it("execute sukses bila rencana sama dengan dry-run; enrollment baru dibuat", async () => {
      await service.dryRun("run-1");
      const result = await service.execute("run-1", "user-admin");

      expect(result.status).toBe("DONE");
      expect(mockFn(db, "enrollment", "create")).toHaveBeenCalledTimes(1);
      expect(mockFn(db, "alumni", "create")).not.toHaveBeenCalled();
      const summary = result.summary as { counts: Record<string, number> };
      expect(summary.counts.PROMOTED).toBe(1);
    });

    it("execute menolak bila data berubah setelah dry-run (plan mismatch) -> 409", async () => {
      // dry-run dengan satu siswa (PROMOTED)
      await service.dryRun("run-1");
      // data berubah: siswa sekarang tanpa nilai -> rencana jadi REPEATED
      mockFn(db, "grade", "findMany").mockResolvedValue([]);
      await expect(service.execute("run-1", "user-admin")).rejects.toThrow(ConflictException);
    });

    it("execute menolak bila claim atomik gagal (count 0) -> 409 tanpa menimpa status", async () => {
      await service.dryRun("run-1");
      // Simulasi run sudah diklaim executor lain (mis. status RUNNING/status berubah):
      // updateMany kondisional tidak mengubah baris -> count 0.
      mockFn(db, "rolloverRun", "updateMany").mockResolvedValue({ count: 0 });
      await expect(service.execute("run-1", "user-admin")).rejects.toThrow(ConflictException);
      // Jangan menulis FAILED di atas status milik executor lain.
      expect(mockFn(db, "rolloverRun", "update")).not.toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "FAILED" })
      });
    });
  });

  describe("rollback pristine (T6)", () => {
    beforeEach(() => {
      run = makeRun({
        status: "DONE",
        executedAt: new Date(),
        stepState: {
          preferences: preferences(),
          created: {
            classIdByKey: { "cls-10:11:0": "new-class" },
            enrollmentIds: ["enroll-new"],
            alumniIds: ["alumni-1"],
            previousEnrollmentStatus: { "enroll-1": "ACTIVE" },
            previousSourceStatus: "OPEN",
            previousSchoolProfileYearId: "year-2025",
            ppdbEnrolledIds: []
          }
        }
      });
      setupDbState();
      mockFn(db, "auditLog", "findMany").mockResolvedValue([]);
      mockFn(db, "enrollment", "deleteMany").mockResolvedValue({ count: 1 });
      mockFn(db, "class", "deleteMany").mockResolvedValue({ count: 1 });
      mockFn(db, "alumni", "deleteMany").mockResolvedValue({ count: 1 });
    });

    it("rollback sukses bila keadaan pristine (tanpa audit log intrusi)", async () => {
      const result = await service.rollback("run-1", "user-admin", "kesalahan data");

      expect(result.status).toBe("ROLLED_BACK");
      expect(mockFn(db, "enrollment", "deleteMany")).toHaveBeenCalledWith({
        where: { id: { in: ["enroll-new"] } }
      });
      expect(mockFn(db, "academicYear", "update")).toHaveBeenCalledWith({
        where: { id: "year-2025" },
        data: { status: "OPEN" }
      });
    });

    it("rollback ditolak bila ada intrusi (data berubah setelah execute) -> 403", async () => {
      mockFn(db, "auditLog", "findMany").mockResolvedValue([
        { id: "log-intrusi", entity: "Enrollment", created_at: new Date() }
      ]);
      await expect(service.rollback("run-1", "user-admin")).rejects.toThrow(ForbiddenException);
    });

    it("rollback ditolak bila jendela 7 hari lewat -> 403", async () => {
      run = makeRun({
        status: "DONE",
        executedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        stepState: { created: undefined }
      });
      mockFn(db, "rolloverRun", "findUnique").mockImplementation(async () => run);
      await expect(service.rollback("run-1", "user-admin")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("draft — guard arsip (ARCHIVED_YEAR)", () => {
    it("menolak draft bila tahun sumber CLOSED -> ARCHIVED_YEAR", async () => {
      db = createMockDb();
      service = new RolloverService(db);
      mockFn(db, "academicYear", "findUnique").mockResolvedValue({
        ...SOURCE_YEAR,
        status: "CLOSED"
      });

      await expect(
        service.draft("user-admin", {
          sourceYearId: "year-2025",
          newYearCode: "2026/2027",
          newYearName: "Tahun 2026/2027",
          startDate: "2026-07-01",
          endDate: "2027-06-30",
          backup: { confirmed: true }
        })
      ).rejects.toThrow(ArchivedYearException);
    });

    it("menolak draft bila tahun sumber bukan OPEN", async () => {
      db = createMockDb();
      service = new RolloverService(db);
      mockFn(db, "academicYear", "findUnique").mockResolvedValue({
        ...SOURCE_YEAR,
        status: "DRAFT"
      });

      await expect(
        service.draft("user-admin", {
          sourceYearId: "year-2025",
          newYearCode: "2026/2027",
          newYearName: "Tahun 2026/2027",
          startDate: "2026-07-01",
          endDate: "2027-06-30"
        })
      ).rejects.toThrow(ConflictException);
    });
  });
});
