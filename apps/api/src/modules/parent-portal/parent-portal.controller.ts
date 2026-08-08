/**
 * ParentPortalController — portal wali murid.
 * RBAC: seluruh route WALI_MURID (guard scope SENDIRI: report:read:self /
 * user:write:self). Identitas user dari request.requestContext (AuthGuard),
 * bukan header.
 */
import { Body, Controller, Get, Param, Post, Req, UnauthorizedException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { ParentPortalService } from "./parent-portal.service";
import { EnsureParentDto, LinkChildDto } from "./dto/parent-portal.dto";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { RequirePermission } from "../../common/require-permission.decorator";
import { Roles } from "../../common/roles.decorator";

@Controller("parent-portal")
export class ParentPortalController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Post("me")
  @Roles(Role.WALI_MURID)
  @RequirePermission("user:write:self")
  ensureParent(@Req() req: AuthenticatedRequest, @Body() dto: EnsureParentDto) {
    return this.parentPortalService.ensureParent(this.actorId(req), dto.fullName, dto.phone);
  }

  @Get("me")
  @Roles(Role.WALI_MURID)
  @RequirePermission("report:read:self")
  getMyParent(@Req() req: AuthenticatedRequest) {
    return this.parentPortalService.getMyParentGuardian(this.actorId(req));
  }

  @Post(":parentGuardianId/children")
  @Roles(Role.WALI_MURID)
  @RequirePermission("user:write:self")
  linkChild(
    @Param("parentGuardianId") parentGuardianId: string,
    @Body() dto: LinkChildDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.parentPortalService.linkChild(
      {
        parentGuardianId,
        studentId: dto.studentId,
        relationship: dto.relationship
      },
      { userId: this.actorId(req), roles: this.actorRoles(req) }
    );
  }

  @Get(":parentGuardianId/children")
  @Roles(Role.WALI_MURID)
  @RequirePermission("report:read:self")
  listChildren(@Param("parentGuardianId") parentGuardianId: string) {
    return this.parentPortalService.listChildren(parentGuardianId);
  }

  @Get(":parentGuardianId/children/:studentId/overview")
  @Roles(Role.WALI_MURID)
  @RequirePermission("report:read:self")
  getStudentOverview(
    @Param("parentGuardianId") parentGuardianId: string,
    @Param("studentId") studentId: string
  ) {
    return this.parentPortalService.getStudentOverview(parentGuardianId, studentId);
  }

  @Get(":parentGuardianId/children/:studentId/consents")
  @Roles(Role.WALI_MURID)
  @RequirePermission("report:read:self")
  getChildConsents(
    @Param("parentGuardianId") parentGuardianId: string,
    @Param("studentId") studentId: string
  ) {
    return this.parentPortalService.getChildConsents(parentGuardianId, studentId);
  }

  private actorId(req: AuthenticatedRequest): string {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return ctx.userId;
  }

  private actorRoles(req: AuthenticatedRequest): string[] {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return ctx.roles;
  }
}
