import { Module } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import { prisma } from "@opensis/database";
import { MaintenanceController } from "./maintenance.controller";
import { MaintenanceService } from "./maintenance.service";

@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceService, { provide: PrismaClient, useValue: prisma }],
  exports: [MaintenanceService] // dipakai MaintenanceMiddleware di AppModule
})
export class MaintenanceModule {}
