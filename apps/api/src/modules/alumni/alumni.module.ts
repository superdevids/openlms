import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { AlumniController } from "./alumni.controller";
import { AlumniService } from "./alumni.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AlumniController],
  providers: [AlumniService],
  exports: [AlumniService]
})
export class AlumniModule {}
