import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MembershipStatus, Role } from "@prisma/client";
import type { RequestContext } from "@opensis/types";
import type { Request as ExpressRequest } from "express";
import { PrismaClient } from "@opensis/database";
import { GLOBAL_PREFIX } from "./constants";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { ScopeResolver } from "./scope-resolver";
import { ACCESS_COOKIE_NAME } from "../modules/auth/auth.constants";
import { parseCookies } from "../modules/auth/cookie.util";
import { verifyAccessToken } from "../modules/auth/jwt.util";

/** User terautentikasi yang ditempel AuthGuard ke request (F1-T3). */
export interface AuthUser {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string;
  roles: Role[];
  classIds: string[];
  homeroomClassId: string | null;
  mustChangePassword: boolean;
  requestId: string;
}

/** Request yang sudah diproses AuthGuard: user + RequestContext (docs/02 §6.2). */
export interface AuthenticatedRequest extends ExpressRequest {
  /** requestId dari RequestIdMiddleware (F0-T6) */
  requestId?: string;
  user?: AuthUser;
  requestContext?: RequestContext;
}

/**
 * AuthGuard — global (APP_GUARD, F1-T3).
 * Alur: @Public()/health → bypass; verifikasi JWT access in-house (HS256) dari
 * cookie httpOnly (atau Authorization Bearer) → resolve UserRole ACTIVE →
 * build RequestContext { userId, roles, classIds, homeroomClassId, requestId }.
 * JWT hanya identitas; role otoritas dari tabel UserRole (prd04 §4.3).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaClient,
    private readonly scopeResolver: ScopeResolver
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (isPublic || isHealthRequest(request)) {
      return true;
    }

    const token = extractAccessToken(request);
    if (!token) {
      throw new UnauthorizedException("Sesi tidak ditemukan. Silakan login.");
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      throw new UnauthorizedException("Sesi tidak valid atau sudah kedaluwarsa.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { where: { status: MembershipStatus.ACTIVE } } }
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException("Akun tidak ditemukan atau tidak aktif.");
    }

    const scope = await this.scopeResolver.resolve(user.id);
    const roles = user.roles.map((r) => r.role);
    const requestId =
      typeof request.requestId === "string" && request.requestId.length > 0
        ? request.requestId
        : "req_unknown";

    request.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      roles,
      classIds: scope.classIds,
      homeroomClassId: scope.homeroomClassId,
      mustChangePassword: user.must_change_password,
      requestId
    };
    request.requestContext = {
      userId: user.id,
      roles,
      classIds: scope.classIds,
      homeroomClassId: scope.homeroomClassId,
      requestId
    };

    return true;
  }
}

/** Endpoint health tetap publik meski tanpa @Public() (HealthModule tidak boleh diubah). */
function isHealthRequest(request: AuthenticatedRequest): boolean {
  const healthPrefix = `/${GLOBAL_PREFIX}/health`;
  const path = request.path ?? "";
  return path === healthPrefix || path.startsWith(`${healthPrefix}/`);
}

function extractAccessToken(request: AuthenticatedRequest): string | undefined {
  const cookies = parseCookies(request.headers.cookie);
  // Prioritas: opensis_session (kontrak W2) → opensis_access (F0/web) → Bearer.
  const fromSession = cookies["opensis_session"];
  if (fromSession) {
    return fromSession;
  }
  const fromAccess = cookies[ACCESS_COOKIE_NAME];
  if (fromAccess) {
    return fromAccess;
  }
  const authorization = request.headers.authorization;
  if (authorization && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return undefined;
}
