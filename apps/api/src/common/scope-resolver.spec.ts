import type { PrismaClient } from "@opensis/database";
import { ScopeResolver, resetScopeRedisForTests } from "./scope-resolver";

/**
 * ScopeResolver spec (F1-T3, prd04 §4.1).
 * Mode in-memory (tanpa REDIS_URL): cache + invalidate per-user/global.
 * Mode Redis (REDIS_URL + ioredis mock): simpan/ambil JSON, DEL per-user,
 * SCAN+DEL global, dan fallback ke DB saat Redis error.
 * Semua test berjalan TANPA Redis nyata.
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

function makePrisma() {
  return {
    classSubject: {
      findMany: jest.fn().mockResolvedValue([{ class_id: "c1" }, { class_id: "c2" }])
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([{ class_id: "c2" }])
    },
    class: {
      findFirst: jest.fn().mockResolvedValue({ id: "h1" })
    }
  };
}

const EXPECTED = { classIds: ["c1", "c2"], homeroomClassId: "h1" };

describe("ScopeResolver (fallback in-memory)", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    resetScopeRedisForTests();
  });

  it("resolve → load dari DB sekali, lalu cache", async () => {
    const prisma = makePrisma();
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);

    const first = await resolver.resolve("u1");
    expect(first).toEqual(EXPECTED);
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(1);

    const second = await resolver.resolve("u1");
    expect(second).toEqual(EXPECTED);
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(1);
  });

  it("invalidateScope → cache user dibuang (query DB lagi)", async () => {
    const prisma = makePrisma();
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);

    await resolver.resolve("u1");
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(1);

    ScopeResolver.invalidateScope("u1");
    await resolver.resolve("u1");
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(2);
  });

  it("invalidateAllScope → seluruh cache dibuang", async () => {
    const prisma = makePrisma();
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);

    await resolver.resolve("u1");
    await resolver.resolve("u2");
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(2);

    ScopeResolver.invalidateAllScope();
    await resolver.resolve("u1");
    await resolver.resolve("u2");
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(4);
  });

  it("resolve menggabungkan kelas diajar + diikuti (dedupe) + homeroom", async () => {
    const prisma = makePrisma();
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([
      { class_id: "c2" },
      { class_id: "c3" }
    ]);
    (prisma.class.findFirst as jest.Mock).mockResolvedValue({ id: "c9" });
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);

    const scope = await resolver.resolve("u1");

    expect(scope.classIds.sort()).toEqual(["c1", "c2", "c3"]);
    expect(scope.homeroomClassId).toBe("c9");
  });

  it("resolve tanpa homeroom → null", async () => {
    const prisma = makePrisma();
    (prisma.classSubject.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.enrollment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.class.findFirst as jest.Mock).mockResolvedValue(null);
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);

    const scope = await resolver.resolve("u1");

    expect(scope.classIds).toEqual([]);
    expect(scope.homeroomClassId).toBeNull();
  });

  it("enrollment hanya difilter status ACTIVE", async () => {
    const prisma = makePrisma();
    (prisma.classSubject.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.class.findFirst as jest.Mock).mockResolvedValue(null);
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);

    await resolver.resolve("u1");

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { student_id: "u1", status: "ACTIVE" } })
    );
  });
});

describe("ScopeResolver (Redis mode)", () => {
  beforeAll(() => {
    process.env.REDIS_URL = "redis://test:6379";
  });

  afterAll(() => {
    delete process.env.REDIS_URL;
    resetScopeRedisForTests();
  });

  beforeEach(() => {
    resetScopeRedisForTests();
    jest.clearAllMocks();
  });

  it("resolve → simpan JSON ke Redis dan baca dari Redis (DB sekali)", async () => {
    mockRedis.get.mockResolvedValue(null);
    const prisma = makePrisma();
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);

    const first = await resolver.resolve("u1");
    expect(first).toEqual(EXPECTED);
    expect(mockRedis.set).toHaveBeenCalledWith("scope:u1", JSON.stringify(EXPECTED), "PX", 60000);

    mockRedis.get.mockResolvedValue(JSON.stringify(EXPECTED));
    const second = await resolver.resolve("u1");
    expect(second).toEqual(EXPECTED);
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(1);
  });

  it("invalidateScope → DEL scope:<userId> di Redis", async () => {
    mockRedis.get.mockResolvedValue(null);
    const prisma = makePrisma();
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);
    await resolver.resolve("u1");

    ScopeResolver.invalidateScope("u1");
    await flush();
    expect(mockRedis.del).toHaveBeenCalledWith("scope:u1");
  });

  it("invalidateAllScope → SCAN scope:* lalu DEL semua kunci", async () => {
    mockRedis.scan.mockResolvedValueOnce(["0", ["scope:u1", "scope:u2"]]);

    ScopeResolver.invalidateAllScope();
    await flush();

    expect(mockRedis.scan).toHaveBeenCalledWith("0", "MATCH", "scope:*", "COUNT", "100");
    expect(mockRedis.del).toHaveBeenCalledWith("scope:u1", "scope:u2");
  });

  it("Redis error → resolve tetap jalan via DB + cache memori (tidak throw)", async () => {
    mockRedis.get.mockRejectedValue(new Error("Redis down"));
    mockRedis.set.mockRejectedValue(new Error("Redis down"));
    const prisma = makePrisma();
    const resolver = new ScopeResolver(prisma as unknown as PrismaClient);

    const value = await resolver.resolve("u1");
    expect(value).toEqual(EXPECTED);
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(1);

    // Cache memori tetap hangat walau Redis mati
    const again = await resolver.resolve("u1");
    expect(again).toEqual(EXPECTED);
    expect(prisma.classSubject.findMany).toHaveBeenCalledTimes(1);
  });
});
