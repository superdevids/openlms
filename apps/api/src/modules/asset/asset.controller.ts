import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UsePipes,
  ValidationPipe
} from "@nestjs/common";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";
import {
  ApproveAuditDto,
  ApproveBookingDto,
  AssetQueryDto,
  BookAssetDto,
  CreateAssetDto,
  CreateAuditDto,
  CreateMaintenanceDto,
  UpdateAssetDto,
  UpdateMaintenanceDto
} from "./dto/asset.dto";
import { AssetService } from "./services/asset.service";
import { DepreciationService } from "./services/depreciation.service";
import { AssetBookingService } from "./services/asset-booking.service";
import {
  AssetAuditService,
  AssetMaintenanceService
} from "./services/asset-maintenance-audit.service";

/**
 * AssetController — REST manajemen aset (prd04 §5.G).
 * RBAC via @RequirePermission (guard global AuthGuard → PermissionsGuard).
 * Aktor WAJIB dari @CurrentUser (AuthGuard); handler non-publik melempar
 * UnauthorizedException bila konteks autentikasi tidak ditemukan.
 */

@Controller("assets")
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AssetController {
  constructor(
    private readonly assets: AssetService,
    private readonly depreciation: DepreciationService,
    private readonly bookings: AssetBookingService,
    private readonly maintenance: AssetMaintenanceService,
    private readonly audits: AssetAuditService
  ) {}

  private actorId(user: AuthUser | undefined): string {
    if (!user) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return user.id;
  }

  // ---------- Inventaris ----------

  @Post()
  @RequirePermission("asset:write:school")
  createAsset(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.assets.create({
      code: dto.code,
      name: dto.name,
      category: dto.category,
      condition: dto.condition,
      status: dto.status,
      quantity: dto.quantity,
      location: dto.location,
      merk: dto.merk ?? null,
      tahunPerolehan: dto.tahunPerolehan ?? null,
      hargaPerolehan: dto.hargaPerolehan ?? null,
      masaManfaatBulan: dto.masaManfaatBulan ?? null,
      penanggungJawab: dto.penanggungJawab ?? null,
      sumberDana: (dto.sumberDana ?? null) as "BOS" | "APBD" | "SWADANA" | null,
      createdBy: userId
    });
  }

  @Get()
  @RequirePermission("asset:read:school")
  listAssets(@Query() query: AssetQueryDto) {
    return this.assets.list(query);
  }

  @Get(":id")
  @RequirePermission("asset:read:school")
  getAsset(@Param("id") id: string) {
    return this.assets.findById(id);
  }

  @Post(":id")
  @RequirePermission("asset:write:school")
  updateAsset(
    @Param("id") id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.assets.update(id, {
      ...dto,
      sumberDana: (dto.sumberDana ?? undefined) as "BOS" | "APBD" | "SWADANA" | null,
      createdBy: userId
    });
  }

  // ---------- Depresiasi (dihitung saat laporan — prd04 §5.G.2) ----------

  @Get("reports/depreciation")
  @RequirePermission("asset:read:school")
  depreciationReport() {
    return this.depreciation.report(new Date());
  }

  @Get("reports/depreciation/rekap")
  @RequirePermission("asset:read:school")
  depreciationRekap() {
    return this.depreciation.rekapByCategory(new Date());
  }

  // ---------- Booking ----------

  @Post("bookings")
  @RequirePermission("asset:book:self", "asset:write:school")
  bookAsset(@Body() dto: BookAssetDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.bookings.book({
      assetId: dto.assetId,
      bookedBy: userId,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      purpose: dto.purpose
    });
  }

  @Get("bookings")
  @RequirePermission("asset:read:school")
  listBookings(@Query("assetId") assetId?: string) {
    return this.bookings.list(assetId);
  }

  @Post("bookings/:id/approve")
  @RequirePermission("asset:write:school")
  approveBooking(
    @Param("id") id: string,
    @Body() dto: ApproveBookingDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.bookings.approve(id, dto.approved, userId);
  }

  @Post("bookings/:id/cancel")
  @RequirePermission("asset:book:self", "asset:write:school")
  cancelBooking(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.bookings.cancel(id, userId);
  }

  @Post("bookings/:id/complete")
  @RequirePermission("asset:write:school")
  completeBooking(@Param("id") id: string) {
    return this.bookings.complete(id);
  }

  // ---------- Maintenance ----------

  @Post("maintenance")
  @RequirePermission("asset:maintenance:write:school")
  createMaintenance(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.maintenance.create({
      assetId: dto.assetId,
      scheduledAt: new Date(dto.scheduledAt),
      cost: dto.cost,
      description: dto.description,
      createdBy: userId
    });
  }

  @Get("maintenance")
  @RequirePermission("asset:read:school")
  listMaintenance(@Query("assetId") assetId?: string) {
    return this.maintenance.list(assetId);
  }

  @Post("maintenance/:id/status")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("asset:maintenance:write:school")
  updateMaintenanceStatus(
    @Param("id") id: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.maintenance.updateStatus(id, dto.status as never, userId);
  }

  // ---------- Audit / opname ----------

  @Post("audits")
  @RequirePermission("asset:audit:school")
  createAudit(@Body() dto: CreateAuditDto, @CurrentUser() user: AuthUser | undefined) {
    const userId = this.actorId(user);
    return this.audits.create({
      assetId: dto.assetId,
      auditDate: new Date(dto.auditDate),
      auditType: dto.auditType as "FISIK" | "BOOK",
      physicalQty: dto.physicalQty ?? null,
      bookQty: dto.bookQty ?? 0,
      note: dto.note ?? "",
      proposeRetired: dto.proposeRetired ?? false,
      createdBy: userId
    });
  }

  @Get("audits")
  @RequirePermission("asset:audit:school", "asset:read:school")
  listAudits(@Query("assetId") assetId?: string) {
    return this.audits.list(assetId);
  }

  @Get("audits/:id")
  @RequirePermission("asset:audit:school", "asset:read:school")
  getAudit(@Param("id") id: string) {
    return this.audits.get(id);
  }

  @Post("audits/:id/approve-retired")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("asset:audit:school")
  approveRetired(
    @Param("id") id: string,
    @Body() dto: ApproveAuditDto,
    @CurrentUser() user: AuthUser | undefined
  ) {
    const userId = this.actorId(user);
    return this.audits.approveRetired(id, dto.approved, userId);
  }
}
