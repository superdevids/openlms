import { Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@opensis/database";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
  providers: [{ provide: PrismaClient, useValue: prisma }]
})
export class HealthModule {}
