import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException
} from "@nestjs/common";
import type { AlumniStatus } from "@opensis/types";
import { AlumniService } from "./alumni.service";
import { CreateAlumniDto } from "./dto/alumni.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import type { AuditActorContext } from "../lms/lms-audit";

/**
 * AlumniController — direktori & tracking lulusan (prd04 §5.J/§5.R).
 * RBAC: tidak ada kode permission `alumni:*` di seed-data/permissions.ts, jadi
 * dipakai kode terdekat yang sudah ada: baca = user:read:school (data induk
 * user/anggota sekolah), tulis = user:write:school (OPERATOR/WAKEPSEK).
 * Guard global PermissionsGuard fail-closed → deklarasi wajib agar endpoint
 * tidak 403 untuk semua pengguna.
 */
@Controller("alumni")
export class AlumniController {
  constructor(private readonly alumniService: AlumniService) {}

  @Get()
  @RequirePermission("user:read:school")
  list(
    @Query("graduationYearId") graduationYearId?: string,
    @Query("status") status?: AlumniStatus,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    return this.alumniService.list({
      graduationYearId,
      status,
      search,
      page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : undefined,
      limit: Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined
    });
  }

  @Post()
  @RequirePermission("user:write:school")
  create(@Body() dto: CreateAlumniDto) {
    return this.alumniService.createFromGraduation(dto);
  }

  @Patch(":id/archive")
  @RequirePermission("user:write:school")
  archive(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.alumniService.archive(id, this.actorContext(req));
  }

  @Patch(":id/unarchive")
  @RequirePermission("user:write:school")
  unarchive(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.alumniService.unarchive(id, this.actorContext(req));
  }

  private actorContext(req: AuthenticatedRequest): AuditActorContext {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: ctx.userId, roles: ctx.roles };
  }
}
