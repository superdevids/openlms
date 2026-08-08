import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { NotificationsModule } from "../../notifications/notifications.module";
import { RealtimeModule } from "../../realtime/realtime.module";
import { AssignmentsService } from "./assignments.service";
import { SubmissionsService } from "./submissions.service";
import { AssignmentsController, SubmissionsController } from "./assignments.controller";

@Module({
  imports: [StorageModule, NotificationsModule, RealtimeModule],
  controllers: [AssignmentsController, SubmissionsController],
  providers: [AssignmentsService, SubmissionsService],
  exports: [AssignmentsService, SubmissionsService]
})
export class AssignmentsModule {}
