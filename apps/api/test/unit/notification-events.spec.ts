import { NOTIFICATION_TYPE_VALUES } from "@openlms/types";
import {
  ANNOUNCEMENT_NEW_EVENT,
  ASSIGNMENT_GRADED_EVENT,
  ASSIGNMENT_NEW_EVENT,
  ATTENDANCE_ALPA_EVENT,
  ATTENDANCE_CHECKED_IN_EVENT,
  BRANDING_CHANGED_EVENT,
  CHANGE_LOG_NEW_EVENT,
  EXAM_FORCE_SUBMIT_EVENT,
  EXAM_START_EVENT,
  EXAM_TICK_EVENT,
  INVOICE_DUE_EVENT,
  NOTIFICATION_NEW_EVENT,
  NOTIFICATION_TYPE_TO_EVENT,
  PAYMENT_CONFIRMED_EVENT,
  SERVER_EVENTS,
  eventForType
} from "../../src/modules/notifications/notification-events";

describe("notification-events (registry nama event Socket.IO, docs/02 §7.2)", () => {
  it("semua NotificationType terpetakan ke event non-kosong", () => {
    for (const type of NOTIFICATION_TYPE_VALUES) {
      const event = NOTIFICATION_TYPE_TO_EVENT[type];
      expect(event).toBeTruthy();
      expect(typeof event).toBe("string");
      // event domain tidak pernah menimpa event inbox generik
      expect(event).not.toBe(NOTIFICATION_NEW_EVENT);
    }
  });

  it("mapping tipe kunci sesuai daftar event standar", () => {
    expect(NOTIFICATION_TYPE_TO_EVENT.TASK_NEW).toBe(ASSIGNMENT_NEW_EVENT);
    expect(NOTIFICATION_TYPE_TO_EVENT.TASK_GRADED).toBe(ASSIGNMENT_GRADED_EVENT);
    expect(NOTIFICATION_TYPE_TO_EVENT.EXAM_START).toBe(EXAM_START_EVENT);
    expect(NOTIFICATION_TYPE_TO_EVENT.EXAM_AUTOSUBMIT).toBe(EXAM_FORCE_SUBMIT_EVENT);
    expect(NOTIFICATION_TYPE_TO_EVENT.ATTENDANCE_ALPA).toBe(ATTENDANCE_ALPA_EVENT);
    expect(NOTIFICATION_TYPE_TO_EVENT.INVOICE_DUE).toBe(INVOICE_DUE_EVENT);
    expect(NOTIFICATION_TYPE_TO_EVENT.PAYMENT_CONFIRMED).toBe(PAYMENT_CONFIRMED_EVENT);
    expect(NOTIFICATION_TYPE_TO_EVENT.ANNOUNCEMENT).toBe(ANNOUNCEMENT_NEW_EVENT);
  });

  it("eventForType mengembalikan event yang terdaftar", () => {
    expect(eventForType("DISCIPLINE")).toBe("discipline:recorded");
    expect(eventForType("EXPORT_READY")).toBe("export:ready");
    expect(eventForType("BK_REMINDER")).toBe("bk:reminder");
  });

  it("SERVER_EVENTS unik dan memakai format domain:aksi", () => {
    expect(new Set(SERVER_EVENTS).size).toBe(SERVER_EVENTS.length);
    for (const event of SERVER_EVENTS) {
      expect(event).toMatch(/^[a-z]+:[a-z0-9-]+$/);
    }
  });

  it("event realtime baru terdaftar dengan nama kontrak (R-11/changelog + QR check-in + branding)", () => {
    expect(CHANGE_LOG_NEW_EVENT).toBe("changelog:new");
    expect(ATTENDANCE_CHECKED_IN_EVENT).toBe("attendance:checked-in");
    expect(BRANDING_CHANGED_EVENT).toBe("branding:changed");
    expect(EXAM_TICK_EVENT).toBe("exam:tick");
    expect(EXAM_FORCE_SUBMIT_EVENT).toBe("exam:force-submit");
    for (const event of [
      CHANGE_LOG_NEW_EVENT,
      ATTENDANCE_CHECKED_IN_EVENT,
      BRANDING_CHANGED_EVENT,
      EXAM_TICK_EVENT,
      EXAM_FORCE_SUBMIT_EVENT,
      NOTIFICATION_NEW_EVENT
    ]) {
      expect(SERVER_EVENTS).toContain(event);
    }
  });
});
