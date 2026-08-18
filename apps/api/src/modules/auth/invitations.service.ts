import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AuditAction, MembershipStatus, Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { InvitationDto } from "./dto/invitation.dto";
import { generateTemporaryPassword, hashPassword } from "./password.util";
import { signInvitationToken, verifyInvitationToken } from "./jwt.util";

export interface InvitationResult {
  invitationToken: string;
  inviteUrl: string;
  userId: string;
  role: Role;
  status: "INVITED";
  existingUser: boolean;
}

export interface InvitationAcceptResult {
  accepted: boolean;
  role: Role;
}

/**
 * InvitationsService — F1-T6, prd04 §9.1 langkah 4.
 * Undangan link/role: buat User (bila belum ada) + UserRole INVITED;
 * accept dengan token → UserRole ACTIVE + joined_at.
 */
@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async send(dto: InvitationDto, actorId: string): Promise<InvitationResult> {
    const email = dto.email?.trim() || undefined;
    const username = dto.username.trim();
    if (!username) {
      throw new BadRequestException("Username wajib diisi.");
    }

    let user = await this.prisma.user.findFirst({
      where: { username: username }
    });

    let existingUser = false;
    if (!user) {
      existingUser = false;
      const temporaryPassword = generateTemporaryPassword();
      user = await this.prisma.user.create({
        data: {
          email: email ?? null,
          username: username,
          password_hash: await hashPassword(temporaryPassword),
          must_change_password: true,
          full_name: dto.fullName
        }
      });
    } else {
      existingUser = true;
    }

    const existingRole = await this.prisma.userRole.findUnique({
      where: { user_id_role: { user_id: user.id, role: dto.role } }
    });
    let userRole = existingRole;
    if (!userRole) {
      userRole = await this.prisma.userRole.create({
        data: {
          user_id: user.id,
          role: dto.role,
          status: MembershipStatus.INVITED,
          invited_by: actorId
        }
      });
    } else if (userRole.status === MembershipStatus.INVITED) {
      // undangan ulang — token baru
      userRole = await this.prisma.userRole.update({
        where: { id: userRole.id },
        data: { invited_by: actorId }
      });
    }

    const token = signInvitationToken({ sub: user.id, role: dto.role });
    await this.audit(actorId, AuditAction.CREATE, "user_role", userRole.id, undefined, {
      role: dto.role,
      status: "INVITED",
      invited_by: actorId
    });

    return {
      invitationToken: token,
      inviteUrl: `/api/v1/auth/invitations/accept?token=${token}`,
      userId: user.id,
      role: dto.role,
      status: "INVITED",
      existingUser
    };
  }

  async accept(token: string): Promise<InvitationAcceptResult> {
    const payload = verifyInvitationToken(token);
    if (!payload) {
      throw new BadRequestException("Undangan tidak valid atau sudah kedaluwarsa.");
    }
    const role = payload.role as Role;
    if (!role) {
      throw new BadRequestException("Undangan tidak valid.");
    }

    const userRole = await this.prisma.userRole.findUnique({
      where: { user_id_role: { user_id: payload.sub, role } }
    });
    if (!userRole) {
      throw new NotFoundException("Undangan tidak ditemukan.");
    }
    if (userRole.status === MembershipStatus.DISABLED) {
      throw new ForbiddenException("Undangan telah dinonaktifkan.");
    }
    if (userRole.status === MembershipStatus.ACTIVE) {
      return { accepted: true, role: userRole.role };
    }

    await this.prisma.userRole.update({
      where: { id: userRole.id },
      data: { status: MembershipStatus.ACTIVE, joined_at: new Date() }
    });
    await this.audit(
      userRole.user_id,
      AuditAction.UPDATE,
      "user_role",
      userRole.id,
      { status: "INVITED" },
      { status: "ACTIVE" }
    );

    return { accepted: true, role: userRole.role };
  }

  private async audit(
    actorId: string | null,
    action: AuditAction,
    entity: string,
    entityId: string,
    before?: unknown,
    after?: unknown
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: actorId,
          action,
          entity,
          entity_id: entityId,
          before: (before ?? undefined) as Prisma.InputJsonValue | undefined,
          after: (after ?? undefined) as Prisma.InputJsonValue | undefined
        }
      });
    } catch {
      // jangan gagalkan alur undangan karena audit
    }
  }
}
