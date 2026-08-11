import { Redis } from "ioredis";

/**
 * Klien Redis bersama untuk cache terdistribusi (multi-instance).
 *
 * Pola yang dipakai konsumen (rate-limit store, scope resolver, permission
 * cache): REDIS_URL kosong/unset → fallback in-memory; REDIS_URL diset tetapi
 * koneksi gagal → command cepat gagal (maxRetriesPerRequest: 1 +
 * enableOfflineQueue: false) lalu konsumen menangkap error dan lanjut ke
 * fallback in-memory — boot maupun request TIDAK pernah gagal karena Redis.
 */

/** URL Redis dari env; kosong/unset → tanpa Redis. */
export function redisUrl(): string {
  return process.env.REDIS_URL?.trim() ?? "";
}

/** true bila REDIS_URL diset (klien tetap bisa gagal connect). */
export function isRedisConfigured(): boolean {
  return redisUrl() !== "";
}

/**
 * Buat klien ioredis dengan opsi fast-fail untuk cache hot-path:
 * - maxRetriesPerRequest: 1 → command tidak menggantung saat Redis mati.
 * - enableOfflineQueue: false → command langsung reject saat offline.
 * - retryStrategy: tetap reconnect bertahap (Redis mungkin pulih).
 */
export function createRedisClient(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 2000)
  });
}
