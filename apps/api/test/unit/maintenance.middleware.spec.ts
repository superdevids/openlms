import { HttpStatus } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { MaintenanceMiddleware } from "../../src/common/middleware/maintenance.middleware";
import type { MaintenanceService } from "../../src/modules/maintenance/maintenance.service";

/**
 * Unit test — MaintenanceMiddleware (global dev/maintenance gate).
 * 1. maintenance OFF → lanjut next().
 * 2. maintenance ON → 503 JSON format { error: { code: "MAINTENANCE", ... } } + Retry-After.
 * 3. Allowlist (/health, /public/system-status, /public/landing*, /admin/system/maintenance)
 *    tetap diteruskan meski maintenance ON.
 * 4. Error status → fail-open (next()).
 */

describe("MaintenanceMiddleware", () => {
  const makeService = (status?: {
    maintenanceEnabled: boolean;
    message: string | null;
    eta: string | null;
  }): { getStatus: jest.Mock } => ({
    getStatus: jest
      .fn()
      .mockResolvedValue(status ?? { maintenanceEnabled: false, message: null, eta: null })
  });

  const makeRes = (): {
    setHeader: jest.Mock;
    status: jest.Mock;
    json: jest.Mock;
  } => {
    const json = jest.fn();
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnValue({ json }),
      json
    };
    return res;
  };

  const makeReq = (path: string): Request =>
    ({ originalUrl: path, url: path }) as unknown as Request;

  const run = async (
    service: ReturnType<typeof makeService>,
    path: string,
    res?: ReturnType<typeof makeRes>
  ): Promise<{ res: ReturnType<typeof makeRes>; next: jest.Mock }> => {
    const m = new MaintenanceMiddleware(service as unknown as MaintenanceService);
    const r = res ?? makeRes();
    const next = jest.fn();
    await m.use(makeReq(path), r as unknown as Response, next as unknown as NextFunction);
    return { res: r, next };
  };

  it("meneruskan request saat maintenance OFF", async () => {
    const { next, res } = await run(
      makeService({ maintenanceEnabled: false, message: null, eta: null }),
      "/api/v1/users"
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("memblokir 503 + Retry-After saat maintenance ON", async () => {
    const { next, res } = await run(
      makeService({ maintenanceEnabled: true, message: "Sedang pemeliharaan", eta: null }),
      "/api/v1/users"
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.any(String));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "MAINTENANCE",
          message: "Sedang pemeliharaan"
        })
      })
    );
  });

  it("memakai pesan default bila message kosong", async () => {
    const { res } = await run(
      makeService({ maintenanceEnabled: true, message: "   ", eta: null }),
      "/api/v1/users"
    );
    const payload = res.json.mock.calls[0][0] as { error: { message: string } };
    expect(payload.error.message.length).toBeGreaterThan(10);
  });

  it("menyertakan ETA pada payload 503", async () => {
    const { res } = await run(
      makeService({ maintenanceEnabled: true, message: "Pemeliharaan", eta: "14:00 WIB" }),
      "/api/v1/users"
    );
    const payload = res.json.mock.calls[0][0] as { error: { eta?: string } };
    expect(payload.error.eta).toBe("14:00 WIB");
  });

  it("menghitung Retry-After dari ETA ISO (detik)", async () => {
    const eta = new Date(Date.now() + 90_000).toISOString();
    const { res } = await run(
      makeService({ maintenanceEnabled: true, message: "Pemeliharaan", eta }),
      "/api/v1/users"
    );
    const [header, value] = res.setHeader.mock.calls.find(([k]) => k === "Retry-After") ?? [];
    expect(header).toBe("Retry-After");
    expect(Number(value)).toBeGreaterThan(60);
    expect(Number(value)).toBeLessThanOrEqual(90);
  });

  it("allowlist /health tetap diteruskan saat maintenance ON", async () => {
    const { next } = await run(
      makeService({ maintenanceEnabled: true, message: null, eta: null }),
      "/api/v1/health"
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allowlist /public/system-status tetap diteruskan", async () => {
    const { next } = await run(
      makeService({ maintenanceEnabled: true, message: null, eta: null }),
      "/api/v1/public/system-status"
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allowlist /public/landing (landing statis) tetap diteruskan", async () => {
    const { next } = await run(
      makeService({ maintenanceEnabled: true, message: null, eta: null }),
      "/api/v1/public/landing"
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allowlist /admin/system/maintenance agar SUPERADMIN bisa mematikan mode", async () => {
    const { next } = await run(
      makeService({ maintenanceEnabled: true, message: null, eta: null }),
      "/api/v1/admin/system/maintenance"
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("fail-open saat service error (DB tidak tersedia)", async () => {
    const service = {
      getStatus: jest.fn().mockRejectedValue(new Error("db down"))
    };
    const { next } = await run(service, "/api/v1/users");
    expect(next).toHaveBeenCalledTimes(1);
  });
});
