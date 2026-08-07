import { Module } from "@nestjs/common";
import { GradesService } from "./grades.service";
import { GradeExportService } from "./grade-export.service";
import { GradesController } from "./grades.controller";

@Module({
  controllers: [GradesController],
  providers: [GradesService, GradeExportService],
  exports: [GradesService]
})
export class GradesModule {}
