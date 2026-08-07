import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@openlms/database";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";
import { LocalStorageProvider } from "./local-storage.provider";

/**
 * StorageModule — penyimpanan file lokal (tanpa S3).
 * LocalStorageProvider: multer memoryStorage, allowlist png/jpg/jpeg/webp,
 * 2MB limit, UUID filename. Serve GET /storage/files/:bucket/* dengan RBAC per bucket.
 */
@Module({
  controllers: [StorageController],
  providers: [StorageService, LocalStorageProvider, { provide: PrismaClient, useValue: prisma }],
  exports: [StorageService, LocalStorageProvider]
})
export class StorageModule {}
