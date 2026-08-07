import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest, AuthUser } from "./auth.guard";

/**
 * @CurrentUser() — mengembalikan user terautentikasi (AuthUser) yang
 * dibangun AuthGuard: id, email/username, roles, scope (classIds,
 * homeroomClassId), mustChangePassword, requestId.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  }
);
