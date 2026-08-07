import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { DATABASE_CLIENT } from "../database/database.constants";
import { ParentPortalController } from "./parent-portal.controller";
import { ParentPortalService } from "./parent-portal.service";

@Module({
  controllers: [ParentPortalController],
  providers: [
    ParentPortalService,
    { provide: DATABASE_CLIENT, useFactory: () => new PrismaClient() }
  ],
  exports: [ParentPortalService]
})
export class ParentPortalModule {}
