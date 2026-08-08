import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { PrismaClient, prisma } from "@opensis/database";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";
import { LocalStorageProvider } from "./local-storage.provider";
import { UploadSizeLimitMiddleware } from "./upload-size-limit.middleware";

/**
 * StorageModule — penyimpanan file lokal (tanpa S3).
 * LocalStorageProvider: multer memoryStorage, allowlist ekstensi STRICT per
 * bucket, allowlist mimetype per bucket, magic bytes, limit ukuran per bucket
 * + batas global, nama file `{timestamp}-{slug}.{ext}`. Serve GET
 * /storage/files/:bucket/* dengan RBAC per bucket. Upload besar ditolak dini
 * via UploadSizeLimitMiddleware (Content-Length > limit → 413).
 */
@Module({
  controllers: [StorageController],
  providers: [StorageService, LocalStorageProvider, { provide: PrismaClient, useValue: prisma }],
  exports: [StorageService, LocalStorageProvider]
})
export class StorageModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Self-guard di middleware: hanya POST /storage/files/:bucket yang diproses,
    // jadi aman dipasang untuk semua route (pola sama dengan middleware global).
    consumer.apply(UploadSizeLimitMiddleware).forRoutes("*");
  }
}
