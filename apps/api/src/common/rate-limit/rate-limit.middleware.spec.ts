import { HttpException, HttpStatus } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import type { Redis } from "ioredis";
import { RateLimitMiddleware } from "../middleware/rate-limit.middleware";
import {
  createRateLimitStore,
  MemoryRateLimitStore,
  RedisRateLimitStore
} from "./redis-rate-limit.store";

/**
 * Rate limit store + middleware spec (G-06, R-22).
 * Store: memory (kuota, window reset) + Redis via client fake (Lua INCR,
 * fallback saat Redis error). Middleware: keying per-IP/per-user, 429 + Retry-After.
 * Semua test berjalan TANPA Redis nyata (fallback in-memory / client inject).
 */

type MockRedis = {
  eval: jest.Mock;
  on: jest.Mock;
  disconnect: jest.Mock;
  quit: jest.Mock;
};

function makeMockRedis(evalImpl: jest.Mock): MockRedis {
  return {
    eval: evalImpl,
    on: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn()
  };
}

function makeReq(overrides: Record<string, unknown> = {}): Request {
  return {
    originalUrl: "/api/v1/health",
    url: "/api/v1/health",
    method: "GET",
    ip: "127.0.0.1",
    headers: {},
    ...overrides
  } as unknown as Request;
}

function makeRes(): Response {
  const res = { setHeader: jest.fn() } as unknown as Response & { setHeader: jest.Mock };
  return res;
}

function makeNext(): NextFunction & jest.Mock {
  return jest.fn() as unknown as NextFunction & jest.Mock;
}

describe("MemoryRateLimitStore", () => {
  it("membolehkan hingga max request dalam satu window", async () => {
    const store = new MemoryRateLimitStore();
    try {
      for (let i = 1; i <= 3; i += 1) {
        const result = await store.consume("ip:general:3", 60_000, 3);
        expect(result.allowed).toBe(true);
      }
      const denied = await store.consume("ip:general:3", 60_000, 3);
      expect(denied.allowed).toBe(false);
      expect(denied.resetAt).toBeGreaterThan(Date.now());
    } finally {
      store.dispose();
    }
  });

  it("window baru dibuka setelah resetAt (request pertama di window baru lolos)", async () => {
    const store = new MemoryRateLimitStore();
    try {
      await store.consume("k", 60_000, 1);
      const denied = await store.consume("k", 60_000, 1);
      expect(denied.allowed).toBe(false);
      // Simulasikan window kedaluwarsa: tambahkan entri dengan resetAt lampau via consume window kecil.
      const storeShort = new MemoryRateLimitStore();
      try {
        const r = await storeShort.consume("k2", 10, 1);
        expect(r.allowed).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 15));
        const after = await storeShort.consume("k2", 10, 1);
        expect(after.allowed).toBe(true);
      } finally {
        storeShort.dispose();
      }
    } finally {
      store.dispose();
    }
  });
});

describe("RedisRateLimitStore", () => {
  const mockEval = jest.fn();
  let mockRedis: MockRedis;

  beforeEach(() => {
    mockEval.mockReset();
    mockRedis = makeMockRedis(mockEval);
  });

  it("memanggil Lua INCR+PEXPIRE dengan kunci rl:{key}:{window}", async () => {
    mockEval.mockResolvedValue([1, 60_000]);
    const store = new RedisRateLimitStore(
      "redis://unused",
      new MemoryRateLimitStore(),
      mockRedis as unknown as Redis
    );
    try {
      const result = await store.consume("user:1:10", 60_000, 10);
      expect(result.allowed).toBe(true);
      const window = Math.floor(Date.now() / 60_000);
      expect(mockEval).toHaveBeenCalledTimes(1);
      expect(mockEval.mock.calls[0]?.[1]).toBe(1);
      expect(mockEval.mock.calls[0]?.[2]).toBe(`rl:user:1:10:${window}`);
      expect(mockEval.mock.calls[0]?.[3]).toBe("60000");
    } finally {
      store.dispose();
    }
  });

  it("menolak saat count melebihi max", async () => {
    mockEval.mockResolvedValue([11, 60_000]);
    const store = new RedisRateLimitStore(
      "redis://unused",
      new MemoryRateLimitStore(),
      mockRedis as unknown as Redis
    );
    try {
      const result = await store.consume("user:1:10", 60_000, 10);
      expect(result.allowed).toBe(false);
    } finally {
      store.dispose();
    }
  });

  it("fallback ke in-memory bila Redis error (non-fatal, tidak throw)", async () => {
    mockEval.mockRejectedValue(new Error("Redis down"));
    const store = new RedisRateLimitStore(
      "redis://unused",
      new MemoryRateLimitStore(),
      mockRedis as unknown as Redis
    );
    try {
      const first = await store.consume("k", 60_000, 2);
      expect(first.allowed).toBe(true);
      const second = await store.consume("k", 60_000, 2);
      expect(second.allowed).toBe(true);
      const third = await store.consume("k", 60_000, 2);
      expect(third.allowed).toBe(false);
      // Degradasi permanen: Redis hanya dicoba sekali.
      expect(mockEval).toHaveBeenCalledTimes(1);
    } finally {
      store.dispose();
    }
  });
});

describe("createRateLimitStore", () => {
  const original = process.env.REDIS_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = original;
    }
  });

  it("tanpa REDIS_URL → MemoryRateLimitStore (fallback in-memory)", () => {
    delete process.env.REDIS_URL;
    const store = createRateLimitStore();
    try {
      expect(store).toBeInstanceOf(MemoryRateLimitStore);
    } finally {
      store.dispose?.();
    }
  });
});

describe("RateLimitMiddleware", () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  afterEach(() => {
    store.dispose();
    delete process.env.LOGIN_RATE_LIMIT_MAX;
    delete process.env.USER_RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
  });

  it("mengecualikan path realtime (/socket.io)", async () => {
    process.env.LOGIN_RATE_LIMIT_MAX = "1";
    const mw = new RateLimitMiddleware(store);
    const next = makeNext();
    await mw.use(makeReq({ originalUrl: "/socket.io", url: "/socket.io" }), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeUndefined();
  });

  it("login selalu per-IP dengan limit LOGIN_RATE_LIMIT_MAX; 429 + Retry-After setelah melewati", async () => {
    process.env.LOGIN_RATE_LIMIT_MAX = "2";
    const mw = new RateLimitMiddleware(store);
    const res = makeRes();

    for (let i = 1; i <= 2; i += 1) {
      const next = makeNext();
      await mw.use(
        makeReq({ originalUrl: "/api/v1/auth/login", url: "/api/v1/auth/login" }),
        res,
        next
      );
      expect(next.mock.calls[0]?.[0]).toBeUndefined();
    }

    const next = makeNext();
    await mw.use(
      makeReq({ originalUrl: "/api/v1/auth/login", url: "/api/v1/auth/login" }),
      res,
      next
    );
    const err = next.mock.calls[0]?.[0] as HttpException;
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
  });

  it("user terautentikasi dikunci per-IDENTITAS (requestContext.userId), bukan per-IP", async () => {
    process.env.USER_RATE_LIMIT_MAX = "1";
    const mw = new RateLimitMiddleware(store);

    const next1 = makeNext();
    await mw.use(
      makeReq({
        originalUrl: "/api/v1/classes",
        url: "/api/v1/classes",
        requestContext: { userId: "u1" }
      }),
      makeRes(),
      next1
    );
    expect(next1.mock.calls[0]?.[0]).toBeUndefined();

    // IP sama, user SAMA → kena limit
    const next2 = makeNext();
    await mw.use(
      makeReq({
        originalUrl: "/api/v1/classes",
        url: "/api/v1/classes",
        requestContext: { userId: "u1" }
      }),
      makeRes(),
      next2
    );
    expect((next2.mock.calls[0]?.[0] as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS
    );

    // IP sama, user LAIN → tidak terpotong
    const next3 = makeNext();
    await mw.use(
      makeReq({
        originalUrl: "/api/v1/classes",
        url: "/api/v1/classes",
        requestContext: { userId: "u2" }
      }),
      makeRes(),
      next3
    );
    expect(next3.mock.calls[0]?.[0]).toBeUndefined();
  });

  it("endpoint publik per-IP dengan RATE_LIMIT_MAX", async () => {
    process.env.RATE_LIMIT_MAX = "2";
    const mw = new RateLimitMiddleware(store);

    for (let i = 1; i <= 2; i += 1) {
      const next = makeNext();
      await mw.use(makeReq(), makeRes(), next);
      expect(next.mock.calls[0]?.[0]).toBeUndefined();
    }

    const next = makeNext();
    await mw.use(makeReq(), makeRes(), next);
    expect((next.mock.calls[0]?.[0] as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS
    );
  });
});
