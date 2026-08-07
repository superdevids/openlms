import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@openlms/database";
import { RealtimeModule } from "../realtime/realtime.module";
import { StorageModule } from "../storage/storage.module";
import { BrandingController } from "./branding.controller";
import { BrandingService } from "./branding.service";

/**
 * BrandingModule — identitas visual aplikasi (/app/branding).
 * GET publik (cache module TTL 60s + ETag config_version); PATCH + upload
 * logo/favicon memakai permission app:write:school (AuditLog + Socket.IO
 * branding:changed → web branding-provider menerapkannya live).
 */
@Module({
  imports: [RealtimeModule, StorageModule],
  controllers: [BrandingController],
  providers: [BrandingService, { provide: PrismaClient, useValue: prisma }],
  exports: [BrandingService]
})
export class BrandingModule {}
