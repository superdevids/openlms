import { Body, Controller, Get, Param, Patch, Req } from "@nestjs/common";
import type { Request } from "express";
import { Role } from "@prisma/client";
import { FeatureFlagsService, FeatureFlagView } from "./feature-flags.service";
import { UpdateFeatureFlagDto } from "./dto/update-feature-flag.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { Roles } from "../../common/roles.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * Konsol feature flags — F1-T13. Hanya SUPERADMIN; perubahan tercatat AuditLog.
 */
@Controller("app/feature-flags")
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @Roles(Role.SUPERADMIN)
  @RequirePermission("featureflag:read:school")
  list(): Promise<FeatureFlagView[]> {
    return this.featureFlagsService.list();
  }

  @Patch(":key")
  @Roles(Role.SUPERADMIN)
  @RequirePermission("featureflag:write:school")
  update(
    @Param("key") key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ) {
    return this.featureFlagsService.update(key, dto, user.id, req.ip, user.roles);
  }
}
