import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { MaterialsService } from "./materials.service";
import { MaterialsController } from "./materials.controller";

@Module({
  imports: [StorageModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService]
})
export class MaterialsModule {}
