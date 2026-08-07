import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { AlumniStatus } from "@openlms/types";
import { AlumniService } from "./alumni.service";
import { CreateAlumniDto } from "./dto/alumni.dto";
import { RequirePermission } from "../../common/require-permission.decorator";

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
    @Query("search") search?: string
  ) {
    return this.alumniService.list({ graduationYearId, status, search });
  }

  @Post()
  @RequirePermission("user:write:school")
  create(@Body() dto: CreateAlumniDto) {
    return this.alumniService.createFromGraduation(dto);
  }

  @Patch(":id/archive")
  @RequirePermission("user:write:school")
  archive(@Param("id") id: string) {
    return this.alumniService.archive(id);
  }

  @Patch(":id/unarchive")
  @RequirePermission("user:write:school")
  unarchive(@Param("id") id: string) {
    return this.alumniService.unarchive(id);
  }
}
