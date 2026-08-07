import { Controller, Get, Param, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { NotificationService } from "./notifications.service";
import type { InboxResult, NotificationDto } from "./notifications.types";
import { InboxQueryDto } from "./dto/inbox-query.dto";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { RequirePermission } from "../../common/require-permission.decorator";

/**
 * NotificationsController — notification center (docs/04 §2.9).
 * Endpoint: GET /notifications, GET /notifications/unread-count,
 * POST /notifications/:id/read, POST /notifications/read-all.
 * Identitas user diambil dari request.requestContext (AuthGuard), tidak
 * pernah dari header klien. Hanya data notifikasi milik user itu sendiri.
 */
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @RequirePermission("notification:read:self")
  async inbox(
    @Req() req: AuthenticatedRequest,
    @Query() query: InboxQueryDto
  ): Promise<InboxResult> {
    const userId = this.currentUserId(req);
    return this.notifications.getInbox(userId, {
      page: this.parsePositiveInt(query.page, 1),
      pageSize: this.parsePositiveInt(query.pageSize, 20),
      unreadOnly: this.parseBoolean(query.unreadOnly, false)
    });
  }

  @Get("unread-count")
  @RequirePermission("notification:read:self")
  async unreadCount(@Req() req: AuthenticatedRequest): Promise<{ count: number }> {
    const userId = this.currentUserId(req);
    return { count: await this.notifications.getUnreadCount(userId) };
  }

  @Post(":id/read")
  @RequirePermission("notification:mark-read:self")
  async markRead(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string
  ): Promise<NotificationDto | null> {
    const userId = this.currentUserId(req);
    return this.notifications.markRead(userId, id);
  }

  @Post("read-all")
  @RequirePermission("notification:mark-read:self")
  async markAllRead(@Req() req: AuthenticatedRequest): Promise<{ count: number }> {
    const userId = this.currentUserId(req);
    return { count: await this.notifications.markAllRead(userId) };
  }

  private currentUserId(req: AuthenticatedRequest): string {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return ctx.userId;
  }

  private parsePositiveInt(value: unknown, fallback: number): number {
    const parsed = typeof value === "string" ? Number(value) : Number.NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    return fallback;
  }
}
