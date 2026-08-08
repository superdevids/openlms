import { GradeType } from "@prisma/client";

/**
 * Perhitungan rekap nilai (F2-T9) — murni, tanpa I/O agar mudah diuji unit.
 * Rata-rata terbobot: sum(score*weight) / sum(weight) per tipe dan keseluruhan.
 */

export interface RecapGradeItem {
  type: GradeType;
  score: number;
  weight: number;
}

export interface TypeRecap {
  type: string;
  count: number;
  totalWeight: number;
  average: number; // dibulatkan ke integer terdekat (nilai Prisma Int)
}

export interface RecapResult {
  perType: Record<string, TypeRecap>;
  overall: TypeRecap;
}

export function computeRecap(items: RecapGradeItem[]): RecapResult {
  const buckets = new Map<string, { count: number; totalWeight: number; weightedSum: number }>();
  let overallWeighted = 0;
  let overallWeightSum = 0;
  let overallCount = 0;

  for (const item of items) {
    // Nilai korup (NaN/Infinity) di-skip agar SATU item rusak tidak merusak
    // agregasi keseluruhan (F2-T9) — rekap tetap usable, bukan NaN.
    if (!Number.isFinite(item.score) || !Number.isFinite(item.weight)) {
      continue;
    }
    const bucket = buckets.get(item.type) ?? { count: 0, totalWeight: 0, weightedSum: 0 };
    bucket.count += 1;
    bucket.totalWeight += item.weight;
    bucket.weightedSum += item.score * item.weight;
    buckets.set(item.type, bucket);

    overallWeighted += item.score * item.weight;
    overallWeightSum += item.weight;
    overallCount += 1;
  }

  const perType: Record<string, TypeRecap> = {};
  for (const [type, bucket] of buckets) {
    perType[type] = {
      type,
      count: bucket.count,
      totalWeight: bucket.totalWeight,
      average: bucket.totalWeight > 0 ? Math.round(bucket.weightedSum / bucket.totalWeight) : 0
    };
  }

  const overall: TypeRecap = {
    type: "RATA_RATA",
    count: overallCount,
    totalWeight: overallWeightSum,
    average: overallWeightSum > 0 ? Math.round(overallWeighted / overallWeightSum) : 0
  };

  return { perType, overall };
}
