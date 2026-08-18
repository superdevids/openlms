import { Body, Controller, Get, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { OnboardingService } from "./onboarding.service";
import {
  OnboardingStep1Dto,
  OnboardingStep2Dto,
  OnboardingStep4Dto
} from "./dto/onboarding-step.dto";
import { ImportRowsDto } from "./dto/import.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * Wizard onboarding 5 langkah — /app/onboarding (F1-T5, prd04 §9.1).
 * Oleh SUPERADMIN/OPERATOR; tiap langkah direkam (settings.onboarding).
 */
@Controller("app/onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  @RequirePermission("app:read:school")
  status() {
    return this.onboardingService.getStatus();
  }

  @Patch("step-1")
  @RequirePermission("app:write:school")
  step1(@Body() dto: OnboardingStep1Dto, @CurrentUser() user: AuthUser) {
    return this.onboardingService.updateStep1(dto, user.id);
  }

  @Patch("step-2")
  @RequirePermission("app:write:school")
  step2(@Body() dto: OnboardingStep2Dto, @CurrentUser() user: AuthUser) {
    return this.onboardingService.updateStep2(dto, user.id, user.roles);
  }

  @Post("step-3")
  @RequirePermission("import:run:school")
  step3(@Body() dto: ImportRowsDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.onboardingService.runStep3(dto, user.id, req.ip, user.roles);
  }

  @Post("step-4")
  @RequirePermission("invitation:send:school")
  step4(@Body() dto: OnboardingStep4Dto, @CurrentUser() user: AuthUser) {
    return this.onboardingService.runStep4(dto, user.id);
  }

  @Post("step-5")
  @RequirePermission("app:write:school")
  step5(@CurrentUser() user: AuthUser) {
    return this.onboardingService.completeStep5(user.id, user.roles);
  }
}
