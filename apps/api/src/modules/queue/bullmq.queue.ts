import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import type { Job } from "bullmq";
import { Redis } from "ioredis";
import type { EnqueueOptions, IJobQueue, JobHandler } from "./queue.types";

/** Nama queue BullMQ tunggal untuk seluruh job openlms. */
export const BULLMQ_QUEUE_NAME = "openlms-jobs";

/** Opsi koneksi ioredis: producer wajib maxRetriesPerRequest=1. */
function producerRedis(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: false,
    connectTimeout: 5_000,
    retryStrategy: (times: number) => Math.min(times * 200, 2_000)
  });
}

/** Opsi koneksi ioredis: worker butuh blocking (maxRetriesPerRequest=null). */
function workerRedis(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 5_000,
    retryStrategy: (times: number) => Math.min(times * 200, 2_000)
  });
}

/**
 * BullMQQueue — implementasi produksi memakai Redis (BullMQ + ioredis).
 * Satu queue + satu Worker; Worker dispatch per job.name ke handler terdaftar.
 * Init try/catch: bila Redis tidak tersedia, isReady() = false → QueueModule
 * fallback ke InProcessQueue (app tetap berjalan tanpa antrean persisten).
 * Shutdown rapi: close worker → queue → koneksi Redis.
 */
@Injectable()
export class BullMQQueue implements IJobQueue, OnModuleDestroy {
  private readonly logger = new Logger(BullMQQueue.name);
  private readonly handlers = new Map<string, JobHandler>();
  private readonly producerConn: Redis | null;
  private readonly workerConn: Redis | null;
  private readonly queue: Queue | null;
  private readonly worker: Worker | null;
  private ready = false;

  constructor(url: string) {
    let producer: Redis | null = null;
    let workerConn: Redis | null = null;
    let queue: Queue | null = null;
    let worker: Worker | null = null;

    try {
      producer = producerRedis(url);
      workerConn = workerRedis(url);
      queue = new Queue(BULLMQ_QUEUE_NAME, {
        connection: producer,
        defaultJobOptions: {
          removeOnComplete: 1_000,
          removeOnFail: 1_000,
          attempts: 3,
          backoff: { type: "exponential", delay: 2_000 }
        }
      });
      worker = new Worker(
        BULLMQ_QUEUE_NAME,
        async (job: Job) => {
          const handler = this.handlers.get(job.name);
          if (!handler) {
            this.logger.warn(`job tanpa handler: ${job.name} id=${job.id}`);
            return;
          }
          await handler(job.data);
        },
        { connection: workerConn, concurrency: 5 }
      );
      worker.on("failed", (job: Job | undefined, err: Error) => {
        this.logger.error(`job ${job?.name ?? "?"} gagal: ${err.message}`);
      });
      this.ready = true;
      this.logger.log(`BullMQ siap (REDIS_URL), queue=${BULLMQ_QUEUE_NAME}`);
    } catch (err) {
      this.logger.warn(
        `BullMQ init gagal, fallback in-process: ${err instanceof Error ? err.message : String(err)}`
      );
      void producer?.disconnect();
      void workerConn?.disconnect();
      producer = null;
      workerConn = null;
      queue = null;
      worker = null;
    }

    this.producerConn = producer;
    this.workerConn = workerConn;
    this.queue = queue;
    this.worker = worker;
  }

  async enqueue(name: string, payload: unknown, opts?: EnqueueOptions): Promise<void> {
    if (!this.ready || !this.queue) {
      throw new Error("BullMQQueue tidak siap — gunakan in-process fallback");
    }
    await this.queue.add(name, payload as Record<string, unknown>, {
      ...(opts?.delayMs != null ? { delay: opts.delayMs } : {}),
      ...(opts?.jobId != null ? { jobId: opts.jobId } : {})
    });
  }

  registerHandler(name: string, handler: JobHandler): void {
    if (this.handlers.has(name)) {
      this.logger.warn(`handler duplikat ditimpa: ${name}`);
    }
    this.handlers.set(name, handler);
    this.logger.log(`bullmq handler terdaftar: ${name}`);
  }

  isReady(): boolean {
    return this.ready;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    if (this.producerConn) {
      this.producerConn.disconnect();
    }
    if (this.workerConn) {
      this.workerConn.disconnect();
    }
  }
}
