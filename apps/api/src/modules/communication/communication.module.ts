import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { DATABASE_CLIENT } from "../database/database.constants";
import { AnnouncementService } from "./announcement.service";
import { CommunicationController } from "./communication.controller";
import { OfficialLetterService } from "./official-letter.service";

@Module({
  controllers: [CommunicationController],
  providers: [
    AnnouncementService,
    OfficialLetterService,
    { provide: DATABASE_CLIENT, useFactory: () => new PrismaClient() }
  ],
  exports: [AnnouncementService, OfficialLetterService]
})
export class CommunicationModule {}
