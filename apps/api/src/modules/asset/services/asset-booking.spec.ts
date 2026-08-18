import { isTimeOverlap } from "./asset-booking.service";

import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

jest.mock("@opensis/database", () => {
  const prisma = {
    assetBooking: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn()
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn()
  };
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});

import { prisma } from "@opensis/database";
import { AssetBookingService } from "./asset-booking.service";
import type { AssetService } from "./asset.service";
import type { AssetStore } from "../asset.store";

const prismaMock = prisma as unknown as {
  assetBooking: {
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    findMany: jest.Mock;
  };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

function makeBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "book_1",
    asset_id: "asset_1",
    booked_by: "usr_owner",
    start_at: new Date("2026-08-10T08:00:00Z"),
    end_at: new Date("2026-08-10T10:00:00Z"),
    purpose: "Peminjaman ruang",
    status: "PENDING",
    approved_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

describe("asset-booking cancel — ownership (anti-IDOR)", () => {
  let service: AssetBookingService;
  const storeMock = { appendAuditLog: jest.fn() } as unknown as AssetStore;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssetBookingService({} as unknown as AssetService, storeMock);
  });

  it("siswa BUKAN pemilik → ForbiddenException, tanpa update", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(makeBooking());

    await expect(service.cancel("book_1", "usr_siswa_lain", ["SISWA"])).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(prismaMock.assetBooking.update).not.toHaveBeenCalled();
  });

  it("pemilik booking → OK (status CANCELLED)", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(makeBooking());
    prismaMock.assetBooking.update.mockResolvedValue(makeBooking({ status: "CANCELLED" }));

    const result = await service.cancel("book_1", "usr_owner", ["SISWA"]);

    expect(result.status).toBe("CANCELLED");
    expect(prismaMock.assetBooking.update).toHaveBeenCalledWith({
      where: { id: "book_1" },
      data: { status: "CANCELLED" }
    });
    expect(storeMock.appendAuditLog).toHaveBeenCalledTimes(1);
  });

  it("staf sekolah (GURU) → OK meski bukan pemilik", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(makeBooking());
    prismaMock.assetBooking.update.mockResolvedValue(makeBooking({ status: "CANCELLED" }));

    const result = await service.cancel("book_1", "usr_guru_1", ["GURU"]);

    expect(result.status).toBe("CANCELLED");
  });

  it("booking tidak ditemukan → NotFoundException", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(null);

    await expect(service.cancel("book_x", "usr_owner", ["SISWA"])).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});

describe("asset-booking — cek bentrok jadwal (prd04 §5.G.3)", () => {
  const aStart = new Date("2026-08-10T08:00:00Z");
  const aEnd = new Date("2026-08-10T10:00:00Z");

  it("jadwal identik -> bentrok", () => {
    expect(isTimeOverlap(aStart, aEnd, aStart, aEnd)).toBe(true);
  });

  it("tumpang tindih sebagian (B mulai di tengah A) -> bentrok", () => {
    const bStart = new Date("2026-08-10T09:00:00Z");
    const bEnd = new Date("2026-08-10T11:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("B tepat setelah A selesai (bersinggungan) -> TIDAK bentrok", () => {
    const bStart = new Date("2026-08-10T10:00:00Z");
    const bEnd = new Date("2026-08-10T12:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  it("B sebelum A -> TIDAK bentrok", () => {
    const bStart = new Date("2026-08-10T06:00:00Z");
    const bEnd = new Date("2026-08-10T08:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  it("A berada di dalam rentang B -> bentrok", () => {
    const bStart = new Date("2026-08-10T07:00:00Z");
    const bEnd = new Date("2026-08-10T11:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("tanggal berbeda -> TIDAK bentrok", () => {
    const bStart = new Date("2026-08-11T08:00:00Z");
    const bEnd = new Date("2026-08-11T10:00:00Z");
    expect(isTimeOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });
});

describe("asset-booking approve — race double-approve (M-04)", () => {
  let service: AssetBookingService;
  const storeMock = { appendAuditLog: jest.fn() } as unknown as AssetStore;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssetBookingService({} as unknown as AssetService, storeMock);
    prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    prismaMock.assetBooking.findMany.mockResolvedValue([]);
    prismaMock.$queryRaw.mockResolvedValue([{ id: "asset_1" }]);
  });

  it("approve OK: klaim atomik updateMany status=PENDING di dalam transaksi", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(makeBooking());
    prismaMock.assetBooking.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.assetBooking.findUnique
      .mockResolvedValueOnce(makeBooking())
      .mockResolvedValueOnce(makeBooking({ status: "APPROVED", approved_by: "admin_1" }));

    const result = await service.approve("book_1", true, "admin_1");

    expect(prismaMock.assetBooking.updateMany).toHaveBeenCalledWith({
      where: { id: "book_1", status: "PENDING" },
      data: { status: "APPROVED", approved_by: "admin_1" }
    });
    expect(result.status).toBe("APPROVED");
  });

  it("dua approve bersamaan: yang kedua dapat count 0 → ConflictException (hanya satu menang)", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(makeBooking());
    prismaMock.assetBooking.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.approve("book_1", true, "admin_2")).rejects.toBeInstanceOf(
      ConflictException
    );
    // Tidak boleh update tanpa klaim status PENDING (perilaku lama).
    expect(prismaMock.assetBooking.update).not.toHaveBeenCalled();
  });

  it("approve bentrok dengan booking APPROVED lain → BadRequest", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(makeBooking());
    prismaMock.assetBooking.findMany.mockResolvedValue([
      makeBooking({ id: "book_9", status: "APPROVED" })
    ]);

    await expect(service.approve("book_1", true, "admin_1")).rejects.toThrow(
      /Bentrok jadwal dengan booking APPROVED lain/
    );
    expect(prismaMock.assetBooking.updateMany).not.toHaveBeenCalled();
  });

  it("reject: klaim atomik PENDING → REJECTED; kalah race → ConflictException", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(makeBooking());
    prismaMock.assetBooking.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.approve("book_1", false, "admin_2")).rejects.toBeInstanceOf(
      ConflictException
    );

    prismaMock.assetBooking.updateMany.mockResolvedValueOnce({ count: 1 });
    await expect(service.approve("book_1", false, "admin_1")).resolves.toBeDefined();
    expect(prismaMock.assetBooking.updateMany).toHaveBeenLastCalledWith({
      where: { id: "book_1", status: "PENDING" },
      data: { status: "REJECTED", approved_by: "admin_1" }
    });
  });

  it("booking sudah APPROVED → 400 (pre-check)", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(
      makeBooking({ status: "APPROVED", approved_by: "x" })
    );
    await expect(service.approve("book_1", true, "admin_1")).rejects.toThrow(
      "Booking sudah APPROVED"
    );
  });

  it("booking tidak ditemukan → 404", async () => {
    prismaMock.assetBooking.findUnique.mockResolvedValue(null);
    await expect(service.approve("book_x", true, "admin_1")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
