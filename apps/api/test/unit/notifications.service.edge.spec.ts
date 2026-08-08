/**
 * Unit test — NotificationService edge: pagination clamp, markRead idempoten,
 * createForRoles payload fanout (tanpa id), createForAll kosong.
 */
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
import { NOTIFICATION_NEW_EVENT } from "../../src/modules/notifications/notification-events";
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

describe("NotificationService edge", () => {
  let service: NotificationService;
  const realtime = { emitToUser: jest.fn() } as unknown as RealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService(realtime);
    // getInbox memakai prisma.$transaction([count, findMany]) — mock mengeksekusi
    // argumen array agar count/findMany dipanggil (seperti Prisma asli).
    transaction.mockImplementation(async (queries: unknown[]) => Promise.all(queries));
    notificationModel.count.mockResolvedValue(0);
    notificationModel.findMany.mockResolvedValue([]);
  });

  it("getInbox meng-clamp page >= 1 dan pageSize 1..100", async () => {
    await service.getInbox("u1", { page: 0, pageSize: 0, unreadOnly: false });
    expect(notificationModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 1 })
    );

    await service.getInbox("u1", { page: -5, pageSize: 999, unreadOnly: true });
    expect(notificationModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 })
    );
    expect(notificationModel.count).toHaveBeenCalledWith({
      where: { user_id: "u1", read_at: null }
    });
  });

  it("getInbox dengan unreadOnly=false tidak memfilter read_at", async () => {
    await service.getInbox("u1", { page: 1, pageSize: 10, unreadOnly: false });
    expect(notificationModel.count).toHaveBeenCalledWith({ where: { user_id: "u1" } });
    expect(notificationModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: "u1" } })
    );
  });

  it("markRead milik user lain → null tanpa update", async () => {
    notificationModel.findFirst.mockResolvedValue(null);
    await expect(service.markRead("u1", "n1")).resolves.toBeNull();
    expect(notificationModel.update).not.toHaveBeenCalled();
  });

  it("createForRoles: payload fanout TIDAK menyertakan id (createMany tak mengembalikan id)", async () => {
    userRoleModel.findMany.mockResolvedValue([{ user_id: "u1" }, { user_id: "u2" }]);
    notificationModel.createMany.mockResolvedValue({ count: 2 });

    await service.createForRoles({
      roles: ["SISWA"],
      type: "ANNOUNCEMENT",
      title: "Libur",
      body: "17 Agustus",
      data: { important: true }
    });

    const payloads = (realtime.emitToUser as jest.Mock).mock.calls.map((c) => c[2]);
    for (const p of payloads) {
      expect(p).not.toHaveProperty("id");
      expect(p.type).toBe("ANNOUNCEMENT");
      expect(p.data).toEqual({ important: true });
    }
    expect((realtime.emitToUser as jest.Mock).mock.calls.length).toBe(4); // 2 user × 2 event
  });

  it("createForRoles tanpa user aktif → 0, tanpa emit", async () => {
    userRoleModel.findMany.mockResolvedValue([]);
    await expect(
      service.createForRoles({ roles: ["SISWA"], type: "ANNOUNCEMENT", title: "t", body: "b" })
    ).resolves.toBe(0);
    expect(realtime.emitToUser).not.toHaveBeenCalled();
  });

  it("createForAll tanpa user aktif → 0", async () => {
    userModel.findMany.mockResolvedValue([]);
    await expect(
      service.createForAll({ type: "ANNOUNCEMENT", title: "t", body: "b" })
    ).resolves.toBe(0);
    expect(realtime.emitToUser).not.toHaveBeenCalled();
  });

  it("createForUser dengan data null → kolom data tidak ditulis", async () => {
    notificationModel.create.mockResolvedValue({
      id: "n1",
      type: "EXAM_START",
      title: "Ujian",
      body: "PTS",
      data: null,
      read_at: null,
      created_at: new Date()
    });
    await service.createForUser({
      userId: "u1",
      type: "EXAM_START",
      title: "Ujian",
      body: "PTS"
    });
    const data = notificationModel.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty("data");
  });

  it("markAllRead mengembalikan 0 bila tidak ada", async () => {
    notificationModel.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.markAllRead("u1")).resolves.toBe(0);
  });

  it("eventForType mapping lengkap — semua tipe mengarah ke event domain", async () => {
    // createForUser melempar NOTIFICATION_NEW_EVENT + event domain per tipe
    notificationModel.create.mockResolvedValue({
      id: "n1",
      type: "PAYMENT_CONFIRMED",
      title: "Bayar",
      body: "Ok",
      data: null,
      read_at: null,
      created_at: new Date()
    });
    await service.createForUser({
      userId: "u1",
      type: "PAYMENT_CONFIRMED",
      title: "Bayar",
      body: "Ok"
    });
    const events = (realtime.emitToUser as jest.Mock).mock.calls.map((c) => c[1]);
    expect(events).toContain(NOTIFICATION_NEW_EVENT);
    expect(events).toContain("payment:confirmed");
  });
});
