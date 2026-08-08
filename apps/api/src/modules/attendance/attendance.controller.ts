import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import type { ActorContext } from "./current-actor";
import { IDEMPOTENCY_HEADER } from "./attendance.constants";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { CreatePermitDto } from "./dto/create-permit.dto";
import { CreateSessionDto } from "./dto/create-session.dto";
import { DisciplineQueryDto } from "./dto/discipline-query.dto";
import { GenerateTokenDto } from "./dto/generate-token.dto";
import { RekapQueryDto } from "./dto/rekap-query.dto";
import { ScanRecordDto } from "./dto/scan-record.dto";
import { VerifyPermitDto } from "./dto/verify-permit.dto";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { RequirePermission } from "../../common/require-permission.decorator";

/**
 * AttendanceController — absensi manual + QR + izin/sakit + rekap & kedisiplinan.
 * Acuan: prd04 §5.A.7; tek-05 M-ABSQR-T1..T9.
 * Identitas aktor dari request.requestContext (AuthGuard), bukan header klien.
 */
@Controller("attendance")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /** Absensi manual bulk oleh guru (MVP). */
  @Post("manual")
  @RequirePermission("attendance:record:class")
  async recordManual(@Body() dto: CreateAttendanceDto, @Req() req: AuthenticatedRequest) {
    return this.attendanceService.recordManual(dto, this.actor(req));
  }

  /** Buat sesi absensi QR/geofencing/manual. */
  @Post("sessions")
  @RequirePermission("attendance:session:write:class")
  async createSession(@Body() dto: CreateSessionDto, @Req() req: AuthenticatedRequest) {
    return this.attendanceService.createSession(dto, this.actor(req));
  }

  /** Detail sesi + hasil scan. */
  @Get("sessions/:id")
  @RequirePermission("attendance:session:write:class", "attendance:rekap:class")
  async getSession(@Param("id") id: string) {
    return this.attendanceService.getSession(id);
  }

  /** Generate token QR sekali pakai untuk sesi. */
  @Post("sessions/:id/tokens")
  @RequirePermission("attendance:session:write:class")
  async generateToken(
    @Param("id") id: string,
    @Body() dto: GenerateTokenDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.attendanceService.generateSessionToken(id, dto, this.actor(req));
  }

  /**
   * Scan QR. Idempotency-Key diterima dari header (offline queue) atau body.
   * Duplikat key -> 200 idempotent; token reuse -> 409.
   */
  @Post("records/scan")
  @RequirePermission("attendance:scan:self")
  async scan(
    @Body() dto: ScanRecordDto,
    @Headers(IDEMPOTENCY_HEADER) idempotencyHeader: string | undefined,
    @Req() req: AuthenticatedRequest
  ) {
    const idempotencyKey = dto.idempotency_key ?? idempotencyHeader;
    return this.attendanceService.scan(
      { ...dto, idempotency_key: idempotencyKey },
      this.actor(req)
    );
  }

  /** Pengajuan izin/sakit online + path surat. */
  @Post("permits")
  @RequirePermission("permit:request:self")
  async requestPermit(@Body() dto: CreatePermitDto, @Req() req: AuthenticatedRequest) {
    return this.attendanceService.requestPermit(dto, this.actor(req));
  }

  /** Verifikasi pengajuan izin oleh homeroom/BK. */
  @Post("permits/:id/verify")
  @RequirePermission("permit:verify:class")
  async verifyPermit(
    @Param("id") id: string,
    @Body() dto: VerifyPermitDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.attendanceService.verifyPermit(id, dto, this.actor(req));
  }

  /** Rekap kehadiran per siswa/mapel/periode. */
  @Get("rekap")
  @RequirePermission("attendance:rekap:self", "attendance:rekap:class", "attendance:rekap:school")
  async rekap(@Query() dto: RekapQueryDto, @Req() req: AuthenticatedRequest) {
    return this.attendanceService.rekap(dto, this.actor(req));
  }

  /** Dashboard kedisiplinan: ALPA per siswa per bulan + highlight berisiko. */
  @Get("discipline")
  @RequirePermission("discipline:read:school")
  async discipline(@Query() dto: DisciplineQueryDto) {
    return this.attendanceService.discipline(dto);
  }

  private actor(req: AuthenticatedRequest): ActorContext {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: ctx.userId, roles: ctx.roles, classIds: ctx.classIds };
  }
}
