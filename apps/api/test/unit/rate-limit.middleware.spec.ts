import { HttpException, HttpStatus } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { RateLimitMiddleware } from "../../src/common/middleware/rate-limit.middleware";
import { signAccessToken } from "../../src/modules/auth/jwt.util";

/**
 * Unit test — RateLimitMiddleware (G-06, R-22).
 * Middleware kini async (store Redis dengan fallback in-memory) sehingga
 * pemanggilan `use()` di-await. Kuota/keying dipertahankan persis seperti
 * sebelum Redis store: login 10/menit, refresh 30/menit, user 60/menit, umum 100/menit.
 */
describe("RateLimitMiddleware", () => {
  const originalEnv = { ...process.env };
  let res: { setHeader: jest.Mock };
  let next: jest.Mock;

  const makeReq = (path: string, ip = "1.2.3.4", cookie?: string): Request => {
    const req = { ip, originalUrl: path, url: path } as unknown as Request;
    if (cookie) {
      (req as Request & { headers: Record<string, string> }).headers = { cookie };
    }
    return req;
  };

  const create = (): RateLimitMiddleware => new RateLimitMiddleware();

  const hit = async (
    m: RateLimitMiddleware,
    times: number,
    path = "/api/v1/ping",
    ip?: string,
    cookie?: string
  ): Promise<void> => {
    for (let i = 0; i < times; i++) {
      await m.use(
        makeReq(path, ip, cookie),
        res as unknown as Response,
        next as unknown as NextFunction
      );
    }
  };

  beforeEach(() => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "100";
    process.env.LOGIN_RATE_LIMIT_MAX = "10";
    process.env.REFRESH_RATE_LIMIT_MAX = "30";
    process.env.USER_RATE_LIMIT_MAX = "60";
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it("melewatkan permintaan di bawah kuota umum", async () => {
    const m = create();
    await hit(m, 5, "/api/v1/users");
    expect(next).toHaveBeenCalledTimes(5);
    expect(next.mock.calls.every(([err]) => !(err instanceof HttpException))).toBe(true);
  });

  it("mengembalikan 429 + Retry-After setelah kuota umum terlampaui", async () => {
    const m = create();
    await hit(m, 100, "/api/v1/users");
    await m.use(
      makeReq("/api/v1/users"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(101);
    const error = next.mock.calls[100][0] as HttpException;
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
  });

  it("menerapkan kuota login lebih ketat (10/menit per-IP)", async () => {
    const m = create();
    await hit(m, 10, "/api/v1/auth/login");
    await m.use(
      makeReq("/api/v1/auth/login"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(11);
    const error = next.mock.calls[10][0] as HttpException;
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("menerapkan kuota refresh 30/menit", async () => {
    const m = create();
    await hit(m, 30, "/api/v1/auth/refresh");
    await m.use(
      makeReq("/api/v1/auth/refresh"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(31);
    const error = next.mock.calls[30][0] as HttpException;
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("kuota per-IP independen (IP berbeda tidak saling potong)", async () => {
    const m = create();
    await hit(m, 10, "/api/v1/auth/login");
    const res2 = { setHeader: jest.fn() };
    await m.use(
      makeReq("/api/v1/auth/login", "5.6.7.8"),
      res2 as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(11);
    expect(next.mock.calls[10][0] as HttpException | undefined).toBeUndefined();
  });

  it("melewati path Socket.IO (di-throttle di Nginx)", async () => {
    const m = create();
    await hit(m, 200, "/socket.io/?EIO=4&transport=polling");
    expect(next).toHaveBeenCalledTimes(200);
    expect(next.mock.calls.every(([err]) => !(err instanceof HttpException))).toBe(true);
  });

  it("melewati path namespace /ws", async () => {
    const m = create();
    await hit(m, 200, "/ws?transport=websocket");
    expect(next).toHaveBeenCalledTimes(200);
  });

  it("mereset window setelah lewat waktu (sliding window)", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "50";
    process.env.LOGIN_RATE_LIMIT_MAX = "2";
    const m = create();
    await hit(m, 2, "/api/v1/auth/login");
    await m.use(
      makeReq("/api/v1/auth/login"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next.mock.calls[2][0]).toBeInstanceOf(HttpException);

    await new Promise((r) => setTimeout(r, 80));
    await m.use(
      makeReq("/api/v1/auth/login"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(4);
    expect(next.mock.calls[3][0]).toBeUndefined();
  });

  describe("G-06 — keying per identitas user untuk route terautentikasi", () => {
    it("user terautentikasi memakai kuota USER_RATE_LIMIT_MAX (bukan per-IP umum)", async () => {
      process.env.RATE_LIMIT_MAX = "5";
      const token = signAccessToken({ sub: "user-1" });
      const cookie = `opensis_session=${token}`;
      const m = create();
      // 5 request user dari IP yang sama (kuota umum per-IP hanya 5) tetap lolos
      // karena dikunci per-user (USER_RATE_LIMIT_MAX = 60).
      await hit(m, 10, "/api/v1/exam/attempts/att1/answers", "10.0.0.1", cookie);
      expect(next).toHaveBeenCalledTimes(10);
      expect(next.mock.calls.every(([err]) => !(err instanceof HttpException))).toBe(true);
    });

    it("user terlampaui kuota per-user → 429", async () => {
      const token = signAccessToken({ sub: "user-1" });
      const cookie = `opensis_session=${token}`;
      const m = create();
      await hit(m, 60, "/api/v1/exam/attempts/att1/answers", "10.0.0.1", cookie);
      await m.use(
        makeReq("/api/v1/exam/attempts/att1/answers", "10.0.0.1", cookie),
        res as unknown as Response,
        next as unknown as NextFunction
      );
      expect(next).toHaveBeenCalledTimes(61);
      const error = next.mock.calls[60][0] as HttpException;
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
    });

    it("dua user di belakang NAT IP sama tidak saling potong kuota", async () => {
      const tokenA = signAccessToken({ sub: "user-a" });
      const tokenB = signAccessToken({ sub: "user-b" });
      const m = create();
      // user-a hampir penuh kuota per-user
      await hit(
        m,
        59,
        "/api/v1/exam/attempts/att1/answers",
        "10.0.0.1",
        `opensis_session=${tokenA}`
      );
      // user-b (IP sama) tetap jalan penuh tanpa terblokir
      await hit(
        m,
        59,
        "/api/v1/exam/attempts/att1/answers",
        "10.0.0.1",
        `opensis_session=${tokenB}`
      );
      expect(next).toHaveBeenCalledTimes(118);
      expect(next.mock.calls.every(([err]) => !(err instanceof HttpException))).toBe(true);
    });

    it("cookie opensis_access juga dikenali sebagai identitas", async () => {
      const token = signAccessToken({ sub: "user-1" });
      const m = create();
      await hit(m, 10, "/api/v1/me", "10.0.0.1", `opensis_access=${token}`);
      expect(next).toHaveBeenCalledTimes(10);
      expect(next.mock.calls.every(([err]) => !(err instanceof HttpException))).toBe(true);
    });

    it("login tetap per-IP meski request membawa cookie user", async () => {
      const token = signAccessToken({ sub: "user-1" });
      const m = create();
      await hit(m, 10, "/api/v1/auth/login", "10.0.0.1", `opensis_session=${token}`);
      await m.use(
        makeReq("/api/v1/auth/login", "10.0.0.1", `opensis_session=${token}`),
        res as unknown as Response,
        next as unknown as NextFunction
      );
      expect(next).toHaveBeenCalledTimes(11);
      const error = next.mock.calls[10][0] as HttpException;
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });
  });
});
