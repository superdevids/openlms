/**
 * PpdbController — endpoint PPDB.
 * RBAC: POST /register @Public; /track CALON_SISWA (ppdb:read:self);
 * /selection /verify /select /waitlist /enroll hanya OPERATOR/SUPERADMIN
 * (ppdb:verify:school, ppdb:select:school, ppdb:enroll:school).
 */
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
import { PpdbService } from "./ppdb.service";
import { RegisterPpdbDto, SelectionDto, VerifyDto } from "./dto/ppdb.dto";
import { Public } from "../../common/public.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import type { AuditActorContext } from "../lms/lms-audit";

@Controller("ppdb")
export class PpdbController {
  constructor(private readonly ppdbService: PpdbService) {}

  @Post("register")
  @Public()
  register(@Body() dto: RegisterPpdbDto) {
    return this.ppdbService.register({
      fullName: dto.fullName,
      nisn: dto.nisn,
      birthDate: dto.birthDate,
      birthPlace: dto.birthPlace,
      gender: dto.gender,
      originSchool: dto.originSchool,
      phone: dto.phone,
      email: dto.email,
      parentName: dto.parentName,
      parentPhone: dto.parentPhone,
      documents: dto.documents,
      consent: dto.consent
    });
  }

  @Get("track")
  @RequirePermission("ppdb:read:self")
  track(@Query("registrationNo") registrationNo: string) {
    return this.ppdbService.track(registrationNo);
  }

  @Get("selection")
  @RequirePermission("ppdb:verify:school", "ppdb:select:school")
  listSelection() {
    return this.ppdbService.listSelection();
  }

  @Patch(":applicantId/verify")
  @RequirePermission("ppdb:verify:school")
  verify(
    @Param("applicantId") applicantId: string,
    @Body() dto: VerifyDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.ppdbService.verify(applicantId, dto.approve, this.actorContext(req));
  }

  @Patch(":applicantId/select")
  @RequirePermission("ppdb:select:school")
  select(
    @Param("applicantId") applicantId: string,
    @Body() dto: SelectionDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.ppdbService.select(applicantId, dto, this.actorContext(req));
  }

  @Patch(":applicantId/waitlist")
  @RequirePermission("ppdb:select:school")
  waitlist(
    @Param("applicantId") applicantId: string,
    @Body() dto: SelectionDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.ppdbService.waitlist(applicantId, dto, this.actorContext(req));
  }

  @Post(":applicantId/enroll")
  @RequirePermission("ppdb:enroll:school")
  enroll(
    @Param("applicantId") applicantId: string,
    @Query("academicYearId") academicYearId: string,
    @Query("classId") classId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.ppdbService.enroll(applicantId, academicYearId, classId, this.actorContext(req));
  }

  private actorContext(req: AuthenticatedRequest): AuditActorContext {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: ctx.userId, roles: ctx.roles };
  }
}
