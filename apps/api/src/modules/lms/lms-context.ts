import { UnauthorizedException } from "@nestjs/common";
import type { RequestContext } from "@openlms/types";
import type { AuthenticatedRequest } from "../../common/auth.guard";

/**
 * RequestContext untuk service LMS — SELALU dari request.requestContext
 * yang dibangun AuthGuard (JWT + UserRole), TIDAK PERNAH dari header klien
 * (anti-impersonation). Endpoint LMS memakai @RequirePermission sehingga
 * PermissionsGuard menjamin requestContext tersedia.
 */
export function contextFromRequest(req: AuthenticatedRequest): RequestContext {
  const ctx = req.requestContext;
  if (!ctx) {
    throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
  }
  return ctx;
}
