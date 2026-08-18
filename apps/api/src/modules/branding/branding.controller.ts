import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request, Response } from "express";
import { BrandingService } from "./branding.service";
import type { BrandingView } from "./branding.types";
import { UpdateBrandingDto } from "./dto/update-branding.dto";
import { Public } from "../../common/public.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/** Batas ukuran upload branding (2MB — konsisten StorageModule). */
const BRANDING_MAX_SIZE = 2 * 1024 * 1024;

/**
 * BrandingController — identitas visual aplikasi (/app/branding).
 * - GET publik (pre-login) dengan ETag = config_version.
 * - PATCH + upload logo/favicon memakai app:write:school (AuditLog + Socket.IO).
 */
@Controller("app/branding")
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  @Public()
  @Header("Cache-Control", "no-cache")
  async get(@Res() res: Response): Promise<void> {
    const view = await this.brandingService.getBranding();
    res.setHeader("ETag", `"branding-${view.configVersion}"`);
    const ifNoneMatch = res.req.headers["if-none-match"];
    if (typeof ifNoneMatch === "string" && ifNoneMatch === `"branding-${view.configVersion}"`) {
      res.status(304).end();
      return;
    }
    res.json(view);
  }

  @Patch()
  @RequirePermission("app:write:school")
  update(
    @Body() dto: UpdateBrandingDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<BrandingView> {
    return this.brandingService.updateBranding(dto, user.id, req.ip, user.roles);
  }

  @Post("logo")
  @RequirePermission("app:write:school")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: BRANDING_MAX_SIZE }
    })
  )
  uploadLogo(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<BrandingView> {
    return this.uploadAsset("logo", file, user, req);
  }

  @Post("favicon")
  @RequirePermission("app:write:school")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: BRANDING_MAX_SIZE }
    })
  )
  uploadFavicon(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<BrandingView> {
    return this.uploadAsset("favicon", file, user, req);
  }

  private async uploadAsset(
    field: "logo" | "favicon",
    file: Express.Multer.File | undefined,
    user: AuthUser,
    req: Request
  ): Promise<BrandingView> {
    if (!file) {
      throw new BadRequestException("File tidak ditemukan di field 'file'.");
    }
    return this.brandingService.setAsset(field, file, user.id, req.ip, user.roles);
  }
}
