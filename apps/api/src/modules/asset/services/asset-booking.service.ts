import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AssetBooking, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@opensis/database";
import { AssetStore } from "../asset.store";
import { ASSET_STORE } from "../asset.constants";
import { AssetService } from "./asset.service";
import { resolveActorRole } from "../../lms/lms-audit";

/**
 * AssetBookingService — peminjaman ruang/alat (prd04 §5.G.3, prd02 §4.5).
 * Prisma-backed (model AssetBooking ada). Cek BENTROK jadwal:
 * booking APPROVED/PENDING lain pada aset sama yang tumpang tindih
 * waktu -> ditolak.
 *
 * PERF-04 (race double-booking): book() memakai row lock
 * `SELECT ... FOR UPDATE` pada baris asset dalam SATU transaksi bersama cek
 * bentrok + insert. Dua permintaan simultan untuk aset sama di-serialize:
 * yang kedua menunggu lock, lalu melihat booking PENDING yang baru dibuat
 * pertama dan ditolak. Trade-off vs exclusion constraint btree_gist
 * (CREATE EXTENSION tidak bisa jalan dalam transaksi migrasi Prisma)
 * didokumentasikan di prisma/migrations/20260809000000_audit_fixes.
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

/** Client Prisma atau TransactionClient — keduanya punya assetBooking.findMany. */
type BookingQueryClient = Pick<Prisma.TransactionClient, "assetBooking">;

@Injectable()
export class AssetBookingService {
  constructor(
    private readonly assets: AssetService,
    @Inject(ASSET_STORE) private readonly store: AssetStore
  ) {}

  /** Cek bentrok terhadap booking PENDING/APPROVED lain (murni, tanpa DB). */
  async findConflicts(assetId: string, startAt: Date, endAt: Date): Promise<AssetBooking[]> {
    return this.findConflictsIn(prisma, assetId, startAt, endAt);
  }

  private async findConflictsIn(
    client: BookingQueryClient,
    assetId: string,
    startAt: Date,
    endAt: Date
  ): Promise<AssetBooking[]> {
    if (startAt >= endAt) {
      throw new BadRequestException("startAt harus sebelum endAt");
    }
    const existing = await client.assetBooking.findMany({
      where: {
        asset_id: assetId,
        status: { in: ["PENDING", "APPROVED"] }
      }
    });
    return existing.filter((b) => isTimeOverlap(startAt, endAt, b.start_at, b.end_at));
  }

  async book(input: BookAssetInput, actorRoles: string[] = []): Promise<AssetBooking> {
    const booking = await prisma.$transaction(async (tx) => {
      // PERF-04: lock baris asset (FOR UPDATE) — serialize pemesanan simultan
      // untuk aset yang sama; cek bentrok + insert berada dalam transaksi yang
      // sama sehingga race double-booking tidak terjadi.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM asset WHERE id = ${input.assetId} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new NotFoundException("Aset tidak ditemukan");
      }
      const asset = await this.assets.findById(input.assetId);
      if (asset.status === "RETIRED") {
        throw new BadRequestException("Aset RETIRED tidak bisa dipinjam");
      }
      const conflicts = await this.findConflictsIn(tx, input.assetId, input.startAt, input.endAt);
      if (conflicts.length > 0) {
        throw new BadRequestException(`Bentrok jadwal: ${conflicts.map((c) => c.id).join(", ")}`);
      }
      try {
        return await tx.assetBooking.create({
          data: {
            asset_id: input.assetId,
            booked_by: input.bookedBy,
            start_at: input.startAt,
            end_at: input.endAt,
            purpose: input.purpose,
            status: "PENDING"
          }
        });
      } catch (err) {
        // Exclusion constraint (23P01) / unique P2002 / raw query P2010 →
        // konflik jadwal dijamin DB; jangan bocor detail stack ke client.
        if (this.isConstraintViolation(err)) {
          throw new ConflictException("Slot sudah dibooking");
        }
        throw err;
      }
    });

    await this.store.appendAuditLog({
      actorId: input.bookedBy,
      actorRole: resolveActorRole(actorRoles) ?? null,
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

    // M-04 (race double-approve): SEMUA update approve dijalankan dalam SATU
    // transaksi:
    // 1. Row lock asset (SELECT ... FOR UPDATE) — serialize approve pada aset
    //    yang sama; approve kedua menunggu, lalu melihat booking APPROVED dari
    //    yang pertama → bentrok.
    // 2. Cek bentrok DI DALAM transaksi terhadap booking APPROVED lain (PENDING
    //    lain belum final; jika ia di-approve serentak, ia serialize di lock
    //    yang sama dan akan menolak dirinya sendiri).
    // 3. Klaim atomik updateMany where status=PENDING → APPROVED — dua approve
    //    booking yang SAMA hanya satu yang menang (yang kalah count 0 →
    //    ConflictException).
    const updated = await prisma.$transaction(async (tx) => {
      if (!approved) {
        const claimedReject = await tx.assetBooking.updateMany({
          where: { id, status: "PENDING" },
          data: { status: "REJECTED", approved_by: approvedBy }
        });
        if (claimedReject.count === 0) {
          throw new ConflictException("Booking sudah diproses admin lain");
        }
        const rejected = await tx.assetBooking.findUnique({ where: { id } });
        if (!rejected) throw new NotFoundException("Booking tidak ditemukan");
        return rejected;
      }

      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM asset WHERE id = ${booking.asset_id} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new NotFoundException("Aset tidak ditemukan");
      }
      const existing = await tx.assetBooking.findMany({
        where: { asset_id: booking.asset_id, id: { not: id }, status: "APPROVED" }
      });
      const conflictIds = existing
        .filter((b) => isTimeOverlap(booking.start_at, booking.end_at, b.start_at, b.end_at))
        .map((b) => b.id);
      if (conflictIds.length > 0) {
        throw new BadRequestException(
          `Bentrok jadwal dengan booking APPROVED lain: ${conflictIds.join(", ")}`
        );
      }
      const claimed = await tx.assetBooking.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "APPROVED", approved_by: approvedBy }
      });
      if (claimed.count === 0) {
        throw new ConflictException("Booking sudah diproses admin lain");
      }
      const result = await tx.assetBooking.findUnique({ where: { id } });
      if (!result) throw new NotFoundException("Booking tidak ditemukan");
      return result;
    });
    return updated;
  }

  /** Role staf sekolah pemegang asset:write:school (seed-data/permissions.ts:505,589). */
  private static readonly SCHOOL_STAFF_ROLES: Role[] = [
    "SUPERADMIN",
    "KEPSEK",
    "WAKEPSEK",
    "KAPRODI",
    "OPERATOR",
    "GURU",
    "BK",
    "KEUANGAN",
    "AUDITOR"
  ];

  /**
   * Batalkan booking — hanya pemilik booking (booked_by) atau staf sekolah
   * (role pemegang asset:write:school). Siswa lain tidak boleh membatalkan
   * booking milik orang lain (anti-IDOR).
   */
  async cancel(id: string, cancelledBy: string, actorRoles: Role[]): Promise<AssetBooking> {
    const booking = await prisma.assetBooking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Booking tidak ditemukan");
    }
    const isOwner = booking.booked_by === cancelledBy;
    const isSchoolStaff = actorRoles.some((r) =>
      AssetBookingService.SCHOOL_STAFF_ROLES.includes(r)
    );
    if (!isOwner && !isSchoolStaff) {
      throw new ForbiddenException({
        error: {
          code: "FORBIDDEN",
          message: "Anda tidak berhak membatalkan booking ini"
        }
      });
    }
    if (booking.status === "COMPLETED") {
      throw new BadRequestException("Booking sudah selesai");
    }
    const updated = await prisma.assetBooking.update({
      where: { id },
      data: { status: "CANCELLED" }
    });
    await this.store.appendAuditLog({
      actorId: cancelledBy,
      actorRole: resolveActorRole(actorRoles) ?? null,
      action: "UPDATE",
      entity: "asset_booking",
      entityId: id,
      before: { status: booking.status },
      after: { status: "CANCELLED" },
      note: "booking dibatalkan"
    });
    return updated;
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

  /** Deteksi error constraint DB: exclusion (SQLSTATE 23P01) / Prisma P2002 / P2010. */
  private isConstraintViolation(err: unknown): boolean {
    const e = err as { code?: string; cause?: { code?: string } | undefined } | undefined;
    if (!e) return false;
    if (e.code === "P2002" || e.code === "P2010" || e.code === "23P01") return true;
    // Prisma membungkus error driver di `cause` untuk beberapa kode (mis. P2010).
    const causeCode = e.cause?.code;
    return causeCode === "23P01" || causeCode === "P2002";
  }
}
