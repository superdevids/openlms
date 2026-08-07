import { HttpException, HttpStatus } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { RateLimitMiddleware } from "../../src/common/middleware/rate-limit.middleware";

describe("RateLimitMiddleware", () => {
  const originalEnv = { ...process.env };
  let res: { setHeader: jest.Mock };
  let next: jest.Mock;

  const makeReq = (path: string, ip = "1.2.3.4"): Request =>
    ({ ip, originalUrl: path, url: path }) as unknown as Request;

  const create = (): RateLimitMiddleware => new RateLimitMiddleware();

  const hit = (m: RateLimitMiddleware, times: number, path = "/api/v1/ping"): void => {
    for (let i = 0; i < times; i++) {
      m.use(makeReq(path), res as unknown as Response, next as unknown as NextFunction);
    }
  };

  beforeEach(() => {
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "100";
    process.env.LOGIN_RATE_LIMIT_MAX = "10";
    process.env.REFRESH_RATE_LIMIT_MAX = "30";
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it("melewatkan permintaan di bawah kuota umum", () => {
    const m = create();
    hit(m, 5, "/api/v1/users");
    expect(next).toHaveBeenCalledTimes(5);
    expect(next.mock.calls.every(([err]) => !(err instanceof HttpException))).toBe(true);
  });

  it("mengembalikan 429 + Retry-After setelah kuota umum terlampaui", () => {
    const m = create();
    hit(m, 100, "/api/v1/users");
    m.use(makeReq("/api/v1/users"), res as unknown as Response, next as unknown as NextFunction);
    expect(next).toHaveBeenCalledTimes(101);
    const error = next.mock.calls[100][0] as HttpException;
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
  });

  it("menerapkan kuota login lebih ketat (10/menit)", () => {
    const m = create();
    hit(m, 10, "/api/v1/auth/login");
    m.use(
      makeReq("/api/v1/auth/login"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(11);
    const error = next.mock.calls[10][0] as HttpException;
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("menerapkan kuota refresh 30/menit", () => {
    const m = create();
    hit(m, 30, "/api/v1/auth/refresh");
    m.use(
      makeReq("/api/v1/auth/refresh"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(31);
    const error = next.mock.calls[30][0] as HttpException;
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("kuota per-IP independen (IP berbeda tidak saling potong)", () => {
    const m = create();
    hit(m, 10, "/api/v1/auth/login");
    const res2 = { setHeader: jest.fn() };
    m.use(
      makeReq("/api/v1/auth/login", "5.6.7.8"),
      res2 as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(11);
    expect(next.mock.calls[10][0] as HttpException | undefined).toBeUndefined();
  });

  it("melewati path Socket.IO (di-throttle di Nginx)", () => {
    const m = create();
    hit(m, 200, "/socket.io/?EIO=4&transport=polling");
    expect(next).toHaveBeenCalledTimes(200);
    expect(next.mock.calls.every(([err]) => !(err instanceof HttpException))).toBe(true);
  });

  it("melewati path namespace /ws", () => {
    const m = create();
    hit(m, 200, "/ws?transport=websocket");
    expect(next).toHaveBeenCalledTimes(200);
  });

  it("mereset window setelah lewat waktu (sliding window)", async () => {
    process.env.RATE_LIMIT_WINDOW_MS = "50";
    process.env.LOGIN_RATE_LIMIT_MAX = "2";
    const m = create();
    hit(m, 2, "/api/v1/auth/login");
    m.use(
      makeReq("/api/v1/auth/login"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next.mock.calls[2][0]).toBeInstanceOf(HttpException);

    await new Promise((r) => setTimeout(r, 80));
    m.use(
      makeReq("/api/v1/auth/login"),
      res as unknown as Response,
      next as unknown as NextFunction
    );
    expect(next).toHaveBeenCalledTimes(4);
    expect(next.mock.calls[3][0]).toBeUndefined();
  });
});
