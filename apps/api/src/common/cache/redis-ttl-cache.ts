import { Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { TtlCache } from "./ttl-cache";

/**
 * RedisTtlCache — cache TTL terdistribusi (Redis, JSON) dengan fallback
 * in-memory. Kontrak `wrap`/`invalidateAll` sama dengan TtlCache sehingga
 * pemakai bisa memilih implementasi tanpa mengubah logika pemanggil.
 *
 * - Nilai disimpan di Redis dengan kunci `{keyPrefix}{key}` dan TTL.
 * - Cache in-memory dipakai sebagai mirror + fallback: bila Redis error
 *   (mis. koneksi mati) → degradasi permanen ke memori (request tetap jalan,
 *   tidak pernah gagal karena cache).
 * - invalidateAll() membersihkan memori SINKRON (saat dipanggil) lalu
 *   SCAN+DEL kunci ber-prefix di Redis secara async (best-effort).
 */
export class RedisTtlCache<V> {
  private readonly logger = new Logger(RedisTtlCache.name);
  private readonly memory: TtlCache<V>;
  private degraded = false;

  constructor(
    private readonly ttlMs: number,
    private readonly keyPrefix: string,
    private readonly redis: Redis
  ) {
    this.memory = new TtlCache<V>(this.ttlMs);
  }

  /** Ambil dari Redis; miss → loader; hasil selalu di-mirror ke memori. */
  async wrap(key: string, loader: () => Promise<V>): Promise<V> {
    const redisKey = `${this.keyPrefix}${key}`;

    if (!this.degraded) {
      try {
        const raw = await this.redis.get(redisKey);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as V;
          this.memory.set(key, parsed);
          return parsed;
        }
      } catch (err) {
        this.degraded = true;
        this.logger.warn(
          `Redis ${this.keyPrefix} gagal dibaca, fallback in-memory: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    const value = await this.memory.wrap(key, loader);

    if (!this.degraded) {
      void this.redis
        .set(redisKey, JSON.stringify(value), "PX", this.ttlMs)
        .catch((err: unknown) => {
          this.degraded = true;
          this.logger.warn(
            `Redis ${this.keyPrefix} gagal ditulis, fallback in-memory: ${err instanceof Error ? err.message : String(err)}`
          );
        });
    }
    return value;
  }

  /**
   * Hapus seluruh entri. Memori dibersihkan sinkron (efek langsung);
   * SCAN+DEL Redis berjalan async — kegagalan Redis tidak menghentikan pemanggil.
   */
  async invalidateAll(): Promise<void> {
    this.memory.invalidateAll();
    try {
      let cursor = "0";
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          "MATCH",
          `${this.keyPrefix}*`,
          "COUNT",
          "100"
        );
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        cursor = next;
      } while (cursor !== "0");
    } catch (err) {
      this.logger.warn(
        `Redis ${this.keyPrefix} invalidateAll gagal (memori sudah dibersihkan): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
