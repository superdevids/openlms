import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  const service = new MetricsService();

  describe("collect", () => {
    it("mengembalikan semua field kontrak MetricsView", async () => {
      const m = await service.collect();

      expect(m).toMatchObject({
        uptime_seconds: expect.any(Number),
        pid: process.pid,
        node_version: process.version,
        timestamp: expect.any(String)
      });
      expect(m.memory).toEqual(
        expect.objectContaining({
          rss: expect.any(Number),
          heap_used: expect.any(Number),
          heap_total: expect.any(Number),
          external: expect.any(Number)
        })
      );
      expect(typeof m.event_loop_lag_ms).toBe("number");
    });

    it("nilai memori tidak negatif dan heap_total >= heap_used", async () => {
      const m = await service.collect();

      expect(m.memory.rss).toBeGreaterThanOrEqual(0);
      expect(m.memory.heap_used).toBeGreaterThanOrEqual(0);
      expect(m.memory.heap_total).toBeGreaterThanOrEqual(m.memory.heap_used);
      expect(m.memory.external).toBeGreaterThanOrEqual(0);
    });

    it("event loop lag terukur >= 0 (setImmediate delta)", async () => {
      const m = await service.collect();

      expect(m.event_loop_lag_ms).toBeGreaterThanOrEqual(0);
    });

    it("uptime_seconds >= 0 dan timestamp adalah ISO-8601 valid", async () => {
      const m = await service.collect();

      expect(m.uptime_seconds).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(Date.parse(m.timestamp))).toBe(false);
      expect(new Date(m.timestamp).toISOString()).toBe(m.timestamp);
    });

    it("pid dan node_version mencerminkan proses berjalan", async () => {
      const m = await service.collect();

      expect(m.pid).toBe(process.pid);
      expect(m.node_version).toBe(process.version);
    });
  });
});
