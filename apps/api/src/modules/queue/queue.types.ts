/**
 * Queue abstraksi — antrean job opsional (docs/02 §11 queue depth).
 *
 * Dua implementasi:
 * - InProcessQueue: fallback tanpa Redis (dev/F0) — drain via setImmediate,
 *   isolasi error per-job, tidak persisten.
 * - BullMQQueue: produksi bila REDIS_URL tersedia (BullMQ + ioredis),
 *   satu queue + satu Worker yang dispatch per job name.
 *
 * Kontrak API yang dipakai modul lain cukup kecil: enqueue + registerHandler.
 */

export interface EnqueueOptions {
  /** Jeda sebelum job dijalankan (ms). BullMQ: job.delay. */
  delayMs?: number;
  /** jobId unik (BullMQ) — menjadikan enqueue idempoten per id. */
  jobId?: string;
}

/** Handler job — payload dari enqueue, error harus di-isolasi oleh queue. */
export type JobHandler = (payload: unknown) => Promise<void>;

export interface IJobQueue {
  /** Kirim job. Resolve setelah job diterima (bukan setelah dieksekusi). */
  enqueue(name: string, payload: unknown, opts?: EnqueueOptions): Promise<void>;

  /** Daftarkan handler untuk satu nama job (tidak boleh duplikat nama). */
  registerHandler(name: string, handler: JobHandler): void;

  /** true bila antrean siap menerima job (BullMQ terkoneksi / in-process). */
  isReady(): boolean;
}

/** Token DI — provider dipilih di QueueModule (REDIS_URL ada/tidak). */
export const QUEUE_TOKEN = Symbol("IJobQueue");

/** Nama-nama job yang dikenal JobsModule (satu sumber kebenaran). */
export const JOB_NAMES = {
  NOTIFICATIONS_FANOUT: "notifications.fanout",
  PAYROLL_RUN: "payroll.run",
  ROLLOVER_EXECUTE: "rollover.execute",
  REPORT_GENERATE: "report.generate",
  SPP_GENERATE: "spp.generate",
  /** Commit impor data masal (onboarding) — proses berat dipindah dari HTTP. */
  IMPORT_COMMIT: "import.commit",
  /** Auto-submit attempt ujian & kuis yang waktunya habis (G-05). */
  AUTO_SUBMIT_EXPIRED: "auto-submit.expired"
} as const;

/** Redis URL untuk queue; kosong/unset → in-process. */
export function redisQueueUrl(): string {
  return process.env.REDIS_URL?.trim() ?? "";
}
