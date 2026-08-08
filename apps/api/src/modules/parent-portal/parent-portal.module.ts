import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { ParentPortalController } from "./parent-portal.controller";
import { ParentPortalService } from "./parent-portal.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ParentPortalController],
  providers: [ParentPortalService],
  exports: [ParentPortalService]
})
export class ParentPortalModule {}
