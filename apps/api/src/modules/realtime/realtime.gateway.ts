import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { prisma } from "@openlms/database";
import { ScopeResolver } from "../../common/scope-resolver";
import type { RealtimeUser } from "./realtime.auth";
import { RealtimeAuthService } from "./realtime.auth";

/** Namespace tunggal real-time (docs/02 §7.1) — siap multi-instance via Redis adapter (lihat README.registration.md). */
export const REALTIME_NAMESPACE = "/ws";

const ROOM_PREFIX_USER = "user:";
const ROOM_PREFIX_CLASS = "class:";
const ROOM_PREFIX_EXAM = "exam:";

/** Fallback origin dev (api 3000 / web 3000-3001) bila CORS_ORIGINS tidak diset. */
const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
];

/**
 * Origin yang diizinkan (CORS) — dari env CORS_ORIGINS (koma-pisah);
 * default localhost saat env kosong (whitelist, bukan origin:true).
 * Di production, CORS_ORIGINS WAJIB diset — fail-fast saat gateway dimuat.
 */
function allowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || raw.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[realtime] CORS_ORIGINS wajib dikonfigurasi di production (fail-fast). " +
          "Jangan memakai fallback localhost di lingkungan production."
      );
    }
    return DEFAULT_CORS_ORIGINS;
  }
  const parts = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : DEFAULT_CORS_ORIGINS;
}

/** Fail-fast saat modul dimuat: production WAJIB set CORS_ORIGINS (seperti jwt.util). */
if (process.env.NODE_ENV === "production") {
  allowedOrigins();
}

/** Role dengan akses lintas-kelas (admin/pengajar) — bypass cek keanggotaan room (lihat canAccessRoom). */
const SCHOOL_SCOPED_ROLES = new Set(["SUPERADMIN", "OPERATOR", "WAKEPSEK", "KEPSEK", "GURU_BK"]);

export function userRoom(userId: string): string {
  return `${ROOM_PREFIX_USER}${userId}`;
}

export function classRoom(classId: string): string {
  return `${ROOM_PREFIX_CLASS}${classId}`;
}

export function examRoom(examSessionId: string): string {
  return `${ROOM_PREFIX_EXAM}${examSessionId}`;
}

/**
 * RealtimeGateway — Socket.IO namespace tunggal `/ws` (docs/02 §7).
 * Handshake auth: JWT Bearer (`auth.token`) atau cookie httpOnly; validasi UserRole ACTIVE.
 * Room: user:{userId} (auto-join saat koneksi), class:{classId}, exam:{examSessionId}
 * (join via event room:join — reconnect: klien emit room:join lagi; server auto-join user room).
 * Akses room divalidasi (keanggotaan kelas / sesi ujian) sebelum join.
 * Semua event best-effort; sumber kebenaran tetap REST.
 */
@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
  cors: {
    // Dievaluasi per-koneksi agar CORS_ORIGINS (termasuk dari .env via ConfigModule) berlaku.
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      const allowed = allowedOrigins();
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS origin tidak diizinkan"));
      }
    },
    credentials: true
  }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  /** Scope RBAC kelas (classIds + homeroomClassId) — sumber yang sama dengan REST (prd04 §4.1). */
  private readonly scopeResolver = new ScopeResolver(prisma);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: RealtimeAuthService) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const handshake = socket.handshake;
      const user = await this.auth.authenticate(handshake.auth?.token, handshake.headers.cookie);

      if (!user) {
        socket.emit("error", { code: "UNAUTHORIZED" });
        socket.disconnect(true);
        return;
      }

      socket.data.user = user;
      await socket.join(userRoom(user.userId));

      this.logger.log(`ws connected userId=${user.userId} socket=${socket.id}`);
      socket.emit("connected", {
        userId: user.userId,
        roles: user.roles,
        rooms: Array.from(socket.rooms)
      });
    } catch (err) {
      this.logger.warn(`ws handshake error socket=${socket.id}: ${(err as Error).message}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    const user = socket.data.user as RealtimeUser | undefined;
    this.logger.log(`ws disconnected userId=${user?.userId ?? "-"} socket=${socket.id}`);
  }

  /** Join room konteks (class/exam) — dipanggil klien saat reconnect agar re-join otomatis. */
  @SubscribeMessage("room:join")
  async handleRoomJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body?: { room?: string }
  ): Promise<void> {
    const room = this.sanitizeRoom(body?.room);
    if (!room) {
      socket.emit("error", { code: "INVALID_ROOM" });
      return;
    }
    const user = socket.data.user as RealtimeUser | undefined;
    if (!user) {
      socket.emit("error", { code: "UNAUTHORIZED" });
      return;
    }
    const allowed = await this.canAccessRoom(user, room);
    if (!allowed) {
      socket.emit("error", { code: "FORBIDDEN", room });
      return;
    }
    await socket.join(room);
    socket.emit("room:joined", { room });
  }

  @SubscribeMessage("room:leave")
  async handleRoomLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body?: { room?: string }
  ): Promise<void> {
    const room = this.sanitizeRoom(body?.room);
    if (room) await socket.leave(room);
  }

  /** Push ke satu user (room user:{userId}). */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  /** Broadcast ke satu kelas (room class:{classId}). */
  emitToClass(classId: string, event: string, payload: unknown): void {
    this.server.to(classRoom(classId)).emit(event, payload);
  }

  /** Broadcast ke satu sesi ujian (room exam:{examSessionId}). */
  emitToExam(examSessionId: string, event: string, payload: unknown): void {
    this.server.to(examRoom(examSessionId)).emit(event, payload);
  }

  /** Broadcast global namespace /ws. */
  emitToAll(event: string, payload: unknown): void {
    this.server.emit(event, payload);
  }

  /** Hanya izinkan room class:/exam: dari klien (cegah join room arbitrer). */
  private sanitizeRoom(room: string | undefined): string | null {
    if (typeof room !== "string") return null;
    const trimmed = room.trim();
    if (trimmed.length === 0) return null;
    if (
      (trimmed.startsWith(ROOM_PREFIX_CLASS) || trimmed.startsWith(ROOM_PREFIX_EXAM)) &&
      trimmed.length > trimmed.indexOf(":") + 1
    ) {
      return trimmed;
    }
    return null;
  }

  /**
   * Bypass akses room untuk role lintas-sekolah — INTENTIONAL (docs/02 §7):
   * REST adalah sumber kebenaran dan tetap fail-closed via PermissionsGuard;
   * event realtime di sini best-effort (sinyal/notifikasi ringan, tanpa data
   * sensitif). Room join dari klien tetap dibatasi ke prefix class:/exam: via
   * sanitizeRoom, jadi role ini tidak membuka room arbitrer.
   */
  private async canAccessRoom(user: RealtimeUser, room: string): Promise<boolean> {
    if (user.roles.some((r) => SCHOOL_SCOPED_ROLES.has(r))) {
      return true;
    }
    if (room.startsWith(ROOM_PREFIX_CLASS)) {
      const classId = room.slice(ROOM_PREFIX_CLASS.length);
      return this.isClassMember(user.userId, classId);
    }
    if (room.startsWith(ROOM_PREFIX_EXAM)) {
      const sessionId = room.slice(ROOM_PREFIX_EXAM.length);
      return this.isExamSessionMember(user.userId, sessionId);
    }
    return false;
  }

  /** SISWA/GURU: anggota kelas (enrollment aktif / guru pengampu / wali kelas) via ScopeResolver. */
  private async isClassMember(userId: string, classId: string): Promise<boolean> {
    const scope = await this.scopeResolver.resolve(userId);
    return scope.classIds.includes(classId) || scope.homeroomClassId === classId;
  }

  /** SISWA/GURU: punya akses ke sesi ujian (enrollment kelas terkait / guru pengampu). */
  private async isExamSessionMember(userId: string, sessionId: string): Promise<boolean> {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      select: {
        exam: {
          select: {
            class_subject: { select: { class_id: true, teacher_id: true } }
          }
        }
      }
    });
    const cs = session?.exam?.class_subject;
    if (!cs) return false;
    if (cs.teacher_id === userId) return true;
    return this.isClassMember(userId, cs.class_id);
  }
}
