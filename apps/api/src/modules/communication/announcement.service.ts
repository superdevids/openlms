/**
 * AnnouncementService — pengumuman sekolah (prd04 §5.K).
 * Status diwakili published_at: null = draft, terisi = published.
 * RBAC enforced di CommunicationController (tulis/publish =
 * announcement:write:school; baca = announcement:read).
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { Announcement } from "@prisma/client";
import type { Role } from "@opensis/types";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { writeAudit, type AuditActorContext } from "../lms/lms-audit";
import { NotificationService } from "../notifications/notifications.service";

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  targetRoles: Role[];
  createdBy: string;
  pinned?: boolean;
  publishNow?: boolean;
}

@Injectable()
export class AnnouncementService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    private readonly notifications: NotificationService
  ) {}

  async create(input: CreateAnnouncementInput, actor: AuditActorContext): Promise<Announcement> {
    if (!input.title || !input.body) {
      throw new BadRequestException("title dan body wajib diisi");
    }
    if (!input.targetRoles || input.targetRoles.length === 0) {
      throw new BadRequestException("targetRoles minimal satu role");
    }
    const announcement = await this.db.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        target_role: input.targetRoles,
        pinned: input.pinned ?? false,
        published_at: input.publishNow ? new Date() : null,
        created_by: input.createdBy
      }
    });
    await writeAudit({
      ctx: actor,
      action: "CREATE",
      entity: "announcement",
      entityId: announcement.id,
      after: {
        title: announcement.title,
        target_role: announcement.target_role,
        published_at: announcement.published_at
      }
    });
    if (announcement.published_at) {
      await this.notifyPublished(announcement);
    }
    return announcement;
  }

  /** Broadcast read: hanya pengumuman terbit untuk role pemanggil. */
  async listForRole(role: Role): Promise<Announcement[]> {
    return this.db.announcement.findMany({
      where: {
        published_at: { not: null },
        target_role: { has: role }
      },
      orderBy: [{ pinned: "desc" }, { published_at: "desc" }]
    });
  }

  async publish(id: string): Promise<Announcement> {
    const announcement = await this.requireAnnouncement(id);
    if (announcement.published_at) {
      throw new ConflictException("Pengumuman sudah terbit");
    }
    const published = await this.db.announcement.update({
      where: { id },
      data: { published_at: new Date() }
    });
    await this.notifyPublished(published);
    return published;
  }

  async unpublish(id: string): Promise<Announcement> {
    const announcement = await this.requireAnnouncement(id);
    if (!announcement.published_at) {
      throw new ConflictException("Pengumuman belum terbit");
    }
    return this.db.announcement.update({ where: { id }, data: { published_at: null } });
  }

  async update(
    id: string,
    input: Partial<Pick<CreateAnnouncementInput, "title" | "body" | "targetRoles" | "pinned">>
  ): Promise<Announcement> {
    await this.requireAnnouncement(id);
    return this.db.announcement.update({
      where: { id },
      data: {
        title: input.title,
        body: input.body,
        target_role: input.targetRoles,
        pinned: input.pinned
      }
    });
  }

  async remove(id: string): Promise<Announcement> {
    await this.requireAnnouncement(id);
    return this.db.announcement.delete({ where: { id } });
  }

  /**
   * Kirim notifikasi + emit `announcement:new` (best-effort) ke seluruh user
   * dengan role target saat pengumuman terbit. NotificationService melakukan
   * persist bulk + push Socket.IO (notification:new + event domain).
   */
  private async notifyPublished(announcement: Announcement): Promise<void> {
    const roles = (announcement.target_role ?? []) as Role[];
    if (roles.length === 0) return;
    try {
      await this.notifications.createForRoles({
        roles,
        type: "ANNOUNCEMENT",
        title: announcement.title,
        body: announcement.body,
        data: { announcementId: announcement.id }
      });
    } catch {
      // notifikasi best-effort — jangan menggagalkan alur publish
    }
  }

  private async requireAnnouncement(id: string): Promise<Announcement> {
    const announcement = await this.db.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException("Pengumuman tidak ditemukan");
    return announcement;
  }
}
