/**
 * ParentPortalController — portal wali murid.
 * RBAC: seluruh route WALI_MURID (guard scope SENDIRI: report:read:self /
 * user:write:self). Identitas user dari @CurrentUser (AuthGuard), bukan header.
 */
import { Body, Controller, Get, Param, Post, UnauthorizedException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { ParentPortalService } from "./parent-portal.service";
import { EnsureParentDto, LinkChildDto } from "./dto/parent-portal.dto";
import type { AuthUser } from "../../common/auth.guard";
import { CurrentUser } from "../../common/current-user.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import { Roles } from "../../common/roles.decorator";
import type { AuditActorContext } from "../lms/lms-audit";

@Controller("parent-portal")
export class ParentPortalController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Post("me")
  @Roles(Role.WALI_MURID)
  @RequirePermission("user:write:self")
  ensureParent(@CurrentUser() user: AuthUser | undefined, @Body() dto: EnsureParentDto) {
    return this.parentPortalService.ensureParent(this.actor(user).userId, dto.fullName, dto.phone);
  }

  @Get("me")
  @Roles(Role.WALI_MURID)
  @RequirePermission("report:read:self")
  getMyParent(@CurrentUser() user: AuthUser | undefined) {
    return this.parentPortalService.getMyParentGuardian(this.actor(user).userId);
  }

  @Post(":parentGuardianId/children")
  @Roles(Role.WALI_MURID)
  @RequirePermission("user:write:self")
  linkChild(
    @Param("parentGuardianId") parentGuardianId: string,
    @Body() dto: LinkChildDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.parentPortalService.linkChild(
      {
        parentGuardianId,
        studentId: dto.studentId,
        relationship: dto.relationship
      },
      this.actor(user)
    );
  }

  @Get(":parentGuardianId/children")
  @Roles(Role.WALI_MURID)
  @RequirePermission("report:read:self")
  listChildren(
    @Param("parentGuardianId") parentGuardianId: string,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.parentPortalService.listChildren(parentGuardianId, this.actor(user));
  }

  @Get(":parentGuardianId/children/:studentId/overview")
  @Roles(Role.WALI_MURID)
  @RequirePermission("report:read:self")
  getStudentOverview(
    @Param("parentGuardianId") parentGuardianId: string,
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.parentPortalService.getStudentOverview(
      parentGuardianId,
      studentId,
      this.actor(user)
    );
  }

  @Get(":parentGuardianId/children/:studentId/consents")
  @Roles(Role.WALI_MURID)
  @RequirePermission("report:read:self")
  getChildConsents(
    @Param("parentGuardianId") parentGuardianId: string,
    @Param("studentId") studentId: string,
    @CurrentUser() user: AuthUser | undefined
  ) {
    return this.parentPortalService.getChildConsents(parentGuardianId, studentId, this.actor(user));
  }

  private actor(user: AuthUser | undefined): AuditActorContext {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: user.id, roles: user.roles };
  }
}
