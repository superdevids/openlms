/**
 * Util cache in-memory (tanpa dependensi Redis).
 * TTL dibaca dari env `CACHE_TTL_MS` (ms); invalid → default. Nilai 0
 * menonaktifkan cache. Jika kebutuhan multi-instance muncul, ganti dengan
 * cache terdistribusi (Redis) tanpa mengubah kontrak service pemakai.
 */

/** Baca TTL cache dari env CACHE_TTL_MS (ms). Invalid/kosong → default. */
export function readCacheTtlMs(defaultMs = 30_000): number {
  const raw = process.env.CACHE_TTL_MS;
  if (raw === undefined || raw.trim() === "") {
    return defaultMs;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultMs;
}

/** True bila cache aktif (TTL > 0). */
export function cacheEnabled(ttlMs: number): boolean {
  return ttlMs > 0;
}

/** Prune entri kedaluwarsa bila Map membengkak (mencegah memory leak tak terbatas). */
export function pruneExpiredCache<T>(cache: Map<string, T & { expiresAt: number }>): void {
  if (cache.size < 10_000) {
    return;
  }
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}
