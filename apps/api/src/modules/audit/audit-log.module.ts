import { Module } from "@nestjs/common";
import { PrismaClient } from "@openlms/database";
import { prisma } from "@openlms/database";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogService } from "./audit-log.service";

/**
 * AuditLogModule — change-log sistem (baca). Guard global (AuthGuard →
 * PermissionsGuard) menegakkan RBAC di controller; provider PrismaClient
 * memakai instance singleton @openlms/database (sama dengan lms-audit).
 */
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, { provide: PrismaClient, useValue: prisma }]
})
export class AuditLogModule {}
