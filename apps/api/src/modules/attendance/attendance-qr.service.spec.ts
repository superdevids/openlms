import { ConflictException, GoneException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@opensis/database";
import type { AttendanceQrToken, AttendanceRecord, AttendanceSession } from "@prisma/client";
import { AttendanceRekapService } from "./attendance-rekap.service";
import { AttendanceService } from "./attendance.service";
import { hashToken } from "./attendance.utils";
import type { ActorContext } from "./current-actor";
import type { RealtimeGateway } from "../realtime/realtime.gateway";

// Flaky saat run-in-band penuh: default jest timeout 5s terlalu ketat -> naikkan ke 10s.
jest.setTimeout(10_000);

/** Mock RealtimeGateway (3rd ctor arg AttendanceService — dipakai scan QR check-in). */
const realtimeMock = {
  emitToUser: jest.fn(),
  emitToClass: jest.fn()
} as unknown as RealtimeGateway;

const ACTOR: ActorContext = { userId: "usr_student1", roles: ["SISWA"], classIds: [] };

interface QrTokenWithSession extends Omit<AttendanceQrToken, "attendance_session_id"> {
  attendance_session_id: string;
  attendance_session: Pick<AttendanceSession, "id" | "starts_at" | "ends_at" | "method">;
}

function makeToken(overrides: Partial<QrTokenWithSession> = {}): QrTokenWithSession {
  const now = Date.now();
  return {
    id: "tok_1",
    attendance_session_id: "sess_1",
    token: hashToken("raw-token-1"),
    expires_at: new Date(now + 7 * 60_000),
    used_at: null,
    used_by: null,
    created_at: new Date(now - 60_000),
    attendance_session: {
      id: "sess_1",
      starts_at: new Date(now - 60_000),
      ends_at: new Date(now + 60 * 60_000),
      method: "QR_CODE"
    },
    ...overrides
  };
}

function makeRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  const now = new Date();
  return {
    id: "rec_1",
    attendance_session_id: "sess_1",
    student_id: "usr_student1",
    recorded_at: now,
    method: "QR_CODE",
    status: "HADIR",
    latitude: null,
    longitude: null,
    idempotency_key: null,
    created_at: now,
    ...overrides
  };
}

function createMockPrisma() {
  const attendanceQrToken = {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn()
  };
  const attendanceRecord = {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  };
  const attendanceSession = { findUnique: jest.fn(), create: jest.fn() };
  const attendance = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn()
  };
  const $transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> => {
    const tx = { attendanceQrToken, attendanceRecord, attendanceSession, attendance };
    return fn(tx);
  });

  const prisma = {
    attendanceQrToken,
    attendanceRecord,
    attendanceSession,
    attendance,
    $transaction
  } as unknown as PrismaClient;

  return {
    prisma,
    mocks: { attendanceQrToken, attendanceRecord, attendanceSession, attendance, $transaction }
  };
}

describe("AttendanceService — scan QR (M-ABSQR-T2/T8)", () => {
  let service: AttendanceService;
  let mocks: ReturnType<typeof createMockPrisma>["mocks"];

  const dto = {
    token: "raw-token-1",
    student_id: "usr_student1"
  };

  beforeEach(() => {
    const mock = createMockPrisma();
    mocks = mock.mocks;
    service = new AttendanceService(mock.prisma, new AttendanceRekapService(), realtimeMock);
    jest.clearAllMocks();
  });

  it("token valid & single-use -> record HADIR dibuat + token ditandai used (atomik)", async () => {
    mocks.attendanceQrToken.findUnique.mockResolvedValue(makeToken());
    mocks.attendanceRecord.findFirst.mockResolvedValue(null);
    mocks.attendanceRecord.create.mockResolvedValue(makeRecord({ id: "rec_new" }));
    mocks.attendanceQrToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.scan(dto, ACTOR);

    expect(result.status).toBe("HADIR");
    expect(result.idempotent).toBe(false);
    // Claim token harus atomik: hanya yang belum dipakai
    expect(mocks.attendanceQrToken.updateMany).toHaveBeenCalledWith({
      where: { id: "tok_1", used_at: null },
      data: { used_at: expect.any(Date), used_by: "usr_student1" }
    });
    expect(mocks.attendanceRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attendance_session_id: "sess_1",
        student_id: "usr_student1",
        status: "HADIR",
        idempotency_key: null
      })
    });
  });

  it("token dipakai oleh siswa LAIN -> 409 (anti-titip, M-ABSQR-T9)", async () => {
    const used = makeToken({ used_at: new Date(), used_by: "usr_other" });
    mocks.attendanceQrToken.findUnique.mockResolvedValue(used);

    await expect(service.scan(dto, ACTOR)).rejects.toBeInstanceOf(ConflictException);
    expect(mocks.attendanceRecord.create).not.toHaveBeenCalled();
  });

  it("token dipakai oleh siswa yang SAMA (retry) -> 200 idempotent", async () => {
    const used = makeToken({ used_at: new Date(), used_by: "usr_student1" });
    const record = makeRecord();
    mocks.attendanceQrToken.findUnique.mockResolvedValue(used);
    mocks.attendanceRecord.findFirst.mockResolvedValue(record);

    const result = await service.scan(dto, ACTOR);

    expect(result.idempotent).toBe(true);
    expect(result.id).toBe("rec_1");
    expect(mocks.attendanceRecord.create).not.toHaveBeenCalled();
  });

  it("token kedaluwarsa -> 410 (validasi waktu SERVER)", async () => {
    const expired = makeToken({ expires_at: new Date(Date.now() - 1000) });
    mocks.attendanceQrToken.findUnique.mockResolvedValue(expired);

    await expect(service.scan(dto, ACTOR)).rejects.toBeInstanceOf(GoneException);
  });

  it("duplikat Idempotency-Key (queue offline) -> 200 dengan record lama, tanpa create", async () => {
    const record = makeRecord({ idempotency_key: "key_abc" });
    mocks.attendanceQrToken.findUnique.mockResolvedValue(makeToken());
    mocks.attendanceRecord.findFirst.mockResolvedValue(record);

    const result = await service.scan({ ...dto, idempotency_key: "key_abc" }, ACTOR);

    expect(result.idempotent).toBe(true);
    expect(mocks.attendanceRecord.create).not.toHaveBeenCalled();
    expect(mocks.attendanceRecord.findFirst).toHaveBeenCalledWith({
      where: { idempotency_key: "key_abc" }
    });
  });

  it("sesi belum aktif (waktu server) -> 409", async () => {
    const token = makeToken({
      attendance_session: {
        id: "sess_1",
        starts_at: new Date(Date.now() + 60_000),
        ends_at: new Date(Date.now() + 3_600_000),
        method: "QR_CODE"
      }
    });
    mocks.attendanceQrToken.findUnique.mockResolvedValue(token);

    await expect(service.scan(dto, ACTOR)).rejects.toBeInstanceOf(ConflictException);
  });

  it("token tidak dikenal -> 404", async () => {
    mocks.attendanceQrToken.findUnique.mockResolvedValue(null);

    await expect(service.scan(dto, ACTOR)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("sudah check-in sesi ini (retry tanpa key) -> 200 idempotent", async () => {
    const record = makeRecord();
    mocks.attendanceQrToken.findUnique.mockResolvedValue(makeToken());
    mocks.attendanceRecord.findFirst.mockResolvedValue(record);

    const result = await service.scan(dto, ACTOR);

    expect(result.idempotent).toBe(true);
    expect(mocks.attendanceRecord.create).not.toHaveBeenCalled();
  });
});
