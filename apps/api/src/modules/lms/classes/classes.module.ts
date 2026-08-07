import { Module } from "@nestjs/common";
import { ClassesService } from "./classes.service";
import { SubjectsService } from "./subjects.service";
import { ClassSubjectsService } from "./class-subjects.service";
import { EnrollmentsService } from "./enrollments.service";
import { SchedulesService } from "./schedules.service";
import {
  ClassSubjectsController,
  ClassesController,
  EnrollmentsController,
  SchedulesController,
  SubjectsController
} from "./classes.controller";

@Module({
  controllers: [
    ClassesController,
    SubjectsController,
    ClassSubjectsController,
    SchedulesController,
    EnrollmentsController
  ],
  providers: [
    ClassesService,
    SubjectsService,
    ClassSubjectsService,
    EnrollmentsService,
    SchedulesService
  ],
  exports: [ClassesService, SchedulesService]
})
export class ClassesModule {}
