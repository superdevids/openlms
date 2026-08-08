import { Injectable, Logger } from "@nestjs/common";
import type { NotificationType } from "@opensis/types";
import { NotificationService } from "../../notifications/notifications.service";
import type { CreateNotificationInput } from "../../notifications/notifications.types";

/**
 * Payload job notifications.fanout.
 * mode: "roles" → kirim ke semua user ber-role tsb; "users" → daftar eksplisit;
 * "all" → semua user aktif. Field data opsional (JsonObject).
 */
export interface FanoutNotificationPayload {
  mode: "roles" | "users" | "all";
  roles?: string[];
  userIds?: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}

/**
 * NotificationsProcessor — fan-out notifikasi massal (bulk).
 * Memanfaatkan NotificationService (persist + push Socket.IO) yang sudah
 * idempoten-per-user; job ini hanya membongkar payload ke mode yang sesuai.
 */
@Injectable()
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notifications: NotificationService) {}

  async handle(payload: unknown): Promise<void> {
    const input = payload as FanoutNotificationPayload;
    if (!input || !input.type || !input.title || !input.body) {
      this.logger.warn("notifications.fanout: payload tidak lengkap, dilewati");
      return;
    }

    const base: CreateNotificationInput = {
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? null) as CreateNotificationInput["data"]
    };

    let count = 0;
    if (input.mode === "all") {
      count = await this.notifications.createForAll(base);
    } else if (input.mode === "roles" && Array.isArray(input.roles) && input.roles.length > 0) {
      count = await this.notifications.createForRoles({
        ...base,
        roles: input.roles as Parameters<NotificationService["createForRoles"]>[0]["roles"]
      });
    } else if (input.mode === "users" && Array.isArray(input.userIds)) {
      for (const userId of input.userIds) {
        await this.notifications.createForUser({ ...base, userId });
        count++;
      }
    } else {
      this.logger.warn("notifications.fanout: mode tidak dikenal, dilewati");
      return;
    }

    this.logger.log(`notifications.fanout ${input.type}: ${count} dikirim`);
  }
}
