/**
 * Unit test — AttendanceService: scope RBAC (scan SISWA diikat actor;
 * GURU dibatasi kelas; rekap SISWA hanya data sendiri, GURU hanya kelasnya).
 */
import { ForbiddenException } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import { AttendanceService } from "../../src/modules/attendance/attendance.service";
import { AttendanceRekapService } from "../../src/modules/attendance/attendance-rekap.service";
import type { RealtimeGateway } from "../../src/modules/realtime/realtime.gateway";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

/** Mock RealtimeGateway (3rd ctor arg AttendanceService — dipakai scan QR check-in). */
const realtimeMock = {
  emitToUser: jest.fn(),
  emitToClass: jest.fn()
} as unknown as RealtimeGateway;

describe("AttendanceService — scope RBAC", () => {
  let db: MockDb;
  let rekapService: { computeRekap: jest.Mock; computeDiscipline: jest.Mock };
  let service: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    db = createMockDb();
    rekapService = {
      computeRekap: jest.fn().mockReturnValue({}),
      computeDiscipline: jest.fn().mockReturnValue([])
    };
    service = new AttendanceService(
      db as unknown as PrismaClient,
      rekapService as unknown as AttendanceRekapService,
      realtimeMock
    );
  });

  describe("scan()", () => {
    function tokenRow(overrides: Record<string, unknown> = {}) {
      return {
        id: "t1",
        token: "hash",
        expires_at: new Date(Date.now() + 60_000),
        used_at: null,
        used_by: null,
        attendance_session: {
          id: "s1",
          class_subject_id: null,
          starts_at: new Date(Date.now() - 60_000),
          ends_at: new Date(Date.now() + 60_000),
          method: "QR_CODE"
        },
        ...overrides
      };
    }

    it("SISWA: student_id SELALU actor.userId (client diabaikan, anti-IDOR)", async () => {
      mockFn(db, "attendanceQrToken", "findUnique").mockResolvedValue(tokenRow());
      mockFn(db, "attendanceRecord", "findFirst").mockResolvedValue(null);
      const tx = {
        attendanceQrToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        attendanceRecord: { create: jest.fn().mockResolvedValue({ id: "r1" }) }
      };
      (db as unknown as { $transaction: jest.Mock }).$transaction = jest.fn(
        (cb: (t: unknown) => Promise<unknown>) => cb(tx)
      );

      await service.scan(
        { token: "tok", student_id: "siswa-lain", idempotency_key: "k1" },
        { userId: "siswa-1", roles: ["SISWA"], classIds: [] }
      );

      expect(tx.attendanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ student_id: "siswa-1" })
        })
      );
    });

    it("GURU: sesi kelas di luar scope -> ForbiddenException", async () => {
      mockFn(db, "attendanceQrToken", "findUnique").mockResolvedValue(
        tokenRow({
          attendance_session: {
            id: "s1",
            class_subject_id: "cs-lain",
            starts_at: new Date(Date.now() - 60_000),
            ends_at: new Date(Date.now() + 60_000),
            method: "QR_CODE"
          }
        })
      );

      await expect(
        service.scan(
          { token: "tok", student_id: "siswa-1" },
          { userId: "guru-1", roles: ["GURU"], classIds: ["cs-1"] }
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("rekap()", () => {
    function mockRecords() {
      mockFn(db, "attendance", "findMany").mockResolvedValue([
        { student_id: "siswa-1", status: "HADIR" }
      ]);
    }

    it("SISWA: rekap selalu data sendiri (dto.student_id diabaikan)", async () => {
      mockRecords();
      await service.rekap(
        { student_id: "siswa-lain" },
        { userId: "siswa-1", roles: ["SISWA"], classIds: [] }
      );

      expect(mockFn(db, "attendance", "findMany")).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ student_id: "siswa-1" }) })
      );
    });

    it("GURU: rekap dibatasi ke kelas yang diampu (classIds)", async () => {
      mockRecords();
      await service.rekap(
        { student_id: "siswa-1" },
        { userId: "guru-1", roles: ["GURU"], classIds: ["cs-1", "cs-2"] }
      );

      const where = mockFn(db, "attendance", "findMany").mock.calls[0][0].where;
      expect(where.student_id).toBe("siswa-1");
      expect(where.class_subject_id).toEqual({ in: ["cs-1", "cs-2"] });
    });

    it("role sekolah (KEPSEK): filter mengikuti dto", async () => {
      mockRecords();
      await service.rekap(
        { student_id: "siswa-apa-saja" },
        { userId: "kepsek-1", roles: ["KEPSEK"], classIds: [] }
      );

      const where = mockFn(db, "attendance", "findMany").mock.calls[0][0].where;
      expect(where.student_id).toBe("siswa-apa-saja");
      expect(where.class_subject_id).toBeUndefined();
    });
  });
});
