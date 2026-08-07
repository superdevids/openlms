import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@openlms/database";
import type { NotificationType } from "@openlms/types";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { NOTIFICATION_NEW_EVENT, eventForType } from "./notification-events";
import type {
  CreateNotificationForRolesInput,
  CreateNotificationForUserInput,
  CreateNotificationInput,
  InboxQuery,
  InboxResult,
  JsonValue,
  NotificationDto,
  NotificationPushPayload
} from "./notifications.types";

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  data: true,
  read_at: true,
  created_at: true
} as const;

/** Baris hasil select minimal — struktural, tanpa import namespace Prisma. */
interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  read_at: Date | null;
  created_at: Date;
}

/**
 * NotificationService — pusat notifikasi (docs/02 §4.1 RealtimeModule + 04 §2.9).
 * Dipakai modul domain lain: createForUser / createForRoles / createForAll lalu
 * REST inbox per user. Event Socket.IO bersifat best-effort; DB adalah sumber kebenaran.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly realtime: RealtimeGateway) {}

  /** Buat satu notifikasi untuk satu user + push `notification:new` & event domain. */
  async createForUser(input: CreateNotificationForUserInput): Promise<NotificationDto> {
    const row = await prisma.notification.create({
      data: {
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        ...(input.data != null ? { data: input.data } : {})
      },
      select: NOTIFICATION_SELECT
    });
    const dto = this.toDto(row);
    this.push(input.userId, input.type, dto);
    return dto;
  }

  /** Buat notifikasi untuk semua user dengan role tertentu (status UserRole ACTIVE). */
  async createForRoles(input: CreateNotificationForRolesInput): Promise<number> {
    if (input.roles.length === 0) return 0;

    const rows = await prisma.userRole.findMany({
      where: { role: { in: input.roles }, status: "ACTIVE" },
      select: { user_id: true }
    });
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    if (userIds.length === 0) return 0;

    const count = await this.persistBulk(userIds, input);
    this.pushBroadcast(userIds, input.type, input);
    return count;
  }

  /** Broadcast ke semua user aktif (is_active) — pengumuman sekolah, dsb. */
  async createForAll(input: CreateNotificationInput): Promise<number> {
    const users = await prisma.user.findMany({
      where: { is_active: true },
      select: { id: true }
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) return 0;

    const count = await this.persistBulk(userIds, input);
    this.pushBroadcast(userIds, input.type, input);
    return count;
  }

  /** Inbox paginated per user, diurutkan terbaru dulu (index (user_id, read_at, created_at)). */
  async getInbox(userId: string, query: InboxQuery): Promise<InboxResult> {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const where = {
      user_id: userId,
      ...(query.unreadOnly ? { read_at: null } : {})
    };

    const [total, rows] = await prisma.$transaction([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: NOTIFICATION_SELECT
      })
    ]);

    return {
      items: rows.map((r) => this.toDto(r)),
      page,
      pageSize,
      total
    };
  }

  /** Jumlah belum dibaca (badge UI; index (user_id, read_at)). */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { user_id: userId, read_at: null } });
  }

  /** Tandai satu notifikasi dibaca; null bila bukan milik user / tidak ada (idempotent). */
  async markRead(userId: string, notificationId: string): Promise<NotificationDto | null> {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, user_id: userId },
      select: NOTIFICATION_SELECT
    });
    if (!existing) return null;
    if (existing.read_at) return this.toDto(existing);

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read_at: new Date() },
      select: NOTIFICATION_SELECT
    });
    return this.toDto(updated);
  }

  /** Tandai semua belum dibaca user sebagai sudah dibaca; return jumlah yang di-update. */
  async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() }
    });
    return result.count;
  }

  private async persistBulk(userIds: string[], input: CreateNotificationInput): Promise<number> {
    const result = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        user_id: userId,
        type: input.type,
        title: input.title,
        body: input.body,
        ...(input.data != null ? { data: input.data } : {})
      }))
    });
    return result.count;
  }

  private push(userId: string, type: NotificationType, dto: NotificationDto): void {
    const payload = this.toPushPayload(dto);
    this.realtime.emitToUser(userId, NOTIFICATION_NEW_EVENT, payload);
    this.realtime.emitToUser(userId, eventForType(type), payload);
  }

  private pushBroadcast(
    userIds: string[],
    type: NotificationType,
    input: CreateNotificationInput
  ): void {
    // createMany tidak mengembalikan id — payload tanpa id, klien refetch inbox via REST.
    const payload: NotificationPushPayload = {
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null
    };
    for (const userId of userIds) {
      this.realtime.emitToUser(userId, NOTIFICATION_NEW_EVENT, payload);
      this.realtime.emitToUser(userId, eventForType(type), payload);
    }
  }

  private toDto(row: NotificationRow): NotificationDto {
    return {
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      data: (row.data ?? null) as JsonValue | null,
      readAt: row.read_at,
      createdAt: row.created_at
    };
  }

  private toPushPayload(dto: NotificationDto): NotificationPushPayload {
    return { id: dto.id, type: dto.type, title: dto.title, body: dto.body, data: dto.data };
  }
}
