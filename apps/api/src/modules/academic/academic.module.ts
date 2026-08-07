import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { DATABASE_CLIENT } from "../database/database.constants";
import { AcademicYearGuard } from "./academic-year.guard";
import { CurriculumController } from "./curriculum.controller";
import { CurriculumService } from "./curriculum.service";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { ProdiController } from "./prodi.controller";
import { ProdiService } from "./prodi.service";

@Module({
  controllers: [ScheduleController, CurriculumController, ProdiController],
  providers: [
    ScheduleService,
    CurriculumService,
    ProdiService,
    AcademicYearGuard,
    { provide: DATABASE_CLIENT, useFactory: () => new PrismaClient() }
  ],
  exports: [ScheduleService, CurriculumService, ProdiService, AcademicYearGuard]
})
export class AcademicModule {}
