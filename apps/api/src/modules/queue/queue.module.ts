import { Module } from "@nestjs/common";
import { QUEUE_TOKEN, redisQueueUrl } from "./queue.types";
import { InProcessQueue } from "./in-process.queue";
import { BullMQQueue } from "./bullmq.queue";

/**
 * QueueModule — antrean job opsional (global).
 * Pilih implementasi saat bootstrap:
 * - REDIS_URL tersedia → coba BullMQQueue; bila init gagal → InProcessQueue.
 * - REDIS_URL kosong → InProcessQueue (dev/F0, tanpa dependensi eksternal).
 * Export token QUEUE_TOKEN (Symbol) — konsumen inject via @Inject(QUEUE_TOKEN).
 * Lifecycle shutdown di-handle oleh instance itu sendiri (OnModuleDestroy).
 */
@Module({
  providers: [
    {
      provide: QUEUE_TOKEN,
      useFactory: (): InProcessQueue | BullMQQueue => {
        const url = redisQueueUrl();
        if (!url) {
          return new InProcessQueue();
        }
        const bullmq = new BullMQQueue(url);
        if (bullmq.isReady()) {
          return bullmq;
        }
        // BullMQ gagal init (Redis tidak tersedia) — fallback in-process.
        return new InProcessQueue();
      }
    }
  ],
  exports: [QUEUE_TOKEN]
})
export class QueueModule {}
