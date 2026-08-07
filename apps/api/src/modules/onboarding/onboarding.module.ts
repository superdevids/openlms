import { Module } from "@nestjs/common";
import { PrismaClient } from "@openlms/database";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";
import { AuthModule } from "../auth/auth.module";
import { prisma } from "@openlms/database";

@Module({
  imports: [AuthModule],
  controllers: [OnboardingController, ImportController],
  providers: [OnboardingService, ImportService, { provide: PrismaClient, useValue: prisma }],
  exports: [OnboardingService, ImportService]
})
export class OnboardingModule {}
