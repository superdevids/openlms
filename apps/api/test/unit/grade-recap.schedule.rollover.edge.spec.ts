/**
 * Unit test — grade-recap & schedule-validator & rollover.promotion edge.
 */
import { GradeType } from "@prisma/client";
import { computeRecap } from "../../src/modules/lms/grades/grade-recap";
import { findConflicts, periodsOverlap } from "../../src/modules/lms/classes/schedule-validator";
import {
  buildPromotionPlan,
  DEFAULT_PROMOTION_CONFIG,
  evaluateStudent,
  nextClassName
} from "../../src/modules/rollover/rollover.promotion";

describe("grade-recap edge", () => {
  it("item dengan score NaN/Infinity di-skip", () => {
    const result = computeRecap([
      { type: GradeType.TUGAS, score: 80, weight: 2 },
      { type: GradeType.TUGAS, score: Number.NaN, weight: 1 },
      { type: GradeType.TUGAS, score: Number.POSITIVE_INFINITY, weight: 1 }
    ]);
    expect(result.overall.count).toBe(1);
    expect(result.overall.average).toBe(80);
  });

  it("weight 0 di-skip (tidak membagi dengan 0)", () => {
    const result = computeRecap([{ type: GradeType.KUIS, score: 90, weight: 0 }]);
    expect(result.overall.average).toBe(0);
  });

  it("item dengan weight Infinity di-skip", () => {
    const result = computeRecap([
      { type: GradeType.KUIS, score: 90, weight: Number.POSITIVE_INFINITY }
    ]);
    expect(result.overall.count).toBe(0);
  });

  it("skor negatif dihitung apa adanya (nilai korup tidak di-skip)", () => {
    const result = computeRecap([{ type: GradeType.TUGAS, score: -10, weight: 1 }]);
    expect(result.overall.average).toBe(-10);
  });

  it("pembulatan rata-rata ke integer terdekat", () => {
    const result = computeRecap([
      { type: GradeType.TUGAS, score: 81, weight: 2 },
      { type: GradeType.TUGAS, score: 82, weight: 2 }
    ]);
    // (81*2+82*2)/4 = 81.5 → 82
    expect(result.perType.TUGAS?.average).toBe(82);
  });
});

describe("schedule-validator edge", () => {
  const slot = (overrides: Record<string, unknown> = {}) => ({
    id: "e_1",
    dayOfWeek: 1,
    startPeriod: 1,
    endPeriod: 3,
    teacherId: "t_1",
    room: "R1",
    classId: "c_1",
    ...overrides
  });

  it("list kosong → tanpa bentrok", () => {
    expect(findConflicts([], slot())).toHaveLength(0);
  });

  it("dayOfWeek berbeda → tanpa bentrok", () => {
    expect(findConflicts([slot()], slot({ dayOfWeek: 2 }))).toHaveLength(0);
  });

  it("adjacent (end == start) → tidak bentrok", () => {
    expect(periodsOverlap({ start: 1, end: 3 }, { start: 3, end: 4 })).toBe(false);
    expect(findConflicts([slot()], slot({ startPeriod: 3, endPeriod: 4 }))).toHaveLength(0);
  });

  it("bentrok multi dimensi (guru+ruang sekaligus)", () => {
    const conflicts = findConflicts([slot()], slot({ id: "new" }));
    const types = conflicts.map((c) => c.type).sort();
    expect(types).toContain("TEACHER");
    expect(types).toContain("ROOM");
    expect(types).toContain("CLASS");
  });
});

describe("rollover.promotion edge", () => {
  const student = (overrides: Record<string, unknown> = {}) => ({
    studentId: "s1",
    sourceClassId: "c1",
    sourceClassName: "X IPA 1",
    gradeLevel: 10,
    currentStatus: "ACTIVE" as const,
    finalScores: { m: 80 },
    attendanceRate: 1,
    ...overrides
  });

  it("nextClassName: X → XI, XI → XII, dengan tanda (U) untuk ulang", () => {
    expect(nextClassName("X IPA 1", 11, false)).toBe("XI IPA 1");
    expect(nextClassName("XI IPS 2", 12, false)).toBe("XII IPS 2");
    expect(nextClassName("X IPA 1", 10, true)).toBe("X IPA 1 (U)");
  });

  it("nextClassName fallback angka untuk grade di luar 10-12", () => {
    expect(nextClassName("Kelas 7A", 8, false)).toBe("8 Kelas 7A");
  });

  it("tanpa nilai (finalScores kosong) → tidak lulus, REPEATED", () => {
    const decision = evaluateStudent(student({ finalScores: {} }));
    expect(decision.action).toBe("REPEATED");
    expect(decision.averageScore).toBeNull();
  });

  it("nilai < passingScore → REPEATED walau absensi sempurna", () => {
    const decision = evaluateStudent(
      student({ finalScores: { m: 50 }, attendanceRate: 1 }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(decision.action).toBe("REPEATED");
    expect(decision.targetClassKey).toContain(":1"); // repeated flag
  });

  it("nilai lolos tapi absensi < minAttendanceRate → REPEATED", () => {
    const decision = evaluateStudent(
      student({ finalScores: { m: 90 }, attendanceRate: 0.5 }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(decision.action).toBe("REPEATED");
  });

  it("nilai lolos + absensi cukup → PROMOTED ke kelas berikutnya", () => {
    const decision = evaluateStudent(
      student({ finalScores: { m: 85 }, attendanceRate: 0.9 }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(decision.action).toBe("PROMOTED");
    expect(decision.targetClassKey).toContain(":11:0");
  });

  it("kelas akhir (12) lulus → GRADUATED tanpa target class", () => {
    const decision = evaluateStudent(
      student({ gradeLevel: 12, finalScores: { m: 80 }, attendanceRate: 1 }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(decision.action).toBe("GRADUATED");
    expect(decision.targetClassKey).toBeNull();
  });

  it("kelas akhir (12) gagal → REPEATED", () => {
    const decision = evaluateStudent(
      student({ gradeLevel: 12, finalScores: { m: 40 }, attendanceRate: 1 }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(decision.action).toBe("REPEATED");
  });

  it("status TRANSFERRED/DROPPED dipertahankan", () => {
    expect(evaluateStudent(student({ currentStatus: "TRANSFERRED" })).action).toBe("TRANSFERRED");
    expect(evaluateStudent(student({ currentStatus: "DROPPED" })).action).toBe("DROPPED");
  });

  it("override menang atas aturan default", () => {
    const decision = evaluateStudent(
      student({ finalScores: { m: 30 } }),
      DEFAULT_PROMOTION_CONFIG,
      { s1: "GRADUATED" }
    );
    expect(decision.action).toBe("GRADUATED");
    expect(decision.reason).toContain("override");
  });

  it("gradeLevel <= 0 → REPEATED (data korup), tidak dipromosikan", () => {
    const decision = evaluateStudent(student({ gradeLevel: 0, finalScores: { m: 100 } }));
    expect(decision.action).toBe("REPEATED");
    expect(decision.reason).toContain("gradeLevel tidak valid");
  });

  it("buildPromotionPlan menghitung counts & membuat kelas baru unik", () => {
    const plan = buildPromotionPlan([
      student({ studentId: "s1", finalScores: { m: 85 }, attendanceRate: 0.9 }),
      student({ studentId: "s2", finalScores: { m: 40 }, attendanceRate: 0.9 }),
      student({ studentId: "s3", gradeLevel: 12, finalScores: { m: 90 }, attendanceRate: 0.9 })
    ]);
    expect(plan.counts.PROMOTED).toBe(1);
    expect(plan.counts.REPEATED).toBe(1);
    expect(plan.counts.GRADUATED).toBe(1);
    expect(plan.classes).toHaveLength(2); // satu kelas promosi + satu kelas ulang
  });

  it("buildPromotionPlan kosong → counts nol & tanpa kelas", () => {
    const plan = buildPromotionPlan([]);
    expect(plan.decisions).toEqual([]);
    expect(plan.classes).toEqual([]);
    expect(plan.counts.PROMOTED).toBe(0);
  });
});
