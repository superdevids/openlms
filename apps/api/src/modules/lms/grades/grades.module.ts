import { Module } from "@nestjs/common";
import { NotificationsModule } from "../../notifications/notifications.module";
import { RealtimeModule } from "../../realtime/realtime.module";
import { GradesService } from "./grades.service";
import { GradeExportService } from "./grade-export.service";
import { GradesController } from "./grades.controller";

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [GradesController],
  providers: [GradesService, GradeExportService],
  exports: [GradesService]
})
export class GradesModule {}
