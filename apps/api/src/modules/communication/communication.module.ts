import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AnnouncementService } from "./announcement.service";
import { CommunicationController } from "./communication.controller";
import { OfficialLetterService } from "./official-letter.service";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [CommunicationController],
  providers: [AnnouncementService, OfficialLetterService],
  exports: [AnnouncementService, OfficialLetterService]
})
export class CommunicationModule {}
