import { Body, Controller, Get, Patch, Req } from "@nestjs/common";
import type { Request } from "express";
import { AppSettingsService } from "./app-settings.service";
import { UpdateAppSettingsDto } from "./dto/update-app-settings.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * Pengaturan aplikasi (profil sekolah, ambang, current_academic_year_id) — /app/settings.
 * Permission: app:read:school / app:write:school (seed prd04 §4.2).
 */
@Controller("app/settings")
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @RequirePermission("app:read:school")
  get() {
    return this.appSettingsService.getSettings();
  }

  @Patch()
  @RequirePermission("app:write:school")
  update(@Body() dto: UpdateAppSettingsDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.appSettingsService.updateSettings(dto, user.id, req.ip);
  }
}
