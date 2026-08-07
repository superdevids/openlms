# README.queue.md — Modul Queue (apps/api/src/modules/queue)

## Fungsi Folder

Abstraksi **antrean job** (global). Memilih implementasi saat bootstrap:
BullMQ + Redis bila `REDIS_URL` tersedia dan init sukses; selain itu fallback
**in-process** (single-instance, tanpa dependensi eksternal). Konsumen
meng-inject via token `QUEUE_TOKEN` (Symbol) — tidak perlu tahu implementasi.

## Daftar Fitur

- Kontrak antrean seragam: `enqueue`, `registerHandler`, `isReady`.
- `BullMQQueue`: satu queue (`openlms-jobs`) + Worker concurrency 5, retry
  exponential, `removeOnComplete/Fail` 1000, shutdown rapi.
- `InProcessQueue`: antrean memori (dev/single-instance).
- Tanpa `REDIS_URL` aplikasi tetap berjalan (fallback in-process).

## Struktur File

| File                  | Isi                                                                         |
| --------------------- | --------------------------------------------------------------------------- |
| `queue.module.ts`     | Provider `QUEUE_TOKEN` (pilih implementasi)                                 |
| `queue.types.ts`      | `IJobQueue`, `EnqueueOptions`, `JobHandler`, `JOB_NAMES`, `redisQueueUrl()` |
| `bullmq.queue.ts`     | Implementasi Redis (BullMQ + ioredis)                                       |
| `in-process.queue.ts` | Implementasi memori                                                         |
