/**
 * Unit test — RealtimeGateway: room helpers, sanitizeRoom (via handleRoomJoin),
 * emitter audit changelog:new. Murni unit — Socket.IO di-mock, tanpa DB hidup.
 */
const PRISMA_MOCK = {
  classSubject: { findMany: jest.fn() },
  enrollment: { findMany: jest.fn() },
  class: { findFirst: jest.fn() },
  examSession: { findUnique: jest.fn() },
  userRole: { findMany: jest.fn() }
};

jest.mock("@opensis/database", () => ({ prisma: PRISMA_MOCK }));
jest.mock("socket.io", () => ({}));
jest.mock("@socket.io/redis-adapter", () => ({ createAdapter: jest.fn() }));
jest.mock("../../src/common/cors.util", () => ({
  allowedOrigins: jest.fn(() => ["http://localhost:3000"]),
  DEFAULT_CORS_ORIGINS: ["http://localhost:3000"]
}));
jest.mock("ioredis", () => {
  return class MockRedis {
    duplicate() {
      return this;
    }
    on() {
      return this;
    }
    quit() {
      return Promise.resolve();
    }
    disconnect() {}
  };
});
jest.mock("../../src/modules/realtime/realtime.auth", () => {
  class FakeRealtimeAuthService {
    authenticate = jest.fn();
  }
  return { RealtimeAuthService: FakeRealtimeAuthService };
});

import type { Socket } from "socket.io";
import {
  classRoom,
  examRoom,
  notifyAuditChange,
  registerAuditChangeEmitter,
  REALTIME_NAMESPACE,
  userRoom
} from "../../src/modules/realtime/realtime.gateway";
import { RealtimeGateway } from "../../src/modules/realtime/realtime.gateway";
import { RealtimeAuthService } from "../../src/modules/realtime/realtime.auth";
import { ScopeResolver } from "../../src/common/scope-resolver";
import { CHANGE_LOG_NEW_EVENT } from "../../src/modules/notifications/notification-events";

function makeSocket(overrides: Record<string, unknown> = {}): Socket {
  return {
    id: "socket_1",
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    rooms: new Set(),
    ...overrides
  } as unknown as Socket;
}

describe("RealtimeGateway — room helpers (docs/02 §7.1)", () => {
  it("REALTIME_NAMESPACE adalah /ws", () => {
    expect(REALTIME_NAMESPACE).toBe("/ws");
  });

  it("userRoom mengembalikan room user:{userId}", () => {
    expect(userRoom("u1")).toBe("user:u1");
  });

  it("classRoom mengembalikan room class:{classId}", () => {
    expect(classRoom("c1")).toBe("class:c1");
  });

  it("examRoom mengembalikan room exam:{examSessionId}", () => {
    expect(examRoom("e1")).toBe("exam:e1");
  });

  it("room helpers aman untuk id berisi karakter aneh (tidak di-escape)", () => {
    expect(userRoom("usr a/b?")).toBe("user:usr a/b?");
  });
});

describe("RealtimeGateway — handleRoomJoin (sanitizeRoom + RBAC)", () => {
  let gateway: RealtimeGateway;
  let auth: RealtimeAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Cache scope resolver bersifat static (module-level) — bersihkan agar
    // hasil test sebelumnya tidak bocor ke test berikutnya.
    ScopeResolver.invalidateAllScope();
    auth = new RealtimeAuthService();
    (auth.authenticate as jest.Mock).mockResolvedValue({
      userId: "u1",
      roles: ["SISWA"]
    });
    gateway = new RealtimeGateway(auth);
    // ScopeResolver memakai prisma mock — kelas kosong berarti bukan member.
    (PRISMA_MOCK.classSubject.findMany as jest.Mock).mockResolvedValue([]);
    (PRISMA_MOCK.enrollment.findMany as jest.Mock).mockResolvedValue([]);
    (PRISMA_MOCK.class.findFirst as jest.Mock).mockResolvedValue(null);
    (PRISMA_MOCK.examSession.findUnique as jest.Mock).mockResolvedValue(null);
  });

  // handleRoomJoin membaca socket.data.user (dipakai handleConnection untuk men-set).
  const authedSocket = (roles: string[] = ["SISWA"]): Socket =>
    makeSocket({ data: { user: { userId: "u1", roles } } });

  it("room:join dengan room tidak valid → emit INVALID_ROOM, tanpa join", async () => {
    const socket = authedSocket();
    await gateway.handleRoomJoin(socket, { room: "arbitrer" });
    expect(socket.emit).toHaveBeenCalledWith("error", { code: "INVALID_ROOM" });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("room kosong / undefined / bukan string → INVALID_ROOM", async () => {
    for (const body of [undefined, {}, { room: undefined }, { room: "" }, { room: "  " }]) {
      const socket = authedSocket();
      await gateway.handleRoomJoin(socket, body);
      expect(socket.emit).toHaveBeenCalledWith("error", { code: "INVALID_ROOM" });
    }
  });

  it("room class valid tapi user tanpa keanggotaan → FORBIDDEN", async () => {
    const socket = authedSocket();
    await gateway.handleRoomJoin(socket, { room: "class:c1" });
    expect(socket.emit).toHaveBeenCalledWith("error", { code: "FORBIDDEN", room: "class:c1" });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("room exam valid tapi sesi tidak ditemukan → FORBIDDEN", async () => {
    const socket = authedSocket();
    await gateway.handleRoomJoin(socket, { room: "exam:sesi1" });
    expect(socket.emit).toHaveBeenCalledWith("error", { code: "FORBIDDEN", room: "exam:sesi1" });
  });

  it("room class: tanpa id (hanya prefix) → INVALID_ROOM", async () => {
    const socket = authedSocket();
    await gateway.handleRoomJoin(socket, { room: "class:" });
    expect(socket.emit).toHaveBeenCalledWith("error", { code: "INVALID_ROOM" });
  });

  it("role sekolah (SUPERADMIN) bypass cek keanggotaan → join berhasil", async () => {
    const socket = authedSocket(["SUPERADMIN"]);
    await gateway.handleRoomJoin(socket, { room: "class:c1" });
    expect(socket.join).toHaveBeenCalledWith("class:c1");
    expect(socket.emit).toHaveBeenCalledWith("room:joined", { room: "class:c1" });
  });

  it("SISWA anggota kelas (enrollment ACTIVE) → join berhasil", async () => {
    (PRISMA_MOCK.enrollment.findMany as jest.Mock).mockResolvedValue([{ class_id: "c1" }]);
    const socket = authedSocket();
    await gateway.handleRoomJoin(socket, { room: "class:c1" });
    expect(socket.join).toHaveBeenCalledWith("class:c1");
  });

  it("SISWA yang jadi wali kelas (homeroom) → join berhasil", async () => {
    (PRISMA_MOCK.class.findFirst as jest.Mock).mockResolvedValue({ id: "c9" });
    const socket = authedSocket();
    await gateway.handleRoomJoin(socket, { room: "class:c9" });
    expect(socket.join).toHaveBeenCalledWith("class:c9");
  });

  it("GURU pengampu sesi ujian → join room exam berhasil", async () => {
    (PRISMA_MOCK.examSession.findUnique as jest.Mock).mockResolvedValue({
      exam: { class_subject: { class_id: "c1", teacher_id: "guru1" } }
    });
    const socket = authedSocket(["GURU"]);
    // userId harus sama dengan teacher_id agar bypass keanggotaan kelas.
    socket.data.user = { userId: "guru1", roles: ["GURU"] };
    await gateway.handleRoomJoin(socket, { room: "exam:sesi1" });
    expect(socket.join).toHaveBeenCalledWith("exam:sesi1");
  });

  it("tanpa user terautentikasi di socket.data → UNAUTHORIZED", async () => {
    const socket = makeSocket({ data: {} });
    await gateway.handleRoomJoin(socket, { room: "class:c1" });
    expect(socket.emit).toHaveBeenCalledWith("error", { code: "UNAUTHORIZED" });
  });

  it("room:leave melepas room hanya bila valid", async () => {
    const socket = authedSocket();
    await gateway.handleRoomLeave(socket, { room: "class:c1" });
    expect(socket.leave).toHaveBeenCalledWith("class:c1");

    await gateway.handleRoomLeave(socket, { room: "arbitrer" });
    expect(socket.leave).toHaveBeenCalledTimes(1);
  });
});

describe("RealtimeGateway — emit helpers & changelog emitter", () => {
  let gateway: RealtimeGateway;
  let auth: RealtimeAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    auth = new RealtimeAuthService();
    gateway = new RealtimeGateway(auth);
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      emit: jest.fn()
    } as never;
  });

  it("emitToUser meneruskan ke room user + event + payload", () => {
    const toMock = gateway.server.to as jest.Mock;
    gateway.emitToUser("u1", "ev", { a: 1 });
    expect(toMock).toHaveBeenCalledWith("user:u1");
    const roomMock = toMock.mock.results[0]?.value as { emit: jest.Mock };
    expect(roomMock.emit).toHaveBeenCalledWith("ev", { a: 1 });
  });

  it("emitToClass / emitToExam menggunakan prefix room yang benar", () => {
    const toMock = gateway.server.to as jest.Mock;
    gateway.emitToClass("c1", "e", "p");
    expect(toMock).toHaveBeenCalledWith("class:c1");
    gateway.emitToExam("s1", "e", "p");
    expect(toMock).toHaveBeenCalledWith("exam:s1");
  });

  it("emitToAll broadcast global", () => {
    const emitMock = gateway.server.emit as jest.Mock;
    gateway.emitToAll("global", { v: 1 });
    expect(emitMock).toHaveBeenCalledWith("global", { v: 1 });
  });

  it("notifyAuditChange tanpa emitter terdaftar tidak throw", () => {
    registerAuditChangeEmitter(null as never);
    expect(() =>
      notifyAuditChange({ id: "a1", entity: "x", entityId: "x1", action: "UPDATE", createdAt: "" })
    ).not.toThrow();
  });

  it("notifyAuditChange memanggil emitter terdaftar dengan payload", () => {
    const fn = jest.fn();
    registerAuditChangeEmitter(fn);
    const payload = {
      id: "a1",
      entity: "kelas",
      entityId: "k1",
      action: "UPDATE",
      createdAt: "2026-08-07T00:00:00.000Z"
    };
    notifyAuditChange(payload);
    expect(fn).toHaveBeenCalledWith(payload);
  });

  it("notifyAuditChange tidak melempar saat emitter throw", () => {
    registerAuditChangeEmitter(() => {
      throw new Error("ws down");
    });
    expect(() =>
      notifyAuditChange({ id: "a2", entity: "x", entityId: "x2", action: "CREATE", createdAt: "" })
    ).not.toThrow();
    registerAuditChangeEmitter(null as never);
  });

  it("afterInit mendaftarkan emitter changelog:new yang mem-broadcast event", () => {
    const emitAll = jest.fn();
    gateway.server.emit = emitAll;
    gateway.afterInit(gateway.server as never);
    const payload = {
      id: "a3",
      entity: "kelas",
      entityId: "k3",
      action: "DELETE",
      createdAt: "2026-08-07T00:00:00.000Z"
    };
    notifyAuditChange(payload);
    expect(emitAll).toHaveBeenCalledWith(CHANGE_LOG_NEW_EVENT, payload);
    registerAuditChangeEmitter(null as never);
  });
});
