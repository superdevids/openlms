import { Role } from "@prisma/client";
import { PERMISSIONS_KEY } from "../../common/require-permission.decorator";
import { ROLES_KEY } from "../../common/roles.decorator";
import { MetricsController } from "./metrics.controller";
import type { MetricsService, MetricsView } from "./metrics.service";

describe("MetricsController", () => {
  const collect = jest.fn();
  const service = { collect } as unknown as MetricsService;

  let controller: MetricsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MetricsController(service);
  });

  describe("getMetrics", () => {
    it("mendelegasikan ke MetricsService.collect tanpa transformasi", async () => {
      const view = {
        uptime_seconds: 12.5,
        memory: { rss: 1, heap_used: 1, heap_total: 1, external: 1 },
        event_loop_lag_ms: 0,
        pid: 42,
        node_version: "v22.0.0",
        timestamp: "2026-08-16T00:00:00.000Z"
      } satisfies MetricsView;
      collect.mockResolvedValue(view);

      await expect(controller.getMetrics()).resolves.toBe(view);
      expect(collect).toHaveBeenCalledTimes(1);
    });
  });

  describe("RBAC metadata", () => {
    it("hanya SUPERADMIN dengan permission system:status:read", () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        MetricsController.prototype.getMetrics
      ) as Role[];
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        MetricsController.prototype.getMetrics
      ) as string[];

      expect(roles).toContain(Role.SUPERADMIN);
      expect(permissions).toContain("system:status:read");
    });
  });
});
