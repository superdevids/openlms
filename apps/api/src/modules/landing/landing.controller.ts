import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { LandingService } from "./landing.service";
import type {
  LandingContentView,
  LandingPageView,
  NewsArticlePublic,
  NewsArticleView
} from "./landing.service";
import { CreateNewsDto } from "./dto/create-news.dto";
import { UpdateNewsDto } from "./dto/update-news.dto";
import { UpsertLandingContentDto } from "./dto/upsert-landing-content.dto";
import { Public } from "../../common/public.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";

/**
 * LandingController — konten landing page sekolah.
 * - GET /public/landing* → publik (tanpa auth) untuk halaman depan web.
 * - GET/PUT/POST/PATCH/DELETE /admin/landing* → landing:write:school
 *   (SUPERADMIN + OPERATOR; lihat prisma/seed-data/permissions.ts).
 */
@Controller()
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  // ---------- Publik ----------

  @Get("public/landing")
  @Public()
  getPublicLanding(): Promise<LandingPageView> {
    return this.landingService.getPublicLanding();
  }

  @Get("public/landing/berita")
  @Public()
  getPublicNews(@Query("category") category?: string): Promise<NewsArticlePublic[]> {
    return this.landingService.getPublicNews(category);
  }

  @Get("public/landing/berita/:slug")
  @Public()
  getPublicNewsBySlug(@Param("slug") slug: string): Promise<NewsArticleView> {
    return this.landingService.getPublicNewsBySlug(slug);
  }

  // ---------- Admin ----------

  @Get("admin/landing")
  @RequirePermission("landing:write:school")
  getAdminLanding(): Promise<LandingContentView[]> {
    return this.landingService.getAdminLanding();
  }

  @Get("admin/landing/berita")
  @RequirePermission("landing:write:school")
  getAdminNews(): Promise<NewsArticleView[]> {
    return this.landingService.getAdminNews();
  }

  @Put("admin/landing/:slug")
  @RequirePermission("landing:write:school")
  upsertLanding(
    @Param("slug") slug: string,
    @Body() dto: UpsertLandingContentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<LandingContentView> {
    return this.landingService.upsertLandingContent(slug, dto, user.id, req.ip, user.roles);
  }

  @Post("admin/landing/berita")
  @RequirePermission("landing:write:school")
  createNews(
    @Body() dto: CreateNewsDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<NewsArticleView> {
    return this.landingService.createNews(dto, user.id, req.ip, user.roles);
  }

  @Patch("admin/landing/berita/:id")
  @RequirePermission("landing:write:school")
  updateNews(
    @Param("id") id: string,
    @Body() dto: UpdateNewsDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<NewsArticleView> {
    return this.landingService.updateNews(id, dto, user.id, req.ip, user.roles);
  }

  @Delete("admin/landing/berita/:id")
  @RequirePermission("landing:write:school")
  deleteNews(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request
  ): Promise<void> {
    return this.landingService.deleteNews(id, user.id, req.ip, user.roles);
  }
}
