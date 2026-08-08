import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeAuthService } from "./realtime.auth";

/**
 * RealtimeModule — Socket.IO gateway namespace `/ws` (docs/02 §4.1).
 * Export RealtimeGateway agar modul domain bisa emit (emitToUser/emitToClass/emitToExam).
 * Redis adapter (R-28): di-attach di RealtimeGateway.afterInit — bila REDIS_URL diset
 * memakai @socket.io/redis-adapter (multi-instance), else adapter in-memory.
 */
@Module({
  providers: [RealtimeGateway, RealtimeAuthService],
  exports: [RealtimeGateway, RealtimeAuthService]
})
export class RealtimeModule {}
