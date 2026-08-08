/**
 * Unit test — DashboardConfigService (R-05/R-10).
 * - updateRoleConfig: full-replace transaksional (upsert + delete-missing) + audit.
 * - getMyCards: filter is_enabled + required_permission (canAccess), urut section_order.
 */
import "reflect-metadata";
import type { PermissionsResolver } from "../../src/modules/auth/permissions-resolver";
import { DashboardConfigService } from "../../src/modules/dashboard-config/dashboard-config.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

// writeAudit memakai prisma singleton global — di-mock agar tidak menyentuh DB.
jest.mock("../../src/modules/lms/lms-audit", () => ({
  ROLE_PRIORITY: [
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
  ],
  resolveActorRole: jest.fn(() => "SUPERADMIN" as const),
  writeAudit: jest.fn().mockResolvedValue(undefined)
}));

function cardRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "cfg-1",
    role: "GURU",
    feature_key: "kelas",
    label: "Kelas Saya",
    description: null,
    icon: "book",
    href: "/guru/kelas",
    section_order: 10,
    is_enabled: true,
    required_permission: null,
    updated_by: "admin-1",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
}

function makeResolver(): PermissionsResolver {
  return {
    resolvePermissions: jest.fn().mockResolvedValue([]),
    resolveOverrides: jest.fn().mockResolvedValue([])
  } as unknown as PermissionsResolver;
}

describe("DashboardConfigService", () => {
  let db: MockDb;
  let resolver: PermissionsResolver;

  beforeEach(() => {
    db = createMockDb();
    resolver = makeResolver();
    (db as unknown as { $transaction: jest.Mock }).$transaction = jest
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(db));
  });

  it("getAdminConfigs mengembalikan seluruh kartu terurut role+urutan", async () => {
    const service = new DashboardConfigService(db, resolver);
    mockFn(db, "roleDashboardConfig", "findMany").mockResolvedValue([
      cardRow({ feature_key: "kelas" }),
      cardRow({ feature_key: "tugas", section_order: 20 })
    ]);

    const rows = await service.getAdminConfigs();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.role).toBe("GURU");
    expect(rows[1]?.featureKey).toBe("tugas");
  });

  it("updateRoleConfig melakukan upsert + hapus kartu yang tidak dikirim", async () => {
    const service = new DashboardConfigService(db, resolver);
    mockFn(db, "roleDashboardConfig", "findMany")
      .mockResolvedValueOnce([{ feature_key: "kelas" }, { feature_key: "hapus" }])
      .mockResolvedValueOnce([cardRow({ feature_key: "kelas" })]);
    mockFn(db, "roleDashboardConfig", "upsert").mockResolvedValue(cardRow());
    mockFn(db, "roleDashboardConfig", "deleteMany").mockResolvedValue({ count: 1 });

    const rows = await service.updateRoleConfig(
      "GURU",
      {
        cards: [{ featureKey: "kelas", label: "Kelas Saya", href: "/guru/kelas", sectionOrder: 10 }]
      },
      { userId: "admin-1", roles: ["SUPERADMIN"] }
    );

    expect(rows).toHaveLength(1);
    expect(mockFn(db, "roleDashboardConfig", "upsert")).toHaveBeenCalled();
    expect(mockFn(db, "roleDashboardConfig", "deleteMany")).toHaveBeenCalledWith({
      where: { role: "GURU", feature_key: { in: ["hapus"] } }
    });
  });

  it("getMyCards hanya menampilkan kartu aktif dan yang permissionnya dimiliki", async () => {
    const service = new DashboardConfigService(db, resolver);
    // Simulasi DB: query sudah memfilter is_enabled=true + orderBy feature_key.
    mockFn(db, "roleDashboardConfig", "findMany").mockResolvedValue([
      cardRow({ feature_key: "kelas" }),
      cardRow({ feature_key: "tugas", required_permission: "assignment:read:class" })
    ]);
    // Role GURU TIDAK memiliki assignment:read:class → kartu tugas disaring keluar.
    (resolver.resolvePermissions as jest.Mock).mockResolvedValue([
      { code: "class:read:class", scope: "KELAS", deny: false }
    ]);

    const cards = await service.getMyCards("guru-1", ["GURU"]);
    expect(cards.map((c) => c.featureKey)).toEqual(["kelas"]);
  });

  it("getMyCards mengembalikan kartu ketika permission dimiliki", async () => {
    const service = new DashboardConfigService(db, resolver);
    mockFn(db, "roleDashboardConfig", "findMany").mockResolvedValue([
      cardRow({ feature_key: "kelas" }),
      cardRow({ feature_key: "tugas", required_permission: "assignment:read:class" })
    ]);
    (resolver.resolvePermissions as jest.Mock).mockResolvedValue([
      { code: "assignment:read:class", scope: "KELAS", deny: false }
    ]);

    const cards = await service.getMyCards("guru-1", ["GURU"]);
    expect(cards.map((c) => c.featureKey)).toEqual(["kelas", "tugas"]);
  });

  it("getMyCards mengembalikan [] untuk role tanpa konfigurasi", async () => {
    const service = new DashboardConfigService(db, resolver);
    mockFn(db, "roleDashboardConfig", "findMany").mockResolvedValue([]);
    const cards = await service.getMyCards("calon-1", ["CALON_SISWA"]);
    expect(cards).toEqual([]);
  });
});
