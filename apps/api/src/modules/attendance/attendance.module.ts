import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@openlms/database";
import { RealtimeModule } from "../realtime/realtime.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceRekapService } from "./attendance-rekap.service";
import { AttendanceService } from "./attendance.service";

/**
 * AttendanceModule — absensi manual + QR + izin + rekap.
 * RealtimeModule di-import untuk sinyal check-in live (attendance:checked-in).
 */
@Module({
  imports: [RealtimeModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceRekapService,
    { provide: PrismaClient, useValue: prisma }
  ],
  exports: [AttendanceService]
})
export class AttendanceModule {}
