import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { DATABASE_CLIENT } from "../database/database.constants";
import { RolloverController } from "./rollover.controller";
import { RolloverService } from "./rollover.service";

@Module({
  controllers: [RolloverController],
  providers: [RolloverService, { provide: DATABASE_CLIENT, useFactory: () => new PrismaClient() }],
  exports: [RolloverService]
})
export class RolloverModule {}
