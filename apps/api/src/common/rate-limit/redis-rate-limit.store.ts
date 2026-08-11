import { Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { createRedisClient, isRedisConfigured, redisUrl } from "../redis/redis.client";

/**
 * Rate limit store — abstraksi kecil di atas bucket counter.
 * Dua implementasi:
 * - MemoryRateLimitStore: fallback in-memory (Map + cleanup berkala) — dipakai
 *   bila REDIS_URL kosong atau Redis gagal.
 * - RedisRateLimitStore: terdistribusi (multi-instance) — Lua INCR+PEXPIRE
 *   dengan kunci `rl:{key}:{window}`; error Redis → degradasi permanen ke
 *   fallback in-memory (non-fatal, logging warning).
 */

export interface RateLimitResult {
  /** true bila request boleh lanjut (count ≤ max). */
  allowed: boolean;
  /** Epoch ms kapan window berikutnya terbuka (untuk header Retry-After). */
  resetAt: number;
}

export interface RateLimitStore {
  consume(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
  dispose?(): void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Lua atomik: INCR + PEXPIRE hanya saat kunci baru (window pertama). */
const INCR_EXPIRE_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then ttl = 0 end
return { count, ttl }
`;

/**
 * MemoryRateLimitStore — perilaku asli middleware rate-limit (Map in-memory
 * dengan TTL cleanup), dibungkus kontrak store. Semua operasi murni lokal.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private readonly cleanupTimer: NodeJS.Timeout;

  /** Cleanup berkala (interval 2x window default) agar Map tidak membengkak. */
  constructor(cleanupIntervalMs = 120_000) {
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  async consume(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, resetAt: now + windowMs };
    }
    if (bucket.count >= max) {
      return { allowed: false, resetAt: bucket.resetAt };
    }
    bucket.count += 1;
    return { allowed: true, resetAt: bucket.resetAt };
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

/**
 * RedisRateLimitStore — store terdistribusi (sliding/fixed window per interval
 * waktu: `window = Math.floor(Date.now() / windowMs)`). Setiap window punya
 * kunci sendiri (`rl:{key}:{window}`), TTL membersihkan kunci lama.
 * Bila Redis error → degradasi permanen ke fallback in-memory (request tetap
 * jalan, quota dihitung lokal sampai restart — lebih aman daripada 500).
 */
export class RedisRateLimitStore implements RateLimitStore {
  private readonly logger = new Logger(RedisRateLimitStore.name);
  private readonly redis: Redis;
  private readonly fallback: RateLimitStore;
  private degraded = false;

  /**
   * @param url REDIS_URL (dipakai bila `client` tidak diberikan).
   * @param fallback store cadangan (default MemoryRateLimitStore).
   * @param client klien ioredis (inject untuk test).
   */
  constructor(url: string, fallback: RateLimitStore = new MemoryRateLimitStore(), client?: Redis) {
    this.fallback = fallback;
    this.redis = client ?? createRedisClient(url);
    this.redis.on("error", (err) =>
      this.logger.warn(
        `Redis rate-limit error: ${err instanceof Error ? err.message : String(err)}`
      )
    );
  }

  async consume(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    if (this.degraded) {
      return this.fallback.consume(key, windowMs, max);
    }
    try {
      const window = Math.floor(Date.now() / windowMs);
      const redisKey = `rl:${key}:${window}`;
      const [count, pttl] = (await this.redis.eval(
        INCR_EXPIRE_LUA,
        1,
        redisKey,
        String(windowMs)
      )) as [number, number];
      return { allowed: count <= max, resetAt: Date.now() + pttl };
    } catch (err) {
      this.degraded = true;
      this.logger.warn(
        `Redis rate-limit gagal, fallback in-memory: ${err instanceof Error ? err.message : String(err)}`
      );
      return this.fallback.consume(key, windowMs, max);
    }
  }

  dispose(): void {
    if (this.fallback && typeof (this.fallback as RateLimitStore).dispose === "function") {
      (this.fallback as RateLimitStore).dispose?.();
    }
    this.redis.disconnect();
  }
}

/** Pilih store: Redis bila REDIS_URL diset, else in-memory (pola QueueModule). */
export function createRateLimitStore(): RateLimitStore {
  if (!isRedisConfigured()) {
    return new MemoryRateLimitStore();
  }
  return new RedisRateLimitStore(redisUrl());
}
