import { Module } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import { prisma } from "@opensis/database";
import { AuthModule } from "../auth/auth.module";
import { RbacAdminController } from "./rbac-admin.controller";
import { RbacAdminService } from "./rbac-admin.service";

/**
 * RbacAdminModule — konsol RBAC (permission catalog, role-permission, user override).
 * PermissionsResolver diimpor dari AuthModule agar invalidasi cache (60s) satu instance
 * dengan guard global.
 */
@Module({
  imports: [AuthModule],
  controllers: [RbacAdminController],
  providers: [RbacAdminService, { provide: PrismaClient, useValue: prisma }],
  exports: [RbacAdminService]
})
export class RbacAdminModule {}
