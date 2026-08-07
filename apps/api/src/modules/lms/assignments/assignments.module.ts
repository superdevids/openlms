import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { AssignmentsService } from "./assignments.service";
import { SubmissionsService } from "./submissions.service";
import { AssignmentsController, SubmissionsController } from "./assignments.controller";

@Module({
  imports: [StorageModule],
  controllers: [AssignmentsController, SubmissionsController],
  providers: [AssignmentsService, SubmissionsService],
  exports: [AssignmentsService, SubmissionsService]
})
export class AssignmentsModule {}
