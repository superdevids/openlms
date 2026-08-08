import type { NotificationType, Role } from "@opensis/types";

/**
 * Tipe lokal modul notifikasi.
 * JsonObject/JsonValue dipakai untuk kolom `data Json?` tanpa import langsung
 * dari @prisma/client (batas dependensi: apps/api → @opensis/database saja).
 */

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

/** Bentuk notifikasi yang dikembalikan REST (nama field camelCase). */
export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: JsonValue | null;
  readAt: Date | null;
  createdAt: Date;
}

/** Payload event `notification:new` / event domain (docs/02 §7.2). */
export interface NotificationPushPayload {
  /** Absen untuk broadcast (createMany) → klien refetch inbox via REST (event best-effort). */
  id?: string;
  type: NotificationType;
  title: string;
  body: string;
  data: JsonValue | null;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  data?: JsonObject | null;
}

export interface CreateNotificationForUserInput extends CreateNotificationInput {
  userId: string;
}

export interface CreateNotificationForRolesInput extends CreateNotificationInput {
  roles: Role[];
}

export interface InboxQuery {
  page: number;
  pageSize: number;
  unreadOnly: boolean;
}

export interface InboxResult {
  items: NotificationDto[];
  page: number;
  pageSize: number;
  total: number;
}
