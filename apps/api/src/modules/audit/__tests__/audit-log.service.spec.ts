import type { PrismaClient } from "@opensis/database";
import { AuditLogService } from "../audit-log.service";
import { QueryAuditLogDto } from "../dto/query-audit-log.dto";

/** Baris AuditLog (snake_case) — bentuk mentah dari Prisma. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "a_1",
    actor_id: "u_1",
    actor: { full_name: "Budi Santoso" },
    actor_role: "KEPSEK",
    action: "CREATE",
    entity: "class",
    entity_id: "c_1",
    before: null,
    after: { name: "X IPA 1" },
    ip_address: "127.0.0.1",
    created_at: new Date("2026-08-01T08:00:00.000Z"),
    ...overrides
  };
}

function createMockPrisma() {
  const auditLog = {
    findMany: jest.fn(),
    count: jest.fn()
  };
  const prisma = { auditLog } as unknown as PrismaClient;
  return { prisma, auditLog };
}

describe("AuditLogService", () => {
  let service: AuditLogService;
  let auditLog: { findMany: jest.Mock; count: jest.Mock };

  beforeEach(() => {
    const mocks = createMockPrisma();
    service = new AuditLogService(mocks.prisma);
    auditLog = mocks.auditLog;
  });

  describe("list", () => {
    it("mengembalikan halaman dengan mapping camelCase + actorName", async () => {
      auditLog.findMany.mockResolvedValue([row()]);
      auditLog.count.mockResolvedValue(1);

      const result = await service.list({} as QueryAuditLogDto);

      expect(result).toEqual({
        items: [
          {
            id: "a_1",
            actorId: "u_1",
            actorName: "Budi Santoso",
            actorRole: "KEPSEK",
            action: "CREATE",
            entity: "class",
            entityId: "c_1",
            before: null,
            after: { name: "X IPA 1" },
            ipAddress: "127.0.0.1",
            createdAt: new Date("2026-08-01T08:00:00.000Z")
          }
        ],
        total: 1,
        page: 1,
        pageSize: 20
      });
      expect(auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { created_at: "desc" }, skip: 0, take: 20 })
      );
    });

    it("menerapkan filter entity, actorId, dan action", async () => {
      auditLog.findMany.mockResolvedValue([]);
      auditLog.count.mockResolvedValue(0);

      await service.list({
        entity: "class",
        actorId: "u_2",
        action: "UPDATE"
      } as QueryAuditLogDto);

      expect(auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity: "class", actor_id: "u_2", action: "UPDATE" }
        })
      );
    });

    it("menerapkan rentang from/to pada created_at", async () => {
      auditLog.findMany.mockResolvedValue([]);
      auditLog.count.mockResolvedValue(0);

      await service.list({
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-02T00:00:00.000Z"
      } as QueryAuditLogDto);

      expect(auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            created_at: {
              gte: new Date("2026-08-01T00:00:00.000Z"),
              lte: new Date("2026-08-02T00:00:00.000Z")
            }
          }
        })
      );
    });

    it("menerapkan pagination page/pageSize (skip/take)", async () => {
      auditLog.findMany.mockResolvedValue([]);
      auditLog.count.mockResolvedValue(0);

      await service.list({ page: 3, pageSize: 50 } as QueryAuditLogDto);

      expect(auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 100, take: 50 })
      );
    });

    it("menggunakan nilai default page=1 dan pageSize=20 saat kosong", async () => {
      auditLog.findMany.mockResolvedValue([]);
      auditLog.count.mockResolvedValue(0);

      await service.list({} as QueryAuditLogDto);

      expect(auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 })
      );
    });
  });

  describe("listEntities", () => {
    it("mengembalikan daftar entity distinct terurut", async () => {
      auditLog.findMany.mockResolvedValue([{ entity: "class" }, { entity: "announcement" }]);

      const result = await service.listEntities();

      expect(result).toEqual(["class", "announcement"]);
      expect(auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ distinct: ["entity"], orderBy: { entity: "asc" } })
      );
    });
  });
});
