import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@openlms/database";
import type { RequestContext } from "@openlms/types";

export interface AuditParams {
  ctx: RequestContext;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/** Serialisasi nilai Prisma (Date/Decimal) menjadi JSON polos untuk kolom before/after. */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Tulis AuditLog (docs/03 §4.12). Semua mutasi penting modul LMS wajib tercatat:
 * create/update/delete kelas-mapel, publish materi, submit/ganti submission, penilaian.
 */
export async function writeAudit(params: AuditParams): Promise<void> {
  const actorRole = params.ctx.roles[0] ?? null;
  await prisma.auditLog.create({
    data: {
      actor_id: params.ctx.userId === "system" ? null : params.ctx.userId,
      actor_role: actorRole as never,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId,
      before: toJson(params.before),
      after: toJson(params.after)
    }
  });
}
