/**
 * Unit test — UsersAdminService (R-38): daftar user + role aktif tanpa PII.
 */
import "reflect-metadata";
import type { PrismaClient } from "@opensis/database";
import { UsersAdminService } from "../../src/modules/users-admin/users-admin.service";

function makePrismaMock() {
  const user = {
    findMany: jest.fn(),
    count: jest.fn()
  };
  const prisma = { user } as unknown as PrismaClient;
  return { prisma, user };
}

const userRow = (overrides: Record<string, unknown> = {}) => ({
  id: "u1",
  username: "budi",
  email: "budi@sekolah.sch.id",
  full_name: "Budi Santoso",
  is_active: true,
  last_login_at: new Date("2026-08-01T00:00:00.000Z"),
  created_at: new Date("2025-01-01T00:00:00.000Z"),
  roles: [{ role: "GURU" }],
  password_hash: "TIDAK_BOLEH_BOCOR",
  ...overrides
});

describe("UsersAdminService", () => {
  it("list tanpa search: findMany tanpa OR + total dari count", async () => {
    const { prisma, user } = makePrismaMock();
    user.findMany.mockResolvedValue([userRow()]);
    user.count.mockResolvedValue(1);

    const service = new UsersAdminService(prisma);
    const page = await service.list();

    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100, orderBy: [{ created_at: "desc" }] })
    );
    // PII sensitif TIDAK pernah disertakan di view.
    expect(page.items[0]).not.toHaveProperty("password_hash");
  });

  it("list dengan search: OR berisi full_name/username/email contains insensitive", async () => {
    const { prisma, user } = makePrismaMock();
    user.findMany.mockResolvedValue([]);
    user.count.mockResolvedValue(0);

    const service = new UsersAdminService(prisma);
    await service.list("  buDi  ");

    const where = user.findMany.mock.calls[0][0].where;
    expect(where.OR).toHaveLength(3);
    expect(where.OR[0]).toEqual({ full_name: { contains: "buDi", mode: "insensitive" } });
    expect(where.OR[1]).toEqual({ username: { contains: "buDi", mode: "insensitive" } });
    expect(where.OR[2]).toEqual({ email: { contains: "buDi", mode: "insensitive" } });
  });

  it("search kosong/spasi → tidak ada OR", async () => {
    const { prisma, user } = makePrismaMock();
    user.findMany.mockResolvedValue([]);
    user.count.mockResolvedValue(0);

    const service = new UsersAdminService(prisma);
    await service.list("   ");
    const where = user.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });

  it("hanya role ACTIVE yang disertakan", async () => {
    const { prisma, user } = makePrismaMock();
    user.findMany.mockResolvedValue([
      userRow({ roles: [{ role: "GURU" }, { role: "SUPERADMIN" }] })
    ]);
    user.count.mockResolvedValue(1);

    const service = new UsersAdminService(prisma);
    const page = await service.list();

    expect(page.items[0]?.roles).toEqual(["GURU", "SUPERADMIN"]);
    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { roles: { where: { status: "ACTIVE" }, select: { role: true } } }
      })
    );
  });

  it("pageSize diklem ke rentang 1..500", async () => {
    const { prisma, user } = makePrismaMock();
    user.findMany.mockResolvedValue([]);
    user.count.mockResolvedValue(0);

    const service = new UsersAdminService(prisma);
    await service.list(undefined, 10000);
    expect(user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));

    await service.list(undefined, 0);
    expect(user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }));
  });

  it("list kosong tetap mengembalikan page kosong", async () => {
    const { prisma, user } = makePrismaMock();
    user.findMany.mockResolvedValue([]);
    user.count.mockResolvedValue(0);

    const service = new UsersAdminService(prisma);
    await expect(service.list("tidak-ada")).resolves.toEqual({ items: [], total: 0 });
  });
});
