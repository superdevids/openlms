/**
 * Unit test — HealthController (healthcheck API).
 */
import { PrismaClient } from "@opensis/database";
import { HealthController } from "../../src/modules/health/health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  const prismaMock = {
    $queryRaw: jest.fn()
  } as unknown as PrismaClient;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HealthController(prismaMock);
  });

  it("mengembalikan status ok + service opensis-api", () => {
    expect(controller.health()).toEqual({ status: "ok", service: "opensis-api" });
  });

  it("response selalu JSON serializable & deterministik", () => {
    const json = JSON.stringify(controller.health());
    expect(json).toBe('{"status":"ok","service":"opensis-api"}');
  });
});
