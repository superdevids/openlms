import { Body, Controller, Get, Put } from "@nestjs/common";
import { UserOnboardingService, UserOnboardingView } from "./user-onboarding.service";
import { UpdateOnboardingProgressDto } from "./dto/onboarding-progress.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * UserOnboardingController — tur onboarding per user (/onboarding/me).
 * Semua role terautentikasi (kecuali guest) — permission self via BASIC_SELF
 * (user:read:self / user:write:self) sehingga setiap role aktif bisa memakai tur.
 * Sumber identitas user dari requestContext (AuthGuard), bukan body request.
 */
@Controller("onboarding/me")
export class UserOnboardingController {
  constructor(private readonly userOnboardingService: UserOnboardingService) {}

  @Get()
  @RequirePermission("user:read:self")
  get(@CurrentUser() user: AuthUser): Promise<UserOnboardingView> {
    return this.userOnboardingService.getMe(user.id, user.roles);
  }

  @Put("complete")
  @RequirePermission("user:write:self")
  complete(@CurrentUser() user: AuthUser): Promise<UserOnboardingView> {
    return this.userOnboardingService.complete(user.id);
  }

  @Put("dismiss")
  @RequirePermission("user:write:self")
  dismiss(@CurrentUser() user: AuthUser): Promise<UserOnboardingView> {
    return this.userOnboardingService.dismiss(user.id);
  }

  @Put("progress")
  @RequirePermission("user:write:self")
  progress(
    @Body() dto: UpdateOnboardingProgressDto,
    @CurrentUser() user: AuthUser
  ): Promise<UserOnboardingView> {
    return this.userOnboardingService.updateProgress(user.id, dto, user.roles);
  }
}
