import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@openlms/database";
import type { Role } from "@openlms/types";
import { ACCESS_COOKIE_NAME } from "../auth/auth.constants";
import { verifyAccessToken } from "../auth/jwt.util";

export interface RealtimeUser {
  userId: string;
  roles: Role[];
}

/**
 * RealtimeAuthService — handshake auth Socket.IO (docs/02 §7.1).
 * Terima token dari `auth.token` (Bearer JWT in-house) ATAU cookie httpOnly
 * `openlms_access`; verifikasi memakai verifyAccessToken bersama (jwt.util,
 * HS256 + typ "access" + exp) — tidak ada verifikasi HMAC duplikat.
 * JWT hanya identitas (`sub`) — role di-resolve dari tabel UserRole (P2).
 */
@Injectable()
export class RealtimeAuthService {
  private readonly logger = new Logger(RealtimeAuthService.name);

  /** Handshake: `token` dari `handshake.auth.token`; fallback ke cookie. Return null → tolak. */
  async authenticate(
    token: string | undefined,
    cookieHeader: string | undefined
  ): Promise<RealtimeUser | null> {
    const raw = token?.trim() || this.extractCookie(cookieHeader ?? "");
    if (!raw) return null;

    const payload = verifyAccessToken(raw);
    if (!payload || typeof payload.sub !== "string" || payload.sub.length === 0) return null;

    const roles = await this.loadActiveRoles(payload.sub);
    if (roles.length === 0) return null;

    return { userId: payload.sub, roles };
  }

  private extractCookie(cookieHeader: string): string | null {
    for (const part of cookieHeader.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name === ACCESS_COOKIE_NAME && rest.length > 0) return rest.join("=");
    }
    return null;
  }

  private async loadActiveRoles(userId: string): Promise<Role[]> {
    const rows = await prisma.userRole.findMany({
      where: { user_id: userId, status: "ACTIVE" },
      select: { role: true }
    });
    return rows.map((r) => r.role as Role);
  }
}
