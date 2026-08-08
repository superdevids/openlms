/**
 * Logika PROMOSI rollover — fungsi MURNI (tanpa DB), dipakai bersama oleh
 * dry-run dan execute agar hasilnya SELALU konsisten (05 M-ROLLOVER-T4/T5).
 *
 * Aturan default:
 * - TRANSFERRED/DROPPED tetap sesuai status enrollment saat ini.
 * - Kelas akhir (>= maxGradeLevel, default 12):
 *     lulus jika rata-rata nilai >= passingScore DAN absensi >= minAttendanceRate
 *     -> GRADUATED, selain itu REPEATED.
 * - Kelas di bawahnya: lulus -> PROMOTED (naik kelas), gagal -> REPEATED.
 * - overrides (dari draft "override promosi") menang atas aturan default.
 */
import type { EnrollmentStatus, RolloverAction } from "@opensis/types";

export interface PromotionConfig {
  passingScore: number;
  minAttendanceRate: number;
  maxGradeLevel: number;
}

export const DEFAULT_PROMOTION_CONFIG: PromotionConfig = {
  passingScore: 60,
  minAttendanceRate: 0.75,
  maxGradeLevel: 12
};

export interface StudentEvaluation {
  studentId: string;
  sourceClassId: string;
  /** Nama kelas asal, dipakai untuk menurunkan nama kelas baru. */
  sourceClassName: string;
  gradeLevel: number;
  currentStatus: EnrollmentStatus;
  /** Map subjectId -> nilai akhir (0-100). */
  finalScores: Record<string, number>;
  /** 0..1 (persentase kehadiran). */
  attendanceRate: number;
}

export interface StudentDecision {
  studentId: string;
  sourceClassId: string;
  action: RolloverAction;
  averageScore: number | null;
  /** Kunci kelas tujuan — null untuk GRADUATED/TRANSFERRED/DROPPED. */
  targetClassKey: string | null;
  reason: string;
}

export interface NewClassPlan {
  key: string;
  sourceClassId: string;
  name: string;
  gradeLevel: number;
  repeated: boolean;
}

export interface PromotionPlan {
  decisions: StudentDecision[];
  classes: NewClassPlan[];
  counts: Record<RolloverAction, number>;
}

const ROMAN: Record<number, string> = { 10: "X", 11: "XI", 12: "XII" };

/** Nama kelas baru: "X IPA 1" -> "XI IPA 1"; ulangan ditandai "(U)". */
export function nextClassName(sourceName: string, targetGrade: number, repeated: boolean): string {
  const roman = ROMAN[targetGrade] ?? String(targetGrade);
  const withoutPrefix = sourceName.replace(/^(XII|XI|X{1,2})/i, "").trim();
  const base = withoutPrefix.length > 0 ? `${roman} ${withoutPrefix}` : roman;
  return repeated ? `${base} (U)` : base;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function targetClassKey(sourceClassId: string, gradeLevel: number, repeated: boolean): string {
  return `${sourceClassId}:${gradeLevel}:${repeated ? 1 : 0}`;
}

export function evaluateStudent(
  student: StudentEvaluation,
  config: PromotionConfig = DEFAULT_PROMOTION_CONFIG,
  overrides: Record<string, RolloverAction> = {}
): StudentDecision {
  const base = {
    studentId: student.studentId,
    sourceClassId: student.sourceClassId,
    averageScore: null as number | null,
    targetClassKey: null as string | null
  };

  const override = overrides[student.studentId];
  if (override) {
    return { ...base, action: override, reason: "override promosi (input operator)" };
  }
  if (student.currentStatus === "TRANSFERRED") {
    return { ...base, action: "TRANSFERRED", reason: "status pindah (TRANSFERRED)" };
  }
  if (student.currentStatus === "DROPPED") {
    return { ...base, action: "DROPPED", reason: "status keluar (DROPPED)" };
  }

  const scores = Object.values(student.finalScores);
  const avg = scores.length === 0 ? null : average(scores);
  const passes =
    avg !== null &&
    avg >= config.passingScore &&
    student.attendanceRate >= config.minAttendanceRate;

  // Data korup: gradeLevel di bawah 1 tidak punya kelas tujuan valid untuk
  // naik (SMA/SMK hanya 10-12). Jangan promosikan; ulang di kelas yang sama.
  if (student.gradeLevel <= 0) {
    return {
      ...base,
      averageScore: avg,
      action: "REPEATED",
      targetClassKey: targetClassKey(student.sourceClassId, student.gradeLevel, true),
      reason: `data gradeLevel tidak valid (${student.gradeLevel}) — tinggal kelas`
    };
  }

  if (student.gradeLevel >= config.maxGradeLevel) {
    return {
      ...base,
      averageScore: avg,
      action: passes ? "GRADUATED" : "REPEATED",
      targetClassKey: passes
        ? null
        : targetClassKey(student.sourceClassId, student.gradeLevel, true),
      reason: passes
        ? "lulus dari kelas akhir"
        : `tidak tuntas kelas akhir (rata-rata ${avg ?? "-"})`
    };
  }

  const promoted = passes;
  return {
    ...base,
    averageScore: avg,
    action: promoted ? "PROMOTED" : "REPEATED",
    targetClassKey: targetClassKey(
      student.sourceClassId,
      promoted ? student.gradeLevel + 1 : student.gradeLevel,
      !promoted
    ),
    reason: promoted ? "naik kelas" : `tinggal kelas (rata-rata ${avg ?? "-"})`
  };
}

export function buildPromotionPlan(
  students: StudentEvaluation[],
  config: PromotionConfig = DEFAULT_PROMOTION_CONFIG,
  overrides: Record<string, RolloverAction> = {}
): PromotionPlan {
  const decisions = students.map((s) => evaluateStudent(s, config, overrides));

  const classes: NewClassPlan[] = [];
  const seen = new Set<string>();
  for (const d of decisions) {
    if (!d.targetClassKey || seen.has(d.targetClassKey)) continue;
    seen.add(d.targetClassKey);
    const parts = d.targetClassKey.split(":");
    const sourceClassId = parts[0] ?? "";
    const gradeLevel = Number(parts[1] ?? "10");
    const repeated = parts[2] === "1";
    const sourceName =
      students.find((s) => s.sourceClassId === sourceClassId)?.sourceClassName ?? "Kelas Baru";
    classes.push({
      key: d.targetClassKey,
      sourceClassId,
      name: nextClassName(sourceName, gradeLevel, repeated),
      gradeLevel,
      repeated
    });
  }

  const counts: Record<RolloverAction, number> = {
    PROMOTED: 0,
    REPEATED: 0,
    GRADUATED: 0,
    TRANSFERRED: 0,
    DROPPED: 0
  };
  for (const d of decisions) counts[d.action] += 1;

  return { decisions, classes, counts };
}
