import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AssetBooking } from "@prisma/client";
import { prisma } from "@opensis/database";
import { AssetStore } from "../asset.store";
import { ASSET_STORE } from "../asset.constants";
import { AssetService } from "./asset.service";

/**
 * AssetBookingService — peminjaman ruang/alat (prd04 §5.G.3, prd02 §4.5).
 * Prisma-backed (model AssetBooking ada). Cek BENTROK jadwal:
 * booking APPROVED/PENDING lain pada aset sama yang tumpang tindih
 * waktu -> ditolak.
 */

/** Bentrok bila startA < endB dan startB < endA. */
export function isTimeOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

export interface BookAssetInput {
  assetId: string;
  bookedBy: string;
  startAt: Date;
  endAt: Date;
  purpose: string;
}

@Injectable()
export class AssetBookingService {
  constructor(
    private readonly assets: AssetService,
    @Inject(ASSET_STORE) private readonly store: AssetStore
  ) {}

  /** Cek bentrok terhadap booking PENDING/APPROVED lain (murni, tanpa DB). */
  async findConflicts(assetId: string, startAt: Date, endAt: Date): Promise<AssetBooking[]> {
    if (startAt >= endAt) {
      throw new BadRequestException("startAt harus sebelum endAt");
    }
    const existing = await prisma.assetBooking.findMany({
      where: {
        asset_id: assetId,
        status: { in: ["PENDING", "APPROVED"] }
      }
    });
    return existing.filter((b) => isTimeOverlap(startAt, endAt, b.start_at, b.end_at));
  }

  async book(input: BookAssetInput): Promise<AssetBooking> {
    const asset = await this.assets.findById(input.assetId);
    if (asset.status === "RETIRED") {
      throw new BadRequestException("Aset RETIRED tidak bisa dipinjam");
    }
    const conflicts = await this.findConflicts(input.assetId, input.startAt, input.endAt);
    if (conflicts.length > 0) {
      throw new BadRequestException(`Bentrok jadwal: ${conflicts.map((c) => c.id).join(", ")}`);
    }
    const booking = await prisma.assetBooking.create({
      data: {
        asset_id: input.assetId,
        booked_by: input.bookedBy,
        start_at: input.startAt,
        end_at: input.endAt,
        purpose: input.purpose,
        status: "PENDING"
      }
    });
    await this.store.appendAuditLog({
      actorId: input.bookedBy,
      actorRole: null,
      action: "CREATE",
      entity: "AssetBooking",
      entityId: booking.id,
      before: {},
      after: {
        assetId: input.assetId,
        startAt: input.startAt.toISOString(),
        endAt: input.endAt.toISOString()
      },
      note: "booking aset"
    });
    return booking;
  }

  async approve(id: string, approved: boolean, approvedBy: string): Promise<AssetBooking> {
    const booking = await prisma.assetBooking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Booking tidak ditemukan");
    }
    if (booking.status !== "PENDING") {
      throw new BadRequestException(`Booking sudah ${booking.status}`);
    }
    if (!approved) {
      return prisma.assetBooking.update({
        where: { id },
        data: { status: "REJECTED", approved_by: approvedBy }
      });
    }
    // Konfirmasi ulang bentrok saat approve (jadwal bisa berubah sejak booking).
    const conflicts = await this.findConflicts(booking.asset_id, booking.start_at, booking.end_at);
    const conflictIds = conflicts.filter((c) => c.id !== id).map((c) => c.id);
    if (conflictIds.length > 0) {
      throw new BadRequestException(
        `Bentrok jadwal dengan booking lain: ${conflictIds.join(", ")}`
      );
    }
    return prisma.assetBooking.update({
      where: { id },
      data: { status: "APPROVED", approved_by: approvedBy }
    });
  }

  async cancel(id: string, _cancelledBy: string): Promise<AssetBooking> {
    const booking = await prisma.assetBooking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Booking tidak ditemukan");
    }
    if (booking.status === "COMPLETED") {
      throw new BadRequestException("Booking sudah selesai");
    }
    return prisma.assetBooking.update({
      where: { id },
      data: { status: "CANCELLED" }
    });
  }

  async complete(id: string): Promise<AssetBooking> {
    const booking = await prisma.assetBooking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Booking tidak ditemukan");
    }
    if (booking.status !== "APPROVED") {
      throw new BadRequestException("Hanya booking APPROVED yang bisa diselesaikan");
    }
    return prisma.assetBooking.update({
      where: { id },
      data: { status: "COMPLETED" }
    });
  }

  async list(assetId?: string): Promise<AssetBooking[]> {
    return prisma.assetBooking.findMany({
      where: assetId ? { asset_id: assetId } : {},
      orderBy: { start_at: "asc" }
    });
  }
}
