import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { PdpController } from "./pdp.controller";
import { PdpService } from "./pdp.service";
import { PdpAnonymizeService } from "./pdp-anonymize.service";
import { PdpRetentionService } from "./pdp-retention.service";

/**
 * PdpModule — kepatuhan UU PDP (akses/ekspor data pribadi, permintaan
 * penghapusan, review admin, retensi data). Memakai PrismaClient singleton
 * global (DatabaseModule). Service diekspor untuk JobsModule (cron retensi).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [PdpController],
  providers: [PdpService, PdpAnonymizeService, PdpRetentionService],
  exports: [PdpService, PdpRetentionService]
})
export class PdpModule {}
