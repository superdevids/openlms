/**
 * Integration test (ringan, TANPA PostgreSQL) — rantai modul:
 * NotificationService (createForRoles) → event Socket.IO → useUnread refetch
 * dibayangkan via payload; dan JobsService + InProcessQueue end-to-end.
 * Prisma & RealtimeGateway di-mock (tidak menyentuh DB).
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
import { NotificationService } from "../../src/modules/notifications/notifications.service";
import type { RealtimeGateway } from "../../src/modules/realtime/realtime.gateway";
import { NOTIFICATION_NEW_EVENT } from "../../src/modules/notifications/notification-events";
import { InProcessQueue } from "../../src/modules/queue/in-process.queue";
import { JobsService } from "../../src/modules/jobs/jobs.service";

const flushImmediate = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe("INTEGRATION (ringan) — alur notifikasi → realtime fanout", () => {
  it("createForRoles menghasilkan createMany + event notification:new per user", async () => {
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
      { user_id: "u1" },
      { user_id: "u2" },
      { user_id: "u1" } // duplikat di-dedupe
    ]);
    (prisma.notification.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    const realtime = { emitToUser: jest.fn() } as unknown as RealtimeGateway;
    const service = new NotificationService(realtime);
    const count = await service.createForRoles({
      roles: ["GURU", "BK"],
      type: "ANNOUNCEMENT",
      title: "Rapat",
      body: "Senin 07:30"
    });

    expect(count).toBe(2);
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    // 2 user × (notification:new + event domain) = 4 emit
    expect((realtime.emitToUser as jest.Mock).mock.calls.length).toBe(4);
    const newEvents = (realtime.emitToUser as jest.Mock).mock.calls.filter(
      (c) => c[1] === NOTIFICATION_NEW_EVENT
    );
    expect(newEvents.map((c) => c[0]).sort()).toEqual(["u1", "u2"]);
  });

  it("createForUser mengirim event domain yang konsisten dengan payload", async () => {
    const now = new Date("2026-08-07T08:00:00.000Z");
    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: "n1",
      type: "EXAM_START",
      title: "Ujian",
      body: "PTS",
      data: { examId: "e1" },
      read_at: null,
      created_at: now
    });

    const realtime = { emitToUser: jest.fn() } as unknown as RealtimeGateway;
    const service = new NotificationService(realtime);
    await service.createForUser({
      userId: "u1",
      type: "EXAM_START",
      title: "Ujian",
      body: "PTS",
      data: { examId: "e1" }
    });

    const events = (realtime.emitToUser as jest.Mock).mock.calls.map((c) => c[1]);
    expect(events).toContain(NOTIFICATION_NEW_EVENT);
    expect(events).toContain("exam:start");
  });
});

describe("INTEGRATION (ringan) — JobsService + InProcessQueue end-to-end", () => {
  it("enqueue SPP via helper → handler processor dieksekusi via queue", async () => {
    const queue = new InProcessQueue();
    const sppScheduler = { generateSpp: jest.fn().mockResolvedValue({ generated: 3, skipped: 0 }) };
    const processors = {
      notifications: { handle: jest.fn() },
      payroll: { handle: jest.fn() },
      rollover: { handle: jest.fn() },
      report: { handle: jest.fn() },
      spp: {
        handle: jest.fn().mockImplementation((p: unknown) => {
          const input = p as { period: string };
          return sppScheduler.generateSpp(input.period, "0", undefined, undefined, "system");
        })
      },
      examAutoSubmit: { handle: jest.fn() },
      importProcessor: { handle: jest.fn() }
    };

    const service = new JobsService(
      queue as never,
      processors.notifications as never,
      processors.payroll as never,
      processors.rollover as never,
      processors.report as never,
      processors.spp as never,
      processors.examAutoSubmit as never,
      processors.importProcessor as never
    );
    service.onModuleInit();

    await service.generateSpp({ period: "2026-08" });
    await flushImmediate();
    await flushImmediate();

    expect(sppScheduler.generateSpp).toHaveBeenCalledWith(
      "2026-08",
      "0",
      undefined,
      undefined,
      "system"
    );
    expect(queue.isReady()).toBe(true);
    queue.onModuleDestroy();
  });

  it("helper fanoutNotifications tidak throw tanpa handler terdaftar", async () => {
    const queue = new InProcessQueue();
    const processors = {
      notifications: { handle: jest.fn() },
      payroll: { handle: jest.fn() },
      rollover: { handle: jest.fn() },
      report: { handle: jest.fn() },
      spp: { handle: jest.fn() },
      examAutoSubmit: { handle: jest.fn() },
      importProcessor: { handle: jest.fn() }
    };
    const service = new JobsService(
      queue as never,
      processors.notifications as never,
      processors.payroll as never,
      processors.rollover as never,
      processors.report as never,
      processors.spp as never,
      processors.examAutoSubmit as never,
      processors.importProcessor as never
    );
    service.onModuleInit();

    await expect(
      service.fanoutNotifications({ type: "TASK_NEW", roles: ["SISWA"], title: "t", body: "b" })
    ).resolves.toBeUndefined();
    await flushImmediate();
    expect(processors.notifications.handle).toHaveBeenCalled();
    queue.onModuleDestroy();
  });
});
