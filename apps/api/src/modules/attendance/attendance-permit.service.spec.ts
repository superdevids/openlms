import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import type { PrismaClient } from "@openlms/database";
import type { Attendance } from "@prisma/client";
import { AttendanceRekapService } from "./attendance-rekap.service";
import { AttendanceService } from "./attendance.service";
import type { ActorContext } from "./current-actor";
import type { RealtimeGateway } from "../realtime/realtime.gateway";

/** Mock RealtimeGateway (3rd ctor arg AttendanceService — dipakai scan QR check-in). */
const realtimeMock = {
  emitToUser: jest.fn(),
  emitToClass: jest.fn()
} as unknown as RealtimeGateway;

const STUDENT: ActorContext = { userId: "usr_student1", roles: ["SISWA"], classIds: [] };
const BK: ActorContext = { userId: "usr_bk", roles: ["GURU_BK"], classIds: [] };

const PERMIT_NOTE = {
  kind: "permit",
  type: "IZIN",
  reason: "Acara keluarga",
  attachmentPath: "permits/surat.jpg",
  status: "PENDING"
} as const;

function makeAttendance(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: "att_1",
    class_subject_id: null,
    student_id: "usr_student1",
    recorded_by: "usr_student1",
    date: new Date("2026-08-07T00:00:00.000Z"),
    status: "IZIN",
    note: JSON.stringify(PERMIT_NOTE),
    method: "MANUAL",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

function createMockPrisma() {
  const attendance = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn()
  };
  const prisma = { attendance } as unknown as PrismaClient;
  return { prisma, mocks: { attendance } };
}

describe("AttendanceService — izin/sakit online (M-ABSQR-T7)", () => {
  let service: AttendanceService;
  let mocks: ReturnType<typeof createMockPrisma>["mocks"];

  beforeEach(() => {
    const mock = createMockPrisma();
    mocks = mock.mocks;
    service = new AttendanceService(mock.prisma, new AttendanceRekapService(), realtimeMock);
    jest.clearAllMocks();
  });

  it("request izin membuat record status IZIN dengan note PENDING + path surat", async () => {
    mocks.attendance.findFirst.mockResolvedValue(null);
    mocks.attendance.create.mockResolvedValue(makeAttendance());

    const result = await service.requestPermit(
      {
        student_id: "usr_student1",
        date: "2026-08-07",
        type: "IZIN",
        reason: "Acara keluarga",
        attachment_path: "permits/surat.jpg"
      },
      STUDENT
    );

    expect(result.note).toMatchObject({
      kind: "permit",
      type: "IZIN",
      status: "PENDING",
      reason: "Acara keluarga",
      attachmentPath: "permits/surat.jpg"
    });
    expect(mocks.attendance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        student_id: "usr_student1",
        status: "IZIN",
        method: "MANUAL",
        recorded_by: "usr_student1"
      })
    });
  });

  it("duplikat pengajuan PENDING -> 409", async () => {
    mocks.attendance.findFirst.mockResolvedValue(makeAttendance());

    await expect(
      service.requestPermit(
        { student_id: "usr_student1", date: "2026-08-07", type: "IZIN", reason: "x" },
        STUDENT
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("verifikasi approve -> status IZIN, note APPROVED (homeroom/GURU_BK)", async () => {
    mocks.attendance.findUnique.mockResolvedValue(makeAttendance());
    mocks.attendance.update.mockResolvedValue({
      ...makeAttendance(),
      status: "IZIN",
      note: JSON.stringify({ ...PERMIT_NOTE, status: "APPROVED" })
    });

    const result = await service.verifyPermit("att_1", { approved: true }, BK);

    expect(result.note.status).toBe("APPROVED");
    expect(result.note.verifiedBy).toBe("usr_bk");
    expect(mocks.attendance.update).toHaveBeenCalledWith({
      where: { id: "att_1" },
      data: expect.objectContaining({ status: "IZIN" })
    });
  });

  it("verifikasi reject -> status ALPA", async () => {
    mocks.attendance.findUnique.mockResolvedValue(makeAttendance());
    mocks.attendance.update.mockResolvedValue({
      ...makeAttendance(),
      status: "ALPA",
      note: JSON.stringify({ ...PERMIT_NOTE, status: "REJECTED" })
    });

    const result = await service.verifyPermit(
      "att_1",
      { approved: false, reason: "Surat tidak valid" },
      BK
    );

    expect(result.note.status).toBe("REJECTED");
    expect(result.note.rejectReason).toBe("Surat tidak valid");
    expect(mocks.attendance.update).toHaveBeenCalledWith({
      where: { id: "att_1" },
      data: expect.objectContaining({ status: "ALPA" })
    });
  });

  it("bukan role verifikator (SISWA) -> 403", async () => {
    await expect(service.verifyPermit("att_1", { approved: true }, STUDENT)).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(mocks.attendance.findUnique).not.toHaveBeenCalled();
  });

  it("record tanpa note permit -> 400", async () => {
    mocks.attendance.findUnique.mockResolvedValue(makeAttendance({ note: "catatan biasa" }));

    await expect(service.verifyPermit("att_1", { approved: true }, BK)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("pengajuan tidak ditemukan -> 404", async () => {
    mocks.attendance.findUnique.mockResolvedValue(null);

    await expect(service.verifyPermit("att_1", { approved: true }, BK)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
