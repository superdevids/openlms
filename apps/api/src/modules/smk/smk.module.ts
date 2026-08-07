import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { DATABASE_CLIENT } from "../database/database.constants";
import { CompetencyTestService } from "./competency-test.service";
import { InternshipService } from "./internship.service";
import { PartnerService } from "./partner.service";
import { SmkController } from "./smk.controller";

@Module({
  controllers: [SmkController],
  providers: [
    InternshipService,
    CompetencyTestService,
    PartnerService,
    { provide: DATABASE_CLIENT, useFactory: () => new PrismaClient() }
  ],
  exports: [InternshipService, CompetencyTestService, PartnerService]
})
export class SmkModule {}
