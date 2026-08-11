import { PermissionEffect, PermissionScope, Role } from "@prisma/client";
import type { PrismaClient } from "@opensis/database";
import { PermissionsResolver } from "./permissions-resolver";

/**
 * PermissionsResolver spec (F1-T4, prd04 §4.3).
 * Mode in-memory (tanpa REDIS_URL): cache + invalidate.
 * Mode Redis (REDIS_URL + ioredis mock): JSON di Redis, invalidate SCAN+DEL,
 * fallback DB saat Redis error. Test berjalan TANPA Redis nyata.
 */

type MockRedis = {
  on: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  scan: jest.Mock;
  disconnect: jest.Mock;
  quit: jest.Mock;
};

const mockRedis: MockRedis = {
  on: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  scan: jest.fn().mockResolvedValue(["0", []]),
  disconnect: jest.fn(),
  quit: jest.fn()
};

jest.mock("ioredis", () => ({
  Redis: jest.fn(() => mockRedis)
}));

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function makePrisma(permissionRows: unknown[] = [], overrideRows: unknown[] = []) {
  return {
    rolePermission: {
      findMany: jest.fn().mockResolvedValue(permissionRows)
    },
    userPermissionOverride: {
      findMany: jest.fn().mockResolvedValue(overrideRows)
    }
  };
}

const PERMISSION_ROWS = [
  {
    effect: PermissionEffect.ALLOW,
    scope_default: PermissionScope.SEKOLAH,
    permission: { code: "dashboard:read:school" }
  }
];

const EXPECTED_GRANT = [
  { code: "dashboard:read:school", scope: PermissionScope.SEKOLAH, deny: false }
];

const OVERRIDE_ROWS = [
  {
    effect: PermissionEffect.DENY,
    permission: { code: "exams:attempt" }
  }
];

describe("PermissionsResolver (fallback in-memory)", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    jest.clearAllMocks();
  });

  it("resolvePermissions → load DB sekali, lalu cache", async () => {
    const prisma = makePrisma(PERMISSION_ROWS);
    const resolver = new PermissionsResolver(prisma as unknown as PrismaClient);

    const first = await resolver.resolvePermissions(["GURU"] as Role[]);
    expect(first).toEqual(EXPECTED_GRANT);
    expect(prisma.rolePermission.findMany).toHaveBeenCalledTimes(1);

    const second = await resolver.resolvePermissions(["GURU"] as Role[]);
    expect(second).toEqual(EXPECTED_GRANT);
    expect(prisma.rolePermission.findMany).toHaveBeenCalledTimes(1);
  });

  it("invalidate → cache dibuang (query ulang)", async () => {
    const prisma = makePrisma(PERMISSION_ROWS);
    const resolver = new PermissionsResolver(prisma as unknown as PrismaClient);

    await resolver.resolvePermissions(["GURU"] as Role[]);
    resolver.invalidate();
    await resolver.resolvePermissions(["GURU"] as Role[]);
    expect(prisma.rolePermission.findMany).toHaveBeenCalledTimes(2);
  });

  it("resolveOverrides → cache + invalidate", async () => {
    const prisma = makePrisma([], OVERRIDE_ROWS);
    const resolver = new PermissionsResolver(prisma as unknown as PrismaClient);

    const first = await resolver.resolveOverrides("u1");
    expect(first).toEqual([{ code: "exams:attempt", effect: PermissionEffect.DENY }]);
    expect(prisma.userPermissionOverride.findMany).toHaveBeenCalledTimes(1);

    const second = await resolver.resolveOverrides("u1");
    expect(second).toEqual(first);
    expect(prisma.userPermissionOverride.findMany).toHaveBeenCalledTimes(1);

    resolver.invalidate();
    await resolver.resolveOverrides("u1");
    expect(prisma.userPermissionOverride.findMany).toHaveBeenCalledTimes(2);
  });
});

describe("PermissionsResolver (Redis mode)", () => {
  beforeAll(() => {
    process.env.REDIS_URL = "redis://test:6379";
  });

  afterAll(() => {
    delete process.env.REDIS_URL;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolvePermissions → simpan JSON di Redis; hit kedua baca Redis (DB sekali)", async () => {
    mockRedis.get.mockResolvedValue(null);
    const prisma = makePrisma(PERMISSION_ROWS);
    const resolver = new PermissionsResolver(prisma as unknown as PrismaClient);

    const first = await resolver.resolvePermissions(["GURU"] as Role[]);
    expect(first).toEqual(EXPECTED_GRANT);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "perm:GURU",
      JSON.stringify(EXPECTED_GRANT),
      "PX",
      60000
    );

    mockRedis.get.mockResolvedValue(JSON.stringify(EXPECTED_GRANT));
    const second = await resolver.resolvePermissions(["GURU"] as Role[]);
    expect(second).toEqual(EXPECTED_GRANT);
    expect(prisma.rolePermission.findMany).toHaveBeenCalledTimes(1);
  });

  it("resolveOverrides → kunci override:<userId> di Redis", async () => {
    mockRedis.get.mockResolvedValue(null);
    const prisma = makePrisma([], OVERRIDE_ROWS);
    const resolver = new PermissionsResolver(prisma as unknown as PrismaClient);

    const value = await resolver.resolveOverrides("u1");
    expect(value).toEqual([{ code: "exams:attempt", effect: PermissionEffect.DENY }]);
    expect(mockRedis.set).toHaveBeenCalledWith(
      "override:u1",
      JSON.stringify([{ code: "exams:attempt", effect: PermissionEffect.DENY }]),
      "PX",
      60000
    );
  });

  it("invalidate → SCAN+DEL perm:* dan override:*", async () => {
    mockRedis.scan
      .mockResolvedValueOnce(["0", ["perm:ADMIN"]])
      .mockResolvedValueOnce(["0", ["override:u1"]]);
    const prisma = makePrisma(PERMISSION_ROWS);
    const resolver = new PermissionsResolver(prisma as unknown as PrismaClient);

    resolver.invalidate();
    await flush();

    expect(mockRedis.scan).toHaveBeenCalledWith("0", "MATCH", "perm:*", "COUNT", "100");
    expect(mockRedis.scan).toHaveBeenCalledWith("0", "MATCH", "override:*", "COUNT", "100");
    expect(mockRedis.del).toHaveBeenCalledWith("perm:ADMIN");
    expect(mockRedis.del).toHaveBeenCalledWith("override:u1");
  });

  it("Redis error → fallback DB + cache memori (tidak throw)", async () => {
    mockRedis.get.mockRejectedValue(new Error("Redis down"));
    mockRedis.set.mockRejectedValue(new Error("Redis down"));
    const prisma = makePrisma(PERMISSION_ROWS);
    const resolver = new PermissionsResolver(prisma as unknown as PrismaClient);

    const value = await resolver.resolvePermissions(["GURU"] as Role[]);
    expect(value).toEqual(EXPECTED_GRANT);
    expect(prisma.rolePermission.findMany).toHaveBeenCalledTimes(1);

    const again = await resolver.resolvePermissions(["GURU"] as Role[]);
    expect(again).toEqual(EXPECTED_GRANT);
    expect(prisma.rolePermission.findMany).toHaveBeenCalledTimes(1);
  });
});
