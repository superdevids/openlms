import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { DATABASE_CLIENT } from "../database/database.constants";
import { AlumniController } from "./alumni.controller";
import { AlumniService } from "./alumni.service";

@Module({
  controllers: [AlumniController],
  providers: [AlumniService, { provide: DATABASE_CLIENT, useFactory: () => new PrismaClient() }],
  exports: [AlumniService]
})
export class AlumniModule {}
