import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { QueueModule } from "../queue/queue.module";
import { RolloverController } from "./rollover.controller";
import { RolloverService } from "./rollover.service";

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [RolloverController],
  providers: [RolloverService],
  exports: [RolloverService]
})
export class RolloverModule {}
