import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeAuthService } from "./realtime.auth";

/**
 * RealtimeModule — Socket.IO gateway namespace `/ws` (docs/02 §4.1).
 * Export RealtimeGateway agar modul domain bisa emit (emitToUser/emitToClass/emitToExam).
 */
@Module({
  providers: [RealtimeGateway, RealtimeAuthService],
  exports: [RealtimeGateway, RealtimeAuthService]
})
export class RealtimeModule {}
