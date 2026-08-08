import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { RolloverController } from "./rollover.controller";
import { RolloverService } from "./rollover.service";

@Module({
  imports: [DatabaseModule],
  controllers: [RolloverController],
  providers: [RolloverService],
  exports: [RolloverService]
})
export class RolloverModule {}
