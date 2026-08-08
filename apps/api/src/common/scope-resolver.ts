import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";
import { pruneExpiredCache } from "./cache.util";

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
 * in-memory per userId memangkas beban DB saat peak (1500-2000 req/detik ujian).
 * Untuk multi-instance, ganti dengan cache terdistribusi (Redis) nanti.
 */
const SCOPE_TTL_MS = 60_000;

/**
 * Cache module-level (static) agar semua instance (AuthGuard via DI dan
 * RealtimeGateway yang membuat instance sendiri) berbagi data yang sama.
 */
const scopeCache = new Map<string, ScopeCacheEntry>();

/**
 * ScopeResolver — prd04 §4.1, F1-T3.
 * Menentukan cakupan data (SENDIRI/KELAS/SEKOLAH) seorang user:
 * - classIds: kelas yang diajar (ClassSubject.teacher_id) + kelas yang diikuti (Enrollment).
 * - homeroomClassId: kelas di mana user menjadi wali kelas (Class.homeroom_teacher_id).
 */
@Injectable()
export class ScopeResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /** Hapus entri cache scope seorang user (panggil saat keanggotaan kelas berubah). */
  static invalidateScope(userId: string): void {
    scopeCache.delete(userId);
  }

  /** Hapus seluruh cache scope (mis. rollover tahun ajaran / import massal). */
  static invalidateAllScope(): void {
    scopeCache.clear();
  }

  async resolve(userId: string): Promise<ResolvedScope> {
    const now = Date.now();
    const cached = scopeCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const value = await this.loadScope(userId);
    scopeCache.set(userId, { value, expiresAt: now + SCOPE_TTL_MS });
    pruneExpiredCache(scopeCache);
    return value;
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
