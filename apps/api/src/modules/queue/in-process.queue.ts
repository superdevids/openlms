import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { EnqueueOptions, IJobQueue, JobHandler } from "./queue.types";

/**
 * InProcessQueue — implementasi tanpa Redis (fallback dev/F0).
 * - Drain via setImmediate (atau setTimeout bila delayMs > 0).
 * - Isolasi error per-job: satu job gagal tidak menghentikan job lain.
 * - Bukan persisten: job hilang saat proses mati (acceptable utk fallback).
 */
@Injectable()
export class InProcessQueue implements IJobQueue, OnModuleDestroy {
  private readonly logger = new Logger(InProcessQueue.name);
  private readonly handlers = new Map<string, JobHandler>();
  private readonly timeouts = new Set<NodeJS.Timeout>();
  private readonly immediates = new Set<NodeJS.Immediate>();

  async enqueue(name: string, payload: unknown, opts?: EnqueueOptions): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      this.logger.warn(`enqueue tanpa handler: ${name} (job dibuang)`);
      return;
    }

    if (opts?.delayMs && opts.delayMs > 0) {
      const timer = setTimeout(() => {
        void this.execute(name, handler, payload, () => {
          this.timeouts.delete(timer);
        });
      }, opts.delayMs);
      this.timeouts.add(timer);
      return;
    }

    const immediate: NodeJS.Immediate = setImmediate(() => {
      void this.execute(name, handler, payload, () => {
        this.immediates.delete(immediate);
      });
    });
    this.immediates.add(immediate);
  }

  registerHandler(name: string, handler: JobHandler): void {
    if (this.handlers.has(name)) {
      this.logger.warn(`handler duplikat ditimpa: ${name}`);
    }
    this.handlers.set(name, handler);
    this.logger.log(`in-process handler terdaftar: ${name}`);
  }

  isReady(): boolean {
    return true;
  }

  onModuleDestroy(): void {
    for (const timer of this.timeouts) {
      clearTimeout(timer);
    }
    for (const immediate of this.immediates) {
      clearImmediate(immediate);
    }
    this.timeouts.clear();
    this.immediates.clear();
  }

  /** Eksekusi dengan isolasi error — satu job gagal tidak menimpa yang lain. */
  private async execute(
    name: string,
    handler: JobHandler,
    payload: unknown,
    done: () => void
  ): Promise<void> {
    try {
      await handler(payload);
    } catch (err) {
      this.logger.error(`job ${name} gagal: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      done();
    }
  }
}
