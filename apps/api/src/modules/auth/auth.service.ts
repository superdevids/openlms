import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { AuditAction, MembershipStatus, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "./password.util";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt.util";
import { ScopeResolver } from "../../common/scope-resolver";
import { resolveActorRole } from "../lms/lms-audit";
import { LOGIN_FAIL_LIMIT, LOGIN_LOCK_MINUTES } from "./auth.constants";

export interface LoginMeta {
  ip?: string;
  requestId: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserView {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string;
  roles: Role[];
}

export interface LoginResult extends SessionTokens {
  user: AuthUserView;
  mustChangePassword: boolean;
}

export interface MeResult {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: Role[];
  classIds: string[];
  homeroomClassId: string | null;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  requestId: string;
}

/**
 * AuthService — F1-T1/T8/T9, prd04 §5.P.
 * - Login "Email atau Username" + password (Argon2id; fallback scrypt lihat password.util).
 * - JWT access httpOnly cookie + refresh cookie (rotasi + revoke berbasis DB).
 * - Throttle: 5 gagal → lockout 15 menit (kolom User.locked_until).
 * - Reset password oleh OPERATOR/SUPERADMIN (password sementara, must_change_password).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly scopeResolver: ScopeResolver
  ) {}

  /** Hash SHA-256 token refresh — plaintext hanya disimpan sekali (schema RefreshToken). */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const ttlDays = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: this.hashToken(refreshToken),
        expires_at: new Date(Date.now() + ttlDays * 24 * 60 * 60_000)
      }
    });
  }

  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token_hash: this.hashToken(refreshToken), revoked_at: null },
      data: { revoked_at: new Date() }
    });
  }

  async login(dto: LoginDto, meta: LoginMeta): Promise<LoginResult> {
    const identifier = dto.emailOrUsername.trim();
    if (!identifier) {
      throw new UnauthorizedException("Email/Username atau password salah");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        is_active: true,
        OR: [{ email: { equals: identifier, mode: "insensitive" } }, { username: identifier }]
      },
      include: { roles: { where: { status: MembershipStatus.ACTIVE } } }
    });
    if (!user) {
      // Audit login gagal untuk identifier tak dikenal (tanpa bocorkan detail ke
      // response — tetap 401 generik). entity_id diisi identifier percobaan.
      await this.audit(
        null,
        undefined,
        AuditAction.LOGIN,
        "user",
        identifier.slice(0, 100),
        undefined,
        { reason: "LOGIN_FAILED_UNKNOWN" },
        meta.ip
      );
      throw new UnauthorizedException("Email/Username atau password salah");
    }

    this.assertNotLocked(user);

    const passwordOk = await verifyPassword(dto.password, user.password_hash);
    if (!passwordOk) {
      const attempts = user.failed_login_attempts + 1;
      if (attempts >= LOGIN_FAIL_LIMIT) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failed_login_attempts: attempts,
            locked_until: new Date(Date.now() + LOGIN_LOCK_MINUTES * 60_000)
          }
        });
        await this.audit(
          user.id,
          resolveActorRole(user.roles.map((r) => r.role)),
          AuditAction.LOCKOUT,
          "user",
          user.id,
          undefined,
          { failed_login_attempts: attempts },
          meta.ip
        );
        throw new HttpException(
          `Terlalu banyak percobaan login. Akun dikunci ${LOGIN_LOCK_MINUTES} menit.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failed_login_attempts: attempts }
      });
      await this.audit(
        user.id,
        resolveActorRole(user.roles.map((r) => r.role)),
        AuditAction.LOGIN,
        "user",
        user.id,
        undefined,
        { reason: "INVALID_CREDENTIALS" },
        meta.ip
      );
      throw new UnauthorizedException("Email/Username atau password salah");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failed_login_attempts: 0, last_login_at: new Date(), locked_until: null }
    });
    await this.audit(
      user.id,
      resolveActorRole(user.roles.map((r) => r.role)),
      AuditAction.LOGIN,
      "user",
      user.id,
      undefined,
      undefined,
      meta.ip
    );

    const roles = user.roles.map((r) => r.role);
    const refreshToken = signRefreshToken({ sub: user.id });
    await this.persistRefreshToken(user.id, refreshToken);
    return {
      accessToken: signAccessToken({ sub: user.id }),
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        roles
      },
      mustChangePassword: user.must_change_password
    };
  }

  /**
   * Refresh — akses baru tanpa login ulang. Rotasi + revoke berbasis DB:
   * token lama di-revoke (revoked_at), token baru disimpan hash-nya.
   */
  async refresh(refreshToken: string | undefined): Promise<LoginResult> {
    if (!refreshToken) {
      throw new UnauthorizedException("Sesi tidak ditemukan. Silakan login ulang.");
    }
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException("Sesi tidak valid atau sudah kedaluwarsa.");
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token_hash: this.hashToken(refreshToken) }
    });
    if (!stored || stored.revoked_at !== null) {
      throw new UnauthorizedException("Sesi tidak valid atau sudah dicabut.");
    }
    if (stored.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException("Sesi sudah kedaluwarsa.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { where: { status: MembershipStatus.ACTIVE } } }
    });
    if (!user || !user.is_active) {
      throw new UnauthorizedException("Akun tidak ditemukan atau tidak aktif.");
    }

    // Rotasi: revoke token lama, terbitkan + simpan token baru.
    await this.revokeRefreshToken(refreshToken);
    const newRefreshToken = signRefreshToken({ sub: user.id });
    await this.persistRefreshToken(user.id, newRefreshToken);

    const roles = user.roles.map((r) => r.role);
    return {
      accessToken: signAccessToken({ sub: user.id }),
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        roles
      },
      mustChangePassword: user.must_change_password
    };
  }

  /** Logout — cabut (revoke) refresh token aktif; access token tetap valid sampai TTL. */
  async logout(refreshToken: string | undefined): Promise<{ success: true }> {
    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    }
    return { success: true };
  }

  async me(userId: string, requestId: string): Promise<MeResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { where: { status: MembershipStatus.ACTIVE } } }
    });
    if (!user) {
      throw new UnauthorizedException("Akun tidak ditemukan.");
    }
    const scope = await this.scopeResolver.resolve(user.id);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.full_name,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      roles: user.roles.map((r) => r.role),
      classIds: scope.classIds,
      homeroomClassId: scope.homeroomClassId,
      mustChangePassword: user.must_change_password,
      lastLoginAt: user.last_login_at,
      requestId
    };
  }

  /** Reset password oleh OPERATOR/SUPERADMIN — password sementara sekali pakai (F1-T8). */
  async resetPasswordByOperator(
    actorId: string,
    dto: ResetPasswordDto,
    ip?: string
  ): Promise<{ userId: string; temporaryPassword: string; mustChangePassword: true }> {
    const target = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!target) {
      throw new NotFoundException("User tidak ditemukan.");
    }

    const temporaryPassword = dto.newPassword?.trim() || generateTemporaryPassword();
    if (temporaryPassword.length < 8) {
      throw new BadRequestException("Password sementara minimal 8 karakter.");
    }

    const before: Prisma.InputJsonValue = {
      must_change_password: target.must_change_password,
      failed_login_attempts: target.failed_login_attempts
    };
    const passwordHash = await hashPassword(temporaryPassword);
    await this.prisma.user.update({
      where: { id: target.id },
      data: {
        password_hash: passwordHash,
        must_change_password: true,
        failed_login_attempts: 0,
        locked_until: null
      }
    });
    // SEC-007: reset password → semua sesi lama mati (revoke seluruh refresh token aktif).
    await this.prisma.refreshToken.updateMany({
      where: { user_id: target.id, revoked_at: null },
      data: { revoked_at: new Date() }
    });
    await this.audit(
      actorId,
      undefined,
      AuditAction.UPDATE,
      "user",
      target.id,
      before,
      { must_change_password: true },
      ip
    );

    return { userId: target.id, temporaryPassword, mustChangePassword: true };
  }

  /** Ganti password sendiri; menghapus must_change_password (flow login pertama). */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("Akun tidak ditemukan.");
    }
    const ok = await verifyPassword(dto.currentPassword, user.password_hash);
    if (!ok) {
      throw new BadRequestException("Password saat ini salah.");
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException("Password baru harus berbeda dari password saat ini.");
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        must_change_password: false,
        failed_login_attempts: 0,
        locked_until: null
      }
    });
    // SEC-007: ganti password → semua sesi lama mati (revoke seluruh refresh token aktif).
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() }
    });
    await this.audit(
      userId,
      undefined,
      AuditAction.UPDATE,
      "user",
      userId,
      { must_change_password: user.must_change_password },
      { must_change_password: false }
    );

    return { success: true };
  }

  private assertNotLocked(user: {
    id: string;
    failed_login_attempts: number;
    locked_until: Date | null;
  }): void {
    if (user.failed_login_attempts < LOGIN_FAIL_LIMIT) {
      return;
    }
    const now = Date.now();
    const until = user.locked_until ?? new Date(now + LOGIN_LOCK_MINUTES * 60_000);
    if (until.getTime() > now) {
      throw new HttpException(
        `Terlalu banyak percobaan login. Coba lagi nanti (${LOGIN_LOCK_MINUTES} menit).`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    // Lock kedaluwarsa — reset counter dan lanjutkan verifikasi.
    void this.prisma.user.update({
      where: { id: user.id },
      data: { failed_login_attempts: 0, locked_until: null }
    });
  }

  /** Audit log; kegagalan audit tidak boleh menggagalkan request utama. */
  private async audit(
    actorId: string | null,
    actorRole: Role | undefined,
    action: AuditAction,
    entity: string,
    entityId: string,
    before?: unknown,
    after?: unknown,
    ip?: string
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: actorId,
          actor_role: actorRole ?? null,
          action,
          entity,
          entity_id: entityId,
          before: (before ?? undefined) as Prisma.InputJsonValue | undefined,
          after: (after ?? undefined) as Prisma.InputJsonValue | undefined,
          ip_address: ip
        }
      });
    } catch (error) {
      // jangan gagalkan alur login/reset karena audit, tapi jangan senyap:
      // hilangnya peristiwa compliance (login/lockout/reset) wajib tercatat.
      this.logger.error("auditLog gagal", {
        action,
        entity,
        entityId,
        ipAddress: ip,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
