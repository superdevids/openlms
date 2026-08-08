jest.mock("@opensis/database", () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    userRole: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    $transaction: jest.fn()
  }
}));

import { prisma } from "@opensis/database";
import type { RealtimeGateway } from "../../src/modules/realtime/realtime.gateway";
import {
  ASSIGNMENT_NEW_EVENT,
  NOTIFICATION_NEW_EVENT
} from "../../src/modules/notifications/notification-events";
import { NotificationService } from "../../src/modules/notifications/notifications.service";

interface NotificationModelMock {
  create: jest.Mock;
  createMany: jest.Mock;
  findMany: jest.Mock;
  findFirst: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
}

const notificationModel = prisma.notification as unknown as NotificationModelMock;
const userRoleModel = prisma.userRole as unknown as { findMany: jest.Mock };
const userModel = prisma.user as unknown as { findMany: jest.Mock };
const transaction = prisma.$transaction as unknown as jest.Mock;

describe("NotificationService (pusat notifikasi, docs/04 §2.9)", () => {
  let service: NotificationService;
  const realtime = { emitToUser: jest.fn() } as unknown as RealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService(realtime);
  });

  describe("createForUser", () => {
    it("menyimpan notifikasi & emit notification:new + event domain", async () => {
      const now = new Date("2026-08-07T08:00:00.000Z");
      notificationModel.create.mockResolvedValue({
        id: "notif_1",
        type: "TASK_NEW",
        title: "Tugas baru: Matematika",
        body: "Deadline Jumat 14:00",
        data: { assignmentId: "a1" },
        read_at: null,
        created_at: now
      });

      const dto = await service.createForUser({
        userId: "u1",
        type: "TASK_NEW",
        title: "Tugas baru: Matematika",
        body: "Deadline Jumat 14:00",
        data: { assignmentId: "a1" }
      });

      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: "u1",
            type: "TASK_NEW",
            title: "Tugas baru: Matematika",
            data: { assignmentId: "a1" }
          })
        })
      );
      expect(dto).toMatchObject({ id: "notif_1", readAt: null, createdAt: now });
      expect(realtime.emitToUser).toHaveBeenCalledWith(
        "u1",
        NOTIFICATION_NEW_EVENT,
        expect.objectContaining({ id: "notif_1", type: "TASK_NEW" })
      );
      expect(realtime.emitToUser).toHaveBeenCalledWith(
        "u1",
        ASSIGNMENT_NEW_EVENT,
        expect.objectContaining({ type: "TASK_NEW" })
      );
    });

    it("tidak menulis kolom data saat input data null (SQL NULL default)", async () => {
      notificationModel.create.mockResolvedValue({
        id: "notif_2",
        type: "ANNOUNCEMENT",
        title: "Libur",
        body: "17 Agustus",
        data: null,
        read_at: null,
        created_at: new Date()
      });

      await service.createForUser({
        userId: "u1",
        type: "ANNOUNCEMENT",
        title: "Libur",
        body: "17 Agustus",
        data: null
      });

      const createCall = notificationModel.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(createCall.data).not.toHaveProperty("data");
    });
  });

  describe("inbox & unread", () => {
    it("getInbox memakai pagination dan memetakan read_at → readAt", async () => {
      const now = new Date("2026-08-07T08:00:00.000Z");
      transaction.mockResolvedValue([
        5,
        [
          {
            id: "n1",
            type: "INVOICE_DUE",
            title: "SPP",
            body: "Agustus",
            data: { invoiceId: "i1" },
            read_at: null,
            created_at: now
          },
          {
            id: "n2",
            type: "ANNOUNCEMENT",
            title: "Libur",
            body: "17 Agustus",
            data: null,
            read_at: now,
            created_at: now
          }
        ]
      ]);

      const result = await service.getInbox("u1", { page: 2, pageSize: 10, unreadOnly: false });

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.readAt).toBeNull();
      expect(result.items[1]!.readAt).toEqual(now);
      expect(notificationModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10, orderBy: { created_at: "desc" } })
      );
    });

    it("getUnreadCount menghitung hanya read_at null", async () => {
      notificationModel.count.mockResolvedValue(3);
      await expect(service.getUnreadCount("u1")).resolves.toBe(3);
      expect(notificationModel.count).toHaveBeenCalledWith({
        where: { user_id: "u1", read_at: null }
      });
    });
  });

  describe("markRead / markAllRead", () => {
    it("markRead tidak mengubah milik user lain (tidak ditemukan)", async () => {
      notificationModel.findFirst.mockResolvedValue(null);

      const result = await service.markRead("u1", "notif_x");

      expect(result).toBeNull();
      expect(notificationModel.update).not.toHaveBeenCalled();
    });

    it("markRead idempotent bila sudah dibaca", async () => {
      const readAt = new Date("2026-08-06T10:00:00.000Z");
      notificationModel.findFirst.mockResolvedValue({
        id: "n1",
        type: "EXAM_START",
        title: "Ujian",
        body: "PTS",
        data: null,
        read_at: readAt,
        created_at: new Date()
      });

      const result = await service.markRead("u1", "n1");

      expect(result?.readAt).toEqual(readAt);
      expect(notificationModel.update).not.toHaveBeenCalled();
    });

    it("markRead menandai read_at pada notifikasi belum dibaca", async () => {
      const now = new Date("2026-08-07T08:00:00.000Z");
      notificationModel.findFirst.mockResolvedValue({
        id: "n1",
        type: "PAYMENT_CONFIRMED",
        title: "Pembayaran",
        body: "Terverifikasi",
        data: null,
        read_at: null,
        created_at: now
      });
      notificationModel.update.mockResolvedValue({
        id: "n1",
        type: "PAYMENT_CONFIRMED",
        title: "Pembayaran",
        body: "Terverifikasi",
        data: null,
        read_at: now,
        created_at: now
      });

      const result = await service.markRead("u1", "n1");

      expect(notificationModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "n1" },
          data: { read_at: expect.any(Date) }
        })
      );
      expect(result?.readAt).toEqual(now);
    });

    it("markAllRead mengembalikan jumlah yang di-update", async () => {
      notificationModel.updateMany.mockResolvedValue({ count: 4 });

      await expect(service.markAllRead("u1")).resolves.toBe(4);
      expect(notificationModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: "u1", read_at: null },
          data: { read_at: expect.any(Date) }
        })
      );
    });
  });

  describe("createForRoles / createForAll", () => {
    it("createForRoles hanya menyasar role ACTIVE dan dedupe user multi-role", async () => {
      userRoleModel.findMany.mockResolvedValue([
        { user_id: "u1" },
        { user_id: "u2" },
        { user_id: "u1" }
      ]);
      notificationModel.createMany.mockResolvedValue({ count: 2 });

      const count = await service.createForRoles({
        roles: ["GURU", "BK"],
        type: "ANNOUNCEMENT",
        title: "Rapat Guru",
        body: "Senin 07:30"
      });

      expect(count).toBe(2);
      expect(userRoleModel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: { in: ["GURU", "BK"] }, status: "ACTIVE" } })
      );
      expect(notificationModel.createMany).toHaveBeenCalledTimes(1);

      // dedupe: tiap user menerima persis satu event notification:new
      const newEventCalls = (realtime.emitToUser as jest.Mock).mock.calls.filter(
        (c) => c[1] === NOTIFICATION_NEW_EVENT
      );
      const targets = [...newEventCalls.map((c) => c[0])].sort();
      expect(targets).toEqual(["u1", "u2"]);
    });

    it("createForRoles langsung 0 bila daftar role kosong", async () => {
      await expect(
        service.createForRoles({ roles: [], type: "ANNOUNCEMENT", title: "x", body: "y" })
      ).resolves.toBe(0);
      expect(userRoleModel.findMany).not.toHaveBeenCalled();
    });

    it("createForAll menyasar semua user aktif", async () => {
      userModel.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }, { id: "u3" }]);
      notificationModel.createMany.mockResolvedValue({ count: 3 });

      const count = await service.createForAll({
        type: "ANNOUNCEMENT",
        title: "Libur",
        body: "17 Agustus"
      });

      expect(count).toBe(3);
      expect(userModel.findMany).toHaveBeenCalledWith({
        where: { is_active: true },
        select: { id: true }
      });
    });
  });
});
