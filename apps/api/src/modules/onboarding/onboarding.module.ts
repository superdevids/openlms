import { Module } from "@nestjs/common";
import { PrismaClient } from "@openlms/database";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";
import { UserOnboardingController } from "./user-onboarding.controller";
import { UserOnboardingService } from "./user-onboarding.service";
import { AuthModule } from "../auth/auth.module";
import { prisma } from "@openlms/database";

@Module({
  imports: [AuthModule],
  controllers: [OnboardingController, ImportController, UserOnboardingController],
  providers: [
    OnboardingService,
    ImportService,
    UserOnboardingService,
    { provide: PrismaClient, useValue: prisma }
  ],
  exports: [OnboardingService, ImportService, UserOnboardingService]
})
export class OnboardingModule {}
