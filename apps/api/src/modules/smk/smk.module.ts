import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { CompetencyTestService } from "./competency-test.service";
import { InternshipService } from "./internship.service";
import { PartnerService } from "./partner.service";
import { SmkController } from "./smk.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [SmkController],
  providers: [InternshipService, CompetencyTestService, PartnerService],
  exports: [InternshipService, CompetencyTestService, PartnerService]
})
export class SmkModule {}
