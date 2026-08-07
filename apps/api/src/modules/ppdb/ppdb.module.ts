import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { DATABASE_CLIENT } from "../database/database.constants";
import { AcademicYearGuard } from "../academic/academic-year.guard";
import { PpdbController } from "./ppdb.controller";
import { PpdbService } from "./ppdb.service";

@Module({
  controllers: [PpdbController],
  providers: [
    PpdbService,
    AcademicYearGuard,
    { provide: DATABASE_CLIENT, useFactory: () => new PrismaClient() }
  ],
  exports: [PpdbService]
})
export class PpdbModule {}
