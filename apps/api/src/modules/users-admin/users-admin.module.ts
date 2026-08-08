import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { UsersAdminController } from "./users-admin.controller";
import { UsersAdminService } from "./users-admin.service";

/**
 * UsersAdminModule — daftar user Admin Sistem (R-38).
 * GET /admin/users (user:read:school). Memakai PrismaClient singleton global.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [UsersAdminController],
  providers: [UsersAdminService],
  exports: [UsersAdminService]
})
export class UsersAdminModule {}
