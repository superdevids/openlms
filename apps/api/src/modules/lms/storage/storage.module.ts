import { Module } from "@nestjs/common";
import { StorageModule as CanonicalStorageModule } from "../../storage/storage.module";
import { StorageService } from "./storage.service";

/**
 * StorageModule (LMS) — facade kompatibilitas (R-20). Implementasi kanonik
 * hidup di modules/storage; modul ini hanya menyediakan StorageService lama
 * (path helpers + URL storage asli) dan memakai provider kanonik via DI.
 */
@Module({
  imports: [CanonicalStorageModule],
  providers: [StorageService],
  exports: [StorageService]
})
export class StorageModule {}
