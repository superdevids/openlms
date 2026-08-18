import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QueueModule } from "../queue/queue.module";
import { RaporModule } from "../rapor/rapor.module";
import { ExportController } from "./export.controller";
import { DapodikController } from "./dapodik.controller";
import { ExportService } from "./export.service";
import { RaporExportService } from "./rapor-export.service";
import { DapodikExportService } from "./dapodik-export.service";

/**
 * ExportModule — hasil ekspor (DataExportLog): baca/unduh (ExportService +
 * ExportController), generator PDF rapor (RaporExportService) dan CSV Dapodik
 * (DapodikExportService + DapodikController). Service generator DIEKSPOR agar
 * dipakai ReportProcessor (JobsModule); RaporService datang dari RaporModule.
 */
@Module({
  imports: [AuthModule, QueueModule, RaporModule],
  controllers: [ExportController, DapodikController],
  providers: [ExportService, RaporExportService, DapodikExportService],
  exports: [RaporExportService, DapodikExportService]
})
export class ExportModule {}
