import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PayrollStore } from "../payroll.store";
import { PayslipRecord } from "../payroll.types";
import { PAYROLL_STORE } from "../payroll.constants";

/**
 * PayslipService — slip gaji digital (prd04 §5.E.4).
 * Slip diterbitkan saat run -> PAID; snapshot per versi/riwayat.
 * Scope akses (payslip:read:self vs payroll:read:school):
 * - Staff sekolah (KEPSEK/KEUANGAN/SUPERADMIN — payroll:read:school): bebas.
 * - Selain itu (payslip:read:self): staffId di-resolve dari actor
 *   (Staff.user_id); akses staffId lain → ForbiddenException (anti-IDOR).
 */
@Injectable()
export class PayslipService {
  /** Role dengan payroll:read:school (seed-data/permissions.ts). */
  private static readonly SCHOOL_READ_ROLES = new Set(["SUPERADMIN", "KEPSEK", "KEUANGAN"]);

  constructor(
    @Inject(PAYROLL_STORE) private readonly store: PayrollStore,
    @Inject(PrismaClient) private readonly prisma: PrismaClient
  ) {}

  /** Slip untuk pegawai sendiri (scope payslip:read:self) / bebas untuk staff sekolah. */
  async myPayslips(staffId: string, actor: PayslipActor): Promise<PayslipRecord[]> {
    const allowedStaffId = await this.resolveAllowedStaffId(staffId, actor);
    return this.store.listPayslips(allowedStaffId);
  }

  /** Detail slip (KEUANGAN / pegawai bersangkutan). */
  async get(id: string, actor: PayslipActor): Promise<PayslipRecord> {
    const payslip = await this.store.getPayslip(id);
    if (!payslip) {
      throw new NotFoundException("Payslip tidak ditemukan");
    }
    if (!this.isSchoolScope(actor)) {
      const selfStaffId = await this.resolveStaffIdFromUser(actor.userId);
      if (!selfStaffId || payslip.staffId !== selfStaffId) {
        throw new ForbiddenException("Akses ditolak: slip gaji di luar scope");
      }
    }
    return payslip;
  }

  private async resolveAllowedStaffId(requested: string, actor: PayslipActor): Promise<string> {
    if (this.isSchoolScope(actor)) return requested;
    const selfStaffId = await this.resolveStaffIdFromUser(actor.userId);
    if (!selfStaffId || requested !== selfStaffId) {
      throw new ForbiddenException("Akses ditolak: slip gaji di luar scope");
    }
    return requested;
  }

  private isSchoolScope(actor: PayslipActor): boolean {
    return actor.roles.some((r) => PayslipService.SCHOOL_READ_ROLES.has(r));
  }

  /** Resolve Staff.id dari user terautentikasi (relasi Staff.user_id). */
  private async resolveStaffIdFromUser(userId: string): Promise<string | null> {
    const staff = await this.prisma.staff.findFirst({
      where: { user_id: userId },
      select: { id: true }
    });
    return staff?.id ?? null;
  }
}

export interface PayslipActor {
  userId: string;
  roles: string[];
}
