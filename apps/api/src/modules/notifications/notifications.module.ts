import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationService } from "./notifications.service";

/**
 * NotificationsModule — pusat notifikasi (docs/02 §4.1, prd04 §5.M).
 * Export NotificationService untuk dipakai modul domain lain (tugas, ujian, absensi,
 * keuangan, pengumuman, dsb.). Import RealtimeModule agar push Socket.IO tersedia.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService]
})
export class NotificationsModule {}
