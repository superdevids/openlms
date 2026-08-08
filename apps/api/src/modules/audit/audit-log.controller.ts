import { Controller, Get, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuditLogService } from "./audit-log.service";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";
import { RequirePermission } from "../../common/require-permission.decorator";
import { Roles } from "../../common/roles.decorator";

/**
 * AuditLogController — change-log sistem (R-11).
 * Persyaratan pengguna: log perubahan SEMUA elemen, VISIBLE hanya SUPERADMIN
 * dan KEPSEK. Dua guard dipakai sekaligus (AND): @Roles membatasi role aktif,
 * @RequirePermission memastikan permission audit:read:school.
 * Endpoint baca-only: GET /admin/change-logs (+ /entities untuk dropdown filter).
 */
@Controller("admin/change-logs")
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.KEPSEK)
  @RequirePermission("audit:read:school")
  list(@Query() dto: QueryAuditLogDto) {
    return this.auditLogService.list(dto);
  }

  @Get("entities")
  @Roles(Role.SUPERADMIN, Role.KEPSEK)
  @RequirePermission("audit:read:school")
  listEntities() {
    return this.auditLogService.listEntities();
  }
}
