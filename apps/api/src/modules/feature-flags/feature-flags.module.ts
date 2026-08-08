import { Module } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import { FeatureFlagsController } from "./feature-flags.controller";
import { FeatureFlagsService } from "./feature-flags.service";
import { prisma } from "@opensis/database";

@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, { provide: PrismaClient, useValue: prisma }],
  exports: [FeatureFlagsService]
})
export class FeatureFlagsModule {}
