import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@openlms/database";
import { AssetController } from "./asset.controller";
import { AssetService } from "./services/asset.service";
import { DepreciationService } from "./services/depreciation.service";
import { AssetBookingService } from "./services/asset-booking.service";
import {
  AssetAuditService,
  AssetMaintenanceService
} from "./services/asset-maintenance-audit.service";
import { PrismaAssetStore } from "./prisma-asset.store";
import { ASSET_STORE } from "./asset.constants";
/**
 * AssetModule — manajemen aset (prd04 §5.G; 05 W2-ASSET).
 *
 * WIRING: modul ini SUDAH di-import app.module.ts (terintegrasi).
 *
 * Catatan persistence: Asset & AssetBooking memakai PrismaClient (model ada).
 * Field perpanjangan aset (merk, harga, masa manfaat, sumber dana, dll.) dan
 * entitas W2 (AssetMaintenance, AssetAudit) memakai AssetStore — adapter
 * PrismaAssetStore (W2); InMemoryAssetStore tetap tersedia untuk unit test
 * (lihat asset.store.ts & README.registration.md).
 */

@Module({
  controllers: [AssetController],
  providers: [
    AssetService,
    DepreciationService,
    AssetBookingService,
    AssetMaintenanceService,
    AssetAuditService,
    { provide: PrismaClient, useValue: prisma },
    { provide: ASSET_STORE, useClass: PrismaAssetStore }
  ],
  exports: [
    AssetService,
    DepreciationService,
    AssetBookingService,
    AssetMaintenanceService,
    AssetAuditService
  ]
})
export class AssetModule {}
