import { Injectable } from "@nestjs/common";

export interface MetricsMemory {
  rss: number;
  heap_used: number;
  heap_total: number;
  external: number;
}

export interface MetricsView {
  uptime_seconds: number;
  memory: MetricsMemory;
  event_loop_lag_ms: number;
  pid: number;
  node_version: string;
  timestamp: string;
}

/**
 * MetricsService — observability ringan (tanpa dependency npm tambahan).
 * Membaca process.memoryUsage()/process.uptime()/process.pid/process.version
 * dan mengukur event loop lag via delta waktu setImmediate (latensi tick loop).
 */
@Injectable()
export class MetricsService {
  async collect(): Promise<MetricsView> {
    const [eventLoopLagMs, memory, uptimeSeconds] = await Promise.all([
      this.measureEventLoopLag(),
      Promise.resolve(process.memoryUsage()),
      Promise.resolve(process.uptime())
    ]);

    return {
      uptime_seconds: uptimeSeconds,
      memory: {
        rss: memory.rss,
        heap_used: memory.heapUsed,
        heap_total: memory.heapTotal,
        external: memory.external
      },
      event_loop_lag_ms: eventLoopLagMs,
      pid: process.pid,
      node_version: process.version,
      timestamp: new Date().toISOString()
    };
  }

  /** Ukur event loop lag: selisih waktu antara pemanggilan setImmediate dan eksekusinya (ms). */
  private measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        resolve(Date.now() - start);
      });
    });
  }
}
