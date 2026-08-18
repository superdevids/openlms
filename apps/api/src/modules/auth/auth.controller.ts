import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { InvitationsService } from "./invitations.service";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { InvitationDto } from "./dto/invitation.dto";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { Public } from "../../common/public.decorator";
import { RequirePermission } from "../../common/require-permission.decorator";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthUser } from "../../common/auth.guard";
import { parseCookies } from "./cookie.util";
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  ACCESS_COOKIE_NAME,
  COOKIE_OPTIONS,
  REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_NAME,
  SESSION_COOKIE_NAME
} from "./auth.constants";

/**
 * AuthController — F1-T1/T6/T8.
 * Login username (NIS/NIP) + password; JWT access+refresh di cookie httpOnly
 * (Secure + SameSite=Lax); me, logout, reset password OPERATOR, undangan.
 */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitationsService: InvitationsService
  ) {}

  @Post("login")
  @Public()
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ user: unknown; mustChangePassword: boolean }> {
    const result = await this.authService.login(dto, {
      ip: req.ip,
      requestId: (req as Request & { requestId?: string }).requestId ?? "req_unknown"
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, mustChangePassword: result.mustChangePassword };
  }

  @Post("refresh")
  @Public()
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ user: unknown; mustChangePassword: boolean }> {
    const refreshToken = parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
    const result = await this.authService.refresh(refreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, mustChangePassword: result.mustChangePassword };
  }

  @Post("logout")
  @Public()
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ success: true }> {
    const refreshToken = parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
    await this.authService.logout(refreshToken);
    clearAuthCookies(res);
    return { success: true };
  }

  @Get("me")
  @RequirePermission("auth:me:self")
  me(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    // Data pribadi tidak boleh di-cache (proxy/browser) — no-store.
    res.setHeader("Cache-Control", "no-store");
    return this.authService.me(user.id, user.requestId);
  }

  @Post("reset-password")
  @RequirePermission("user:reset-password:school")
  resetPassword(
    @CurrentUser() actor: AuthUser,
    @Body() dto: ResetPasswordDto,
    @Req() req: Request
  ) {
    return this.authService.resetPasswordByOperator(actor.id, dto, req.ip);
  }

  @Post("change-password")
  @RequirePermission("auth:password:change:self")
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  @Post("invitations")
  @RequirePermission("invitation:send:school")
  sendInvitation(@CurrentUser() actor: AuthUser, @Body() dto: InvitationDto) {
    return this.invitationsService.send(dto, actor.id);
  }

  @Post("invitations/accept")
  @Public()
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(dto.token);
  }
}

/**
 * Set cookie auth: opensis_access (JWT access) + opensis_refresh + alias
 * opensis_session (= access token, G-04) yang dibaca proxy web.
 * Catatan: saat NEXT_PUBLIC_DEMO=1 di apps/web, login tidak memanggil backend
 * (langsung redirect per role demo) — cookie ini hanya relevan di mode nyata.
 */
function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS
  });
  res.cookie(SESSION_COOKIE_NAME, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie(SESSION_COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
}
