import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@prisma/client";
import type { AuthenticatedRequest } from "./auth.guard";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { PERMISSIONS_KEY } from "./require-permission.decorator";
import { ROLES_KEY } from "./roles.decorator";
import { GLOBAL_PREFIX } from "./constants";
import { canAccess, PermissionsResolver } from "../modules/auth/permissions-resolver";

/**
 * PermissionsGuard — global (APP_GUARD, F1-T4, prd04 §4).
 * Membaca @RequirePermission('resource:action[:scope]') dan @Roles(...):
 * - muat permission set role (RolePermission) + UserPermissionOverride
 * - cocokkan + resolve scope (SENDIRI/KELAS/SEKOLAH)
 * - GAGAL → 403 format standar; @Public() → bypass.
 *
 * FAIL-CLOSED (security hardening): route yang TIDAK @Public() dan TIDAK
 * memiliki @RequirePermission/@Roles → 403 Forbidden. Setiap endpoint sensitif
 * WAJIB mendeklarasikan permission eksplisit; tidak ada lagi "no-op allow".
 * Endpoint health tetap publik (AuthGuard juga membiarkan /health tanpa JWT).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsResolver: PermissionsResolver
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (isHealthRequest(request)) {
      return true;
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    // FAIL-CLOSED: route terproteksi tanpa deklarasi permission/role → tolak.
    if (requiredPermissions.length === 0 && requiredRoles.length === 0) {
      throw new ForbiddenException(
        "Akses ditolak: endpoint ini tidak mendeklarasikan permission yang diizinkan."
      );
    }

    const ctx = request.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }

    if (requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => ctx.roles.includes(role));
      if (!hasRole) {
        throw new ForbiddenException("Akses ditolak: role tidak diizinkan.");
      }
    }

    if (requiredPermissions.length > 0) {
      const grants = await this.permissionsResolver.resolvePermissions(ctx.roles);
      const overrides = await this.permissionsResolver.resolveOverrides(ctx.userId);
      const allowed = requiredPermissions.some((code) => canAccess(code, grants, overrides));
      if (!allowed) {
        throw new ForbiddenException("Akses ditolak: permission tidak dimiliki.");
      }
    }

    return true;
  }
}

/** Endpoint health tetap publik (HealthModule tidak boleh diubah). */
function isHealthRequest(request: AuthenticatedRequest): boolean {
  const healthPrefix = `/${GLOBAL_PREFIX}/health`;
  const path = request.path ?? "";
  return path === healthPrefix || path.startsWith(`${healthPrefix}/`);
}
