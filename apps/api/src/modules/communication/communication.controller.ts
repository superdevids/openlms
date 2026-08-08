/**
 * CommunicationController — pengumuman + surat-menyurat.
 * RBAC: tulis pengumuman announcement:write:school (OPERATOR/WAKEPSEK/KEPSEK);
 * baca announcement:read (semua role); approval surat letter:approve:school;
 * pemohon hanya surat miliknya (letter:request:self, scope SENDIRI).
 * Identitas user dari request.requestContext (AuthGuard), bukan header.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException
} from "@nestjs/common";
import type { Role } from "@openlms/types";
import { AnnouncementService } from "./announcement.service";
import { OfficialLetterService } from "./official-letter.service";
import {
  CreateAnnouncementDto,
  CreateOfficialLetterDto,
  UpdateAnnouncementDto
} from "./dto/communication.dto";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import type { AuditActorContext } from "../lms/lms-audit";
import { RequirePermission } from "../../common/require-permission.decorator";

@Controller("communication")
export class CommunicationController {
  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly officialLetterService: OfficialLetterService
  ) {}

  // ---- Pengumuman ----
  @Post("announcements")
  @RequirePermission("announcement:write:school")
  createAnnouncement(@Req() req: AuthenticatedRequest, @Body() dto: CreateAnnouncementDto) {
    return this.announcementService.create(
      {
        title: dto.title,
        body: dto.body,
        targetRoles: dto.targetRoles as Role[],
        createdBy: this.actorId(req),
        pinned: dto.pinned,
        publishNow: dto.publishNow
      },
      this.actorContext(req)
    );
  }

  @Get("announcements")
  @RequirePermission("announcement:read")
  listAnnouncements(@Req() req: AuthenticatedRequest) {
    return this.announcementService.listForRole(this.actorRole(req));
  }

  @Patch("announcements/:id/publish")
  @RequirePermission("announcement:write:school")
  publishAnnouncement(@Param("id") id: string) {
    return this.announcementService.publish(id);
  }

  @Patch("announcements/:id/unpublish")
  @RequirePermission("announcement:write:school")
  unpublishAnnouncement(@Param("id") id: string) {
    return this.announcementService.unpublish(id);
  }

  @Patch("announcements/:id")
  @RequirePermission("announcement:write:school")
  updateAnnouncement(@Param("id") id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementService.update(id, {
      title: dto.title,
      body: dto.body,
      targetRoles: dto.targetRoles as Role[] | undefined,
      pinned: dto.pinned
    });
  }

  @Delete("announcements/:id")
  @RequirePermission("announcement:write:school")
  removeAnnouncement(@Param("id") id: string) {
    return this.announcementService.remove(id);
  }

  // ---- Surat ----
  @Post("letters")
  @RequirePermission("letter:request:self")
  createLetter(@Req() req: AuthenticatedRequest, @Body() dto: CreateOfficialLetterDto) {
    return this.officialLetterService.create(
      {
        requesterId: this.actorId(req),
        type: dto.type,
        subject: dto.subject,
        body: dto.body
      },
      this.actorContext(req)
    );
  }

  @Post("letters/:id/submit")
  @RequirePermission("letter:request:self", "letter:approve:school")
  submitLetter(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.officialLetterService.submit(id, this.actorContext(req));
  }

  @Post("letters/:id/approve")
  @RequirePermission("letter:approve:school")
  approveLetter(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.officialLetterService.approve(id, this.actorId(req), this.actorContext(req));
  }

  @Post("letters/:id/reject")
  @RequirePermission("letter:approve:school")
  rejectLetter(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.officialLetterService.reject(id, this.actorId(req), this.actorContext(req));
  }

  @Post("letters/:id/sign")
  @RequirePermission("letter:approve:school")
  signLetter(@Param("id") id: string) {
    return this.officialLetterService.sign(id);
  }

  @Get("letters")
  @RequirePermission("letter:request:self", "letter:read:school")
  listLetters(@Req() req: AuthenticatedRequest) {
    return this.officialLetterService.listForRequester(this.actorId(req));
  }

  private actorId(req: AuthenticatedRequest): string {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return ctx.userId;
  }

  /** Konteks aktor untuk AuditLog (lms-audit). */
  private actorContext(req: AuthenticatedRequest): AuditActorContext {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: ctx.userId, roles: ctx.roles };
  }

  /** Role untuk filter pengumuman — dari RequestContext, bukan header klien. */
  private actorRole(req: AuthenticatedRequest): Role {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return ctx.roles[0] ?? "SISWA";
  }
}
