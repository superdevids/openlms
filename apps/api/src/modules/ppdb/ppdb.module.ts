import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AcademicYearGuard } from "../academic/academic-year.guard";
import { PpdbController } from "./ppdb.controller";
import { PpdbService } from "./ppdb.service";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [PpdbController],
  providers: [PpdbService, AcademicYearGuard],
  exports: [PpdbService]
})
export class PpdbModule {}
