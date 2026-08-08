/**
 * TtlCache — cache in-memory generik (Map + timestamp + TTL) tanpa dependensi Redis.
 *
 * Dipakai untuk hot reads yang berulang (scope RBAC, permission set, config
 * global, dst.). Kontrak:
 * - `get(key)` mengembalikan nilai yang belum kedaluwarsa, else `undefined`.
 * - `set(key, value)` menyimpan dengan TTL yang dikonfigurasi saat konstruksi.
 * - `invalidate(key)` / `invalidateAll()` untuk membuang entri saat ada write.
 * - `wrap(key, loader)` mengambil cache lalu fallback ke loader (loader GAGAL
 *   tidak pernah throw dari sisi cache — error loader tetap diteruskan, nilai
 *   tidak di-cache; konsumen wajib fallback ke DB sendiri bila diperlukan).
 *
 * Semua operasi murni di memori — tidak pernah throw (selain error loader yang
 * memang disebar). Untuk multi-instance, ganti implementasi dengan Redis tanpa
 * mengubah kontrak pemakai.
 */
export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();

  /** TTL per entri (ms); 0 = nonaktif (selalu miss). */
  constructor(private readonly ttlMs: number) {}

  /** Nilai entri yang belum kedaluwarsa; undefined bila tidak ada / kedaluwarsa. */
  get(key: string): V | undefined {
    if (this.ttlMs <= 0) return undefined;
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.ttlMs <= 0) return;
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Hapus satu entri. */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Hapus seluruh entri. */
  invalidateAll(): void {
    this.store.clear();
  }

  /**
   * Ambil dari cache; miss → panggil loader, simpan hasilnya.
   * Loader error diteruskan (tidak di-cache); nilai tidak pernah gagal karena
   * cache — konsumen tetap memegang kendali fallback.
   */
  async wrap(key: string, loader: () => Promise<V>): Promise<V> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    this.set(key, value);
    return value;
  }

  /** Prune entri kedaluwarsa bila map membengkak (cegah memory leak tak terbatas). */
  prune(): void {
    if (this.store.size < 10_000) return;
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }
}
