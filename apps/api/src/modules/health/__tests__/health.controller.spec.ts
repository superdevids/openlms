import { ServiceUnavailableException } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import { HealthController } from "../health.controller";

describe("HealthController", () => {
  const prismaMock = {
    $queryRaw: jest.fn()
  } as unknown as PrismaClient;

  let controller: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HealthController(prismaMock);
  });

  describe("GET /health (liveness)", () => {
    it("tetap ok tanpa menyentuh DB", () => {
      expect(controller.health()).toEqual({ status: "ok", service: "opensis-api" });
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe("GET /health/ready (readiness)", () => {
    it("DB sehat → status ok + checks.database ok", async () => {
      (prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ "1": 1 }]);

      const result = await controller.ready();

      expect(result).toEqual({ status: "ok", checks: { database: "ok" } });
      expect(prismaMock.$queryRaw).toHaveBeenCalled();
    });

    it("DB gagal → ServiceUnavailableException (503) SERVICE_DEGRADED", async () => {
      (prismaMock.$queryRaw as jest.Mock).mockRejectedValue(new Error("connect ECONNREFUSED"));

      await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
      try {
        await controller.ready();
      } catch (err) {
        const e = err as ServiceUnavailableException;
        expect(e.getStatus()).toBe(503);
        expect(e.getResponse()).toEqual({
          error: { code: "SERVICE_DEGRADED", message: "Database tidak tersedia" }
        });
      }
    });
  });
});
