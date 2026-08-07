import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@openlms/database";
import { AttendanceController } from "./attendance.controller";
import { AttendanceRekapService } from "./attendance-rekap.service";
import { AttendanceService } from "./attendance.service";

/**
 * AttendanceModule — absensi manual + QR + izin + rekap.
 * CATATAN REGISTRASI: module ini BELUM didaftarkan di AppModule (di luar scope tugas
 * untuk mengubah app.module.ts). Tambahkan `AttendanceModule` ke imports AppModule
 * saat wiring (lihat README.registration.md).
 */
@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceRekapService,
    { provide: PrismaClient, useValue: prisma }
  ],
  exports: [AttendanceService]
})
export class AttendanceModule {}
