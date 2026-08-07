import { Module } from "@nestjs/common";
import { PrismaClient } from "@openlms/database";
import { AppSettingsController } from "./app-settings.controller";
import { AppSettingsService } from "./app-settings.service";
import { prisma } from "@openlms/database";

@Module({
  controllers: [AppSettingsController],
  providers: [AppSettingsService, { provide: PrismaClient, useValue: prisma }],
  exports: [AppSettingsService]
})
export class AppSettingsModule {}
