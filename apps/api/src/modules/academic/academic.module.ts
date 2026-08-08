import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { AcademicYearGuard } from "./academic-year.guard";
import { CurriculumController } from "./curriculum.controller";
import { CurriculumService } from "./curriculum.service";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { ProdiController } from "./prodi.controller";
import { ProdiService } from "./prodi.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ScheduleController, CurriculumController, ProdiController],
  providers: [ScheduleService, CurriculumService, ProdiService, AcademicYearGuard],
  exports: [ScheduleService, CurriculumService, ProdiService, AcademicYearGuard]
})
export class AcademicModule {}
