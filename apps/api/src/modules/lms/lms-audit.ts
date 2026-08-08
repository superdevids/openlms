import { AuditAction, Prisma, Role } from "@prisma/client";
import { prisma } from "@opensis/database";
import { notifyAuditChange } from "../realtime/realtime.gateway";

/** Minimal konteks aktor — dipenuhi RequestContext (auth.guard) dan ActorContext (modul). */
export interface AuditActorContext {
  userId: string;
  roles: string[];
}

export interface AuditParams {
  ctx: AuditActorContext;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  /** Override role eksplisit (mis. aktor sistem/background job). */
  actorRole?: Role;
  ipAddress?: string;
}

/** Serialisasi nilai Prisma (Date/Decimal) menjadi JSON polos untuk kolom before/after. */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Prioritas role untuk actor_role AuditLog — deterministik, tidak bergantung
 * urutan baris UserRole dari DB (R-13). Memilih role "tertinggi" dari daftar
 * role aktif; fallback roles[0] bila tidak ada yang dikenali.
 */
export const ROLE_PRIORITY: Role[] = [
  "SUPERADMIN",
  "KEPSEK",
  "AUDITOR",
  "WAKEPSEK",
  "KAPRODI",
  "OPERATOR",
  "KEUANGAN",
  "BK",
  "GURU",
  "SISWA",
  "WALI_MURID",
  "CALON_SISWA",
  "PEMBIMBING_INDUSTRI",
  "PENGUJI_EKSTERNAL"
];

export function resolveActorRole(roles: string[], explicit?: Role): Role | undefined {
  if (explicit) return explicit;
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return roles[0] as Role | undefined;
}

/**
 * Tulis AuditLog (docs/03 §4.12). Semua mutasi penting modul LMS wajib tercatat:
 * create/update/delete kelas-mapel, publish materi, submit/ganti submission, penilaian.
 * Kegagalan audit tidak boleh menggagalkan request utama (try/catch).
 */
export async function writeAudit(params: AuditParams): Promise<void> {
  const actorRole = resolveActorRole(params.ctx.roles, params.actorRole);
  try {
    const row = await prisma.auditLog.create({
      data: {
        actor_id: params.ctx.userId === "system" ? null : params.ctx.userId,
        actor_role: actorRole as never,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId,
        before: toJson(params.before),
        after: toJson(params.after),
        ip_address: params.ipAddress
      }
    });
    // R-11 live: sinyal changelog:new best-effort (klien refetch via REST).
    notifyAuditChange({
      id: row.id,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      createdAt: row.created_at.toISOString()
    });
  } catch {
    // jangan gagalkan mutasi karena audit
  }
}
