/**
 * Unit test — cache.util (TTL dari env, prune cache).
 */
import { cacheEnabled, pruneExpiredCache, readCacheTtlMs } from "../../src/common/cache.util";

describe("cache.util", () => {
  const OLD = process.env.CACHE_TTL_MS;

  afterEach(() => {
    if (OLD === undefined) delete process.env.CACHE_TTL_MS;
    else process.env.CACHE_TTL_MS = OLD;
  });

  it("readCacheTtlMs default bila env tidak diset/kosong", () => {
    delete process.env.CACHE_TTL_MS;
    expect(readCacheTtlMs(5000)).toBe(5000);
    process.env.CACHE_TTL_MS = "   ";
    expect(readCacheTtlMs(5000)).toBe(5000);
  });

  it("readCacheTtlMs memakai nilai env valid", () => {
    process.env.CACHE_TTL_MS = "1234";
    expect(readCacheTtlMs(5000)).toBe(1234);
  });

  it("readCacheTtlMs menolak nilai invalid/negatif → default", () => {
    process.env.CACHE_TTL_MS = "abc";
    expect(readCacheTtlMs(5000)).toBe(5000);
    process.env.CACHE_TTL_MS = "-1";
    expect(readCacheTtlMs(5000)).toBe(5000);
  });

  it("readCacheTtlMs menerima 0 (menonaktifkan cache)", () => {
    process.env.CACHE_TTL_MS = "0";
    expect(readCacheTtlMs(5000)).toBe(0);
  });

  it("cacheEnabled true hanya untuk TTL > 0", () => {
    expect(cacheEnabled(1000)).toBe(true);
    expect(cacheEnabled(0)).toBe(false);
    expect(cacheEnabled(-5)).toBe(false);
  });

  it("pruneExpiredCache tidak melakukan apa-apa di bawah ambang", () => {
    const cache = new Map([["a", { expiresAt: Date.now() - 1000 }]]);
    pruneExpiredCache(cache);
    expect(cache.size).toBe(1);
  });

  it("pruneExpiredCache menghapus entri kedaluwarsa di atas ambang", () => {
    const cache = new Map<string, { expiresAt: number }>();
    for (let i = 0; i < 10_000; i += 1) {
      cache.set(`k${i}`, { expiresAt: Date.now() - 1000 });
    }
    cache.set("fresh", { expiresAt: Date.now() + 1000 });
    pruneExpiredCache(cache);
    expect(cache.has("fresh")).toBe(true);
    expect(cache.size).toBe(1);
  });
});
