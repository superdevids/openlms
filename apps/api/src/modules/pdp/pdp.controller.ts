import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res
} from "@nestjs/common";
import type { Response } from "express";
import { contextFromRequest } from "../lms/lms-context";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { RequirePermission } from "../../common/require-permission.decorator";
import { PdpService } from "./pdp.service";
import { UpdateMyProfileDto } from "./dto/update-my-profile.dto";
import { ExportPersonalDataDto } from "./dto/export-personal-data.dto";
import { CreateDeleteRequestDto } from "./dto/create-delete-request.dto";
import { ReviewRequestDto } from "./dto/review-request.dto";
import { UpsertRetentionPolicyDto } from "./dto/upsert-retention-policy.dto";
import { RETENTION_ENTITIES, type RetentionEntity } from "./pdp.constants";

/**
 * PdpController — kepatuhan UU PDP (modul PDP).
 * Semua scope self memakai userId dari RequestContext (JWT via AuthGuard) —
 * TIDAK PERNAH parameter klien (anti-impersonation).
 * RBAC: pdp:data:self / pdp:export:self / pdp:delete-request:self (SISWA,
 * WALI_MURID, CALON_SISWA, PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL, SUPERADMIN);
 * pdp:review:school (SUPERADMIN/OPERATOR); retention:* (OPERATOR).
 */
@Controller("pdp")
export class PdpController {
  constructor(private readonly pdpService: PdpService) {}

  @Get("me/data")
  @RequirePermission("pdp:data:self")
  collectMyData(@Req() req: AuthenticatedRequest) {
    const ctx = contextFromRequest(req);
    return this.pdpService.collectPersonalData(ctx.userId, ctx);
  }

  @Put("me")
  @RequirePermission("pdp:data:self", "user:write:self")
  updateMyProfile(@Body() dto: UpdateMyProfileDto, @Req() req: AuthenticatedRequest) {
    const ctx = contextFromRequest(req);
    return this.pdpService.updateMyProfile(ctx.userId, dto, ctx);
  }

  @Post("me/export")
  @RequirePermission("pdp:export:self")
  exportMyData(@Body() dto: ExportPersonalDataDto, @Req() req: AuthenticatedRequest) {
    const ctx = contextFromRequest(req);
    return this.pdpService.exportPersonalData(ctx.userId, dto, ctx);
  }

  @Get("me/exports")
  @RequirePermission("pdp:export:self")
  listMyExports(@Req() req: AuthenticatedRequest) {
    const ctx = contextFromRequest(req);
    return this.pdpService.listMyExports(ctx.userId);
  }

  @Get("me/exports/:id/download")
  @RequirePermission("pdp:export:self")
  async downloadMyExport(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<void> {
    const ctx = contextFromRequest(req);
    const { filename, filePath } = await this.pdpService.downloadMyExport(ctx.userId, id);
    res.download(filePath, filename);
  }

  @Post("me/delete-request")
  @RequirePermission("pdp:delete-request:self")
  requestDelete(@Body() dto: CreateDeleteRequestDto, @Req() req: AuthenticatedRequest) {
    const ctx = contextFromRequest(req);
    return this.pdpService.requestDelete(ctx.userId, dto, ctx);
  }

  @Get("me/requests")
  @RequirePermission("pdp:delete-request:self")
  listMyRequests(@Req() req: AuthenticatedRequest) {
    const ctx = contextFromRequest(req);
    return this.pdpService.listMyRequests(ctx.userId);
  }

  @Get("consents")
  @RequirePermission("pdp:data:self")
  listConsents(@Req() req: AuthenticatedRequest) {
    const ctx = contextFromRequest(req);
    return this.pdpService.listConsents(ctx.userId);
  }

  @Get("requests")
  @RequirePermission("pdp:review:school")
  listRequests(@Query("status") status = "", @Req() req: AuthenticatedRequest) {
    const _ctx = contextFromRequest(req);
    return this.pdpService.listRequestsAdmin({ status });
  }

  @Post("requests/:id/approve")
  @RequirePermission("pdp:review:school")
  approveRequest(
    @Param("id") id: string,
    @Body() dto: ReviewRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    const ctx = contextFromRequest(req);
    return this.pdpService.approveRequest(id, ctx.userId, dto, ctx);
  }

  @Post("requests/:id/reject")
  @RequirePermission("pdp:review:school")
  rejectRequest(
    @Param("id") id: string,
    @Body() dto: ReviewRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    const ctx = contextFromRequest(req);
    return this.pdpService.rejectRequest(id, ctx.userId, dto);
  }

  @Get("retention")
  @RequirePermission("retention:configure:school")
  getRetentionPolicies() {
    return this.pdpService.getRetentionPolicies();
  }

  @Put("retention/:entity")
  @RequirePermission("retention:configure:school")
  upsertRetentionPolicy(@Param("entity") entity: string, @Body() dto: UpsertRetentionPolicyDto) {
    // Validasi server-side: entity hanya boleh dari RETENTION_ENTITIES — body
    // tidak lagi membawa field entity (sumber tunggal = path param).
    const target = entity as RetentionEntity;
    if (!RETENTION_ENTITIES.includes(target)) {
      throw new BadRequestException("entity retensi tidak dikenal");
    }
    return this.pdpService.upsertRetentionPolicy(target, dto);
  }

  @Post("retention/run")
  @RequirePermission("retention:run:school")
  runRetention() {
    return this.pdpService.runRetention();
  }
}
