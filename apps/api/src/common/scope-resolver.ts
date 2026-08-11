import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import { Redis } from "ioredis";
import { pruneExpiredCache } from "./cache.util";
import { createRedisClient, isRedisConfigured, redisUrl } from "./redis/redis.client";

export interface ResolvedScope {
  classIds: string[];
  homeroomClassId: string | null;
}

interface ScopeCacheEntry {
  value: ResolvedScope;
  expiresAt: number;
}

/**
 * TTL cache scope (ms) — resolve() dipanggil AuthGuard di SETIAP request
 * terautentikasi (3 query DB: ClassSubject + Enrollment + Class). Cache
 * per userId memangkas beban DB saat peak (1500-2000 req/detik ujian).
 * Multi-instance: nilai disimpan di Redis (`scope:<userId>`, TTL 60s) bila
 * REDIS_URL tersedia; fallback in-memory bila REDIS_URL kosong / Redis gagal.
 * Gagal Redis tidak pernah menggagalkan resolve() — request lanjut ke DB.
 */
const SCOPE_TTL_MS = 60_000;

/** Prefix kunci Redis — `scope:<userId>`; dipakai SCAN untuk invalidateAll. */
const SCOPE_PREFIX = "scope:";

/**
 * Cache module-level (static) agar semua instance (AuthGuard via DI dan
 * RealtimeGateway yang membuat instance sendiri) berbagi data yang sama.
 */
const scopeCache = new Map<string, ScopeCacheEntry>();

/** Klien Redis lazy (dibuat saat pertama dipakai); null bila REDIS_URL kosong. */
let redisClient: Redis | null = null;
let redisChecked = false;

function getScopeRedis(): Redis | null {
  if (redisChecked) {
    return redisClient;
  }
  redisChecked = true;
  if (!isRedisConfigured()) {
    return null;
  }
  try {
    redisClient = createRedisClient(redisUrl());
    redisClient.on("error", (err) =>
      logger.warn(`Redis scope-cache error: ${err instanceof Error ? err.message : String(err)}`)
    );
  } catch (err) {
    redisClient = null;
    logger.warn(
      `Redis scope-cache gagal init, fallback in-memory: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  return redisClient;
}

/** Hapus satu kunci scope di Redis (best-effort; memori sudah dihapus sinkron). */
function scopeRedisDelete(userId: string): Promise<void> {
  const client = getScopeRedis();
  if (!client) {
    return Promise.resolve();
  }
  return client.del(`${SCOPE_PREFIX}${userId}`).then(
    () => undefined,
    (err: unknown) => {
      logger.warn(
        `Redis scope-cache DEL gagal: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  );
}

/** Hapus SEMUA kunci scope di Redis via SCAN (best-effort; memori di-clear sinkron). */
function scopeRedisDeleteAll(): Promise<void> {
  const client = getScopeRedis();
  if (!client) {
    return Promise.resolve();
  }
  const run = async (): Promise<void> => {
    let cursor = "0";
    do {
      const [next, keys] = await client.scan(cursor, "MATCH", `${SCOPE_PREFIX}*`, "COUNT", "100");
      if (keys.length > 0) {
        await client.del(...keys);
      }
      cursor = next;
    } while (cursor !== "0");
  };
  return run().catch((err: unknown) => {
    logger.warn(
      `Redis scope-cache flush gagal (cache memori tetap dibersihkan): ${err instanceof Error ? err.message : String(err)}`
    );
  });
}

/**
 * ScopeResolver — prd04 §4.1, F1-T3.
 * Menentukan cakupan data (SENDIRI/KELAS/SEKOLAH) seorang user:
 * - classIds: kelas yang diajar (ClassSubject.teacher_id) + kelas yang diikuti (Enrollment).
 * - homeroomClassId: kelas di mana user menjadi wali kelas (Class.homeroom_teacher_id).
 */
@Injectable()
export class ScopeResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Hapus entri cache scope seorang user (panggil saat keanggotaan kelas berubah).
   * Kontrak static dipertahankan: memori dihapus sinkron; DEL Redis fire-and-forget.
   */
  static invalidateScope(userId: string): void {
    scopeCache.delete(userId);
    void scopeRedisDelete(userId);
  }

  /**
   * Hapus seluruh cache scope (mis. rollover tahun ajaran / import massal).
   * Memori di-clear sinkron; SCAN+DEL Redis fire-and-forget.
   */
  static invalidateAllScope(): void {
    scopeCache.clear();
    void scopeRedisDeleteAll();
  }

  async resolve(userId: string): Promise<ResolvedScope> {
    const cached = await this.readCache(userId);
    if (cached) {
      return cached;
    }

    const value = await this.loadScope(userId);
    await this.writeCache(userId, value);
    return value;
  }

  /** Baca cache: Redis dulu (bila sehat), lalu mirror in-memory sebagai fallback. */
  private async readCache(userId: string): Promise<ResolvedScope | null> {
    const now = Date.now();
    const mem = scopeCache.get(userId);
    if (mem && mem.expiresAt > now) {
      return mem.value;
    }

    const client = getScopeRedis();
    if (!client) {
      return null;
    }
    try {
      const raw = await client.get(`${SCOPE_PREFIX}${userId}`);
      if (raw === null) {
        return null;
      }
      const parsed = JSON.parse(raw) as ResolvedScope;
      if (!Array.isArray(parsed.classIds)) {
        return null;
      }
      // Isi mirror in-memory agar fallback tetap hangat bila Redis mati.
      scopeCache.set(userId, { value: parsed, expiresAt: now + SCOPE_TTL_MS });
      return parsed;
    } catch {
      return null;
    }
  }

  /** Tulis cache: in-memory selalu; Redis best-effort (gagal tidak fatal). */
  private async writeCache(userId: string, value: ResolvedScope): Promise<void> {
    scopeCache.set(userId, { value, expiresAt: Date.now() + SCOPE_TTL_MS });
    pruneExpiredCache(scopeCache);

    const client = getScopeRedis();
    if (!client) {
      return;
    }
    try {
      await client.set(`${SCOPE_PREFIX}${userId}`, JSON.stringify(value), "PX", SCOPE_TTL_MS);
    } catch (err) {
      logger.warn(
        `Redis scope-cache SET gagal (cache memori tetap tersimpan): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  private async loadScope(userId: string): Promise<ResolvedScope> {
    const [taught, enrolled, homeroom] = await Promise.all([
      this.prisma.classSubject.findMany({
        where: { teacher_id: userId },
        select: { class_id: true }
      }),
      this.prisma.enrollment.findMany({
        where: { student_id: userId, status: "ACTIVE" },
        select: { class_id: true }
      }),
      this.prisma.class.findFirst({
        where: { homeroom_teacher_id: userId },
        select: { id: true }
      })
    ]);

    const classIds = [
      ...new Set<string>([...taught.map((t) => t.class_id), ...enrolled.map((e) => e.class_id)])
    ];

    return { classIds, homeroomClassId: homeroom?.id ?? null };
  }
}

const logger = new Logger(ScopeResolver.name);

/** Test-only: reset status klien Redis & cache (panggil sebelum/antara test). */
export function resetScopeRedisForTests(): void {
  redisClient?.disconnect();
  redisClient = null;
  redisChecked = false;
  scopeCache.clear();
}
