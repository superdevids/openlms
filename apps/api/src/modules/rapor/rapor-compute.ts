import { GradeType } from "@prisma/client";

/**
 * Komputasi rapor (G-49 e-Rapor v1) — murni, tanpa I/O agar mudah diuji unit.
 *
 * Rumus:
 *   rata_tipe(t)  = round(Σ(score × weight) / Σ(weight)) per tipe grade;
 *   nilai_akhir   = round(Σ(rata_tipe × bobot_tipe) / Σ(bobot_tipe))
 *                   hanya untuk tipe dgn bobot > 0 DAN punya ≥1 grade.
 * Tipe lain (bobot 0 / tanpa grade) di-skip; tidak ada tipe hadir → null.
 * Skor/berat non-finite di-skip (satu item rusak tidak merusak agregasi).
 *
 * Bobot default per tipe (PRAKTIK/SIKAP TIDAK punya bobot default — bisa
 * diaktifkan via pengaturan `raporWeights` di SchoolProfile.settings):
 *   TUGAS 20, KUIS 20, UJIAN 30, SUMATIF 30.
 */

export interface RaporGradeItem {
  type: GradeType;
  score: number;
  weight: number;
}

export interface RaporTypeDetail {
  type: string;
  count: number;
  average: number | null; // null bila tipe tidak punya grade valid
}

export interface RaporComputeResult {
  perType: RaporTypeDetail[];
  nilaiAkhir: number | null;
  predikat: string | null;
}

export const DEFAULT_RAPOR_WEIGHTS: Record<string, number> = {
  TUGAS: 20,
  KUIS: 20,
  UJIAN: 30,
  SUMATIF: 30
};

/** Tipe grade yang dikenali perhitungan rapor (PRAKTIK/SIKAP default 0 bobot). */
export const RAPOR_TYPES: GradeType[] = ["TUGAS", "KUIS", "UJIAN", "PRAKTIK", "SIKAP", "SUMATIF"];

export function predikatOf(nilai: number | null): string | null {
  if (nilai === null) return null;
  if (nilai >= 90) return "A";
  if (nilai >= 80) return "B";
  if (nilai >= 70) return "C";
  if (nilai >= 60) return "D";
  return "E";
}

/**
 * Normalisasi bobot kustom dari pengaturan — hanya menerima angka finite ≥ 0;
 * nilai tidak valid di-skip (fallback default). Menghasilkan Record per GradeType.
 */
export function normalizeRaporWeights(custom: unknown): Record<string, number> {
  const out: Record<string, number> = { ...DEFAULT_RAPOR_WEIGHTS };
  if (!custom || typeof custom !== "object") return out;
  const source = custom as Record<string, unknown>;
  for (const [type, value] of Object.entries(source)) {
    if (!RAPOR_TYPES.includes(type as GradeType)) continue;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) continue;
    out[type] = num;
  }
  return out;
}

export function computeRaporNilai(
  items: RaporGradeItem[],
  weights: Record<string, number> = DEFAULT_RAPOR_WEIGHTS
): RaporComputeResult {
  const buckets = new Map<string, { count: number; totalWeight: number; weightedSum: number }>();

  for (const item of items) {
    if (!Number.isFinite(item.score) || !Number.isFinite(item.weight)) continue;
    const bucket = buckets.get(item.type) ?? { count: 0, totalWeight: 0, weightedSum: 0 };
    bucket.count += 1;
    bucket.totalWeight += item.weight;
    bucket.weightedSum += item.score * item.weight;
    buckets.set(item.type, bucket);
  }

  const perType: RaporTypeDetail[] = RAPOR_TYPES.map((type) => {
    const bucket = buckets.get(type);
    if (!bucket || bucket.totalWeight <= 0) {
      return { type, count: bucket?.count ?? 0, average: null };
    }
    return {
      type,
      count: bucket.count,
      average: Math.round(bucket.weightedSum / bucket.totalWeight)
    };
  });

  // nilai_akhir: hanya tipe dengan bobot > 0 DAN punya ≥1 grade valid.
  let weightedSum = 0;
  let weightTotal = 0;
  for (const detail of perType) {
    const weight = weights[detail.type] ?? 0;
    if (weight <= 0 || detail.average === null) continue;
    weightedSum += detail.average * weight;
    weightTotal += weight;
  }

  const nilaiAkhir = weightTotal > 0 ? Math.round(weightedSum / weightTotal) : null;

  return { perType, nilaiAkhir, predikat: predikatOf(nilaiAkhir) };
}
