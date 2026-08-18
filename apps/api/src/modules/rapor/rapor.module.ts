import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module";
import { RaporService } from "./rapor.service";
import { RaporController } from "./rapor.controller";

@Module({
  imports: [QueueModule],
  controllers: [RaporController],
  providers: [RaporService],
  exports: [RaporService]
})
export class RaporModule {}
