import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { ProdiService, ProdiView } from "./prodi.service";
import { CreateProdiDto, ListProdiQuery, UpdateProdiDto } from "./dto/prodi.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * ProdiController — jurusan/kompetensi keahlian (SMK) /academic/prodi.
 * Baca: academic:prodi:read (staff scope SEKOLAH; SISWA/CALON_SISWA/WALI_MURID
 * scope SENDIRI — dibutuhkan form SMK/PPDB); tulis: academic:prodi:write
 * (OPERATOR/WAKEPSEK/SUPERADMIN).
 */
@Controller("academic/prodi")
export class ProdiController {
  constructor(private readonly prodiService: ProdiService) {}

  @Get()
  @RequirePermission("academic:prodi:read")
  list(@Query() query: ListProdiQuery): Promise<ProdiView[]> {
    return this.prodiService.list(query);
  }

  @Get(":id")
  @RequirePermission("academic:prodi:read")
  getById(@Param("id") id: string): Promise<ProdiView> {
    return this.prodiService.getById(id);
  }

  @Post()
  @RequirePermission("academic:prodi:write")
  create(
    @Body() dto: CreateProdiDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<ProdiView> {
    return this.prodiService.create(dto, user.id, req.ip, user.roles);
  }

  @Patch(":id")
  @RequirePermission("academic:prodi:write")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProdiDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<ProdiView> {
    return this.prodiService.update(id, dto, user.id, req.ip, user.roles);
  }

  @Delete(":id")
  @RequirePermission("academic:prodi:write")
  deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<ProdiView> {
    return this.prodiService.deactivate(id, user.id, req.ip, user.roles);
  }
}
