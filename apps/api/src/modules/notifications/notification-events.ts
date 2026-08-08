import type { NotificationType } from "@openlms/types";

/**
 * Registry nama event Socket.IO (docs/02 §7.2, prd04 §5.M).
 * Semua event real-time bersifat BEST-EFFORT: sumber kebenaran tetap REST API.
 * Modul domain memakai event di sini — jangan hardcode nama event di service lain.
 */

/** Push inbox generik: dikirim setiap kali notifikasi dibuat (payload NotificationPushPayload). */
export const NOTIFICATION_NEW_EVENT = "notification:new";

export const ASSIGNMENT_NEW_EVENT = "assignment:new";
export const ASSIGNMENT_GRADED_EVENT = "assignment:graded";
export const EXAM_START_EVENT = "exam:start";
export const EXAM_TIME_WARNING_EVENT = "exam:time-warning";
export const EXAM_AUTOSAVE_OK_EVENT = "exam:autosave-ok";
export const EXAM_FORCE_SUBMIT_EVENT = "exam:force-submit";
/** Sisa waktu server-authoritative untuk room ujian (R-29; dikirim per ambang 60/30/10/0). */
export const EXAM_TICK_EVENT = "exam:tick";
export const ATTENDANCE_ALPA_EVENT = "attendance:alpa";
export const ATTENDANCE_SESSION_CLOSED_EVENT = "attendance:session-closed";
export const INVOICE_DUE_EVENT = "invoice:due";
export const PAYMENT_CONFIRMED_EVENT = "payment:confirmed";
export const ANNOUNCEMENT_NEW_EVENT = "announcement:new";
export const LETTER_STATUS_EVENT = "letter:status";
export const LIBRARY_DUE_EVENT = "library:due";
export const DISCIPLINE_RECORDED_EVENT = "discipline:recorded";
export const PPDB_STATUS_EVENT = "ppdb:status";
export const ASSET_APPROVED_EVENT = "asset:approved";
export const BK_REMINDER_EVENT = "bk:reminder";
export const EXPORT_READY_EVENT = "export:ready";

/** Event client → server (contoh: autosave ujian; REST tetap fallback utama). */
export const EXAM_ANSWER_SAVE_EVENT = "exam:answer:save";

/**
 * Mapping tipe notifikasi (kolom `type` entitas Notification) → event Socket.IO utama.
 * Record lengkap: penambahan tipe baru di schema.prisma akan memaksa update di sini.
 */
export const NOTIFICATION_TYPE_TO_EVENT: Record<NotificationType, string> = {
  TASK_NEW: ASSIGNMENT_NEW_EVENT,
  TASK_GRADED: ASSIGNMENT_GRADED_EVENT,
  EXAM_START: EXAM_START_EVENT,
  EXAM_AUTOSUBMIT: EXAM_FORCE_SUBMIT_EVENT,
  ATTENDANCE_ALPA: ATTENDANCE_ALPA_EVENT,
  INVOICE_DUE: INVOICE_DUE_EVENT,
  PAYMENT_CONFIRMED: PAYMENT_CONFIRMED_EVENT,
  PPDB_STATUS: PPDB_STATUS_EVENT,
  ANNOUNCEMENT: ANNOUNCEMENT_NEW_EVENT,
  LETTER_STATUS: LETTER_STATUS_EVENT,
  LIBRARY_DUE: LIBRARY_DUE_EVENT,
  ASSET_APPROVED: ASSET_APPROVED_EVENT,
  DISCIPLINE: DISCIPLINE_RECORDED_EVENT,
  BK_REMINDER: BK_REMINDER_EVENT,
  EXPORT_READY: EXPORT_READY_EVENT
};

/** Event default untuk tipe notifikasi (selalu terdefinisi — map lengkap dijamin compiler). */
export function eventForType(type: NotificationType): string {
  return NOTIFICATION_TYPE_TO_EVENT[type];
}

/** Semua event server→client yang sah (referensi dokumentasi/validasi klien). */
export const SERVER_EVENTS: readonly string[] = [
  NOTIFICATION_NEW_EVENT,
  ASSIGNMENT_NEW_EVENT,
  ASSIGNMENT_GRADED_EVENT,
  EXAM_START_EVENT,
  EXAM_TIME_WARNING_EVENT,
  EXAM_AUTOSAVE_OK_EVENT,
  EXAM_FORCE_SUBMIT_EVENT,
  EXAM_TICK_EVENT,
  ATTENDANCE_ALPA_EVENT,
  ATTENDANCE_SESSION_CLOSED_EVENT,
  INVOICE_DUE_EVENT,
  PAYMENT_CONFIRMED_EVENT,
  ANNOUNCEMENT_NEW_EVENT,
  LETTER_STATUS_EVENT,
  LIBRARY_DUE_EVENT,
  DISCIPLINE_RECORDED_EVENT,
  PPDB_STATUS_EVENT,
  ASSET_APPROVED_EVENT,
  BK_REMINDER_EVENT,
  EXPORT_READY_EVENT
] as const;

/** Semua event client → server yang didukung gateway /ws. */
export const CLIENT_EVENTS: readonly string[] = [
  EXAM_ANSWER_SAVE_EVENT,
  "room:join",
  "room:leave"
] as const;
