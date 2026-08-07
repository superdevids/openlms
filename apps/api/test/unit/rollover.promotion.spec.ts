/**
 * Unit test — logika promosi rollover (fungsi MURNI).
 * Fokus: aturan default naik kelas / tinggal kelas / lulus (05 M-ROLLOVER-T5).
 */
import {
  buildPromotionPlan,
  DEFAULT_PROMOTION_CONFIG,
  evaluateStudent,
  nextClassName,
  StudentEvaluation
} from "../../src/modules/rollover/rollover.promotion";

function student(overrides: Partial<StudentEvaluation>): StudentEvaluation {
  return {
    studentId: "stu-1",
    sourceClassId: "cls-10",
    sourceClassName: "X IPA 1",
    gradeLevel: 10,
    currentStatus: "ACTIVE",
    finalScores: { cs1: 80, cs2: 70 },
    attendanceRate: 0.9,
    ...overrides
  };
}

describe("evaluateStudent — promosi default", () => {
  it("naik kelas bila rata-rata >= passingScore dan absensi cukup (kelas 10)", () => {
    const d = evaluateStudent(student({ gradeLevel: 10 }), DEFAULT_PROMOTION_CONFIG);
    expect(d.action).toBe("PROMOTED");
    expect(d.targetClassKey).toBe("cls-10:11:0");
  });

  it("LULUS (GRADUATED) bila kelas akhir tuntas", () => {
    const d = evaluateStudent(
      student({ gradeLevel: 12, finalScores: { cs1: 85, cs2: 90 } }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(d.action).toBe("GRADUATED");
    expect(d.targetClassKey).toBeNull();
  });

  it("tinggal kelas (REPEATED) bila nilai di bawah passingScore", () => {
    const d = evaluateStudent(
      student({ gradeLevel: 10, finalScores: { cs1: 40, cs2: 50 } }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(d.action).toBe("REPEATED");
    expect(d.targetClassKey).toBe("cls-10:10:1");
  });

  it("tinggal kelas di kelas akhir bila tidak tuntas", () => {
    const d = evaluateStudent(
      student({ gradeLevel: 12, finalScores: { cs1: 55, cs2: 50 } }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(d.action).toBe("REPEATED");
  });

  it("gagal bila absensi di bawah minAttendanceRate", () => {
    const d = evaluateStudent(
      student({ gradeLevel: 11, attendanceRate: 0.5, finalScores: { cs1: 80 } }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(d.action).toBe("REPEATED");
  });

  it("tidak ada nilai -> tidak lulus (REPEATED)", () => {
    const d = evaluateStudent(student({ finalScores: {} }));
    expect(d.action).toBe("REPEATED");
  });

  it("override promosi menang atas aturan default", () => {
    const d = evaluateStudent(
      student({ gradeLevel: 11, finalScores: { cs1: 90 } }),
      DEFAULT_PROMOTION_CONFIG,
      { "stu-1": "DROPPED" }
    );
    expect(d.action).toBe("DROPPED");
  });

  it("TRANSFERRED diteruskan apa adanya", () => {
    const d = evaluateStudent(student({ currentStatus: "TRANSFERRED" }));
    expect(d.action).toBe("TRANSFERRED");
    expect(d.targetClassKey).toBeNull();
  });
});

describe("nextClassName — nama kelas baru", () => {
  it("X IPA 1 -> XI IPA 1 saat naik", () => {
    expect(nextClassName("X IPA 1", 11, false)).toBe("XI IPA 1");
  });

  it("XII IPA 1 (U) saat tinggal kelas di kelas 12", () => {
    expect(nextClassName("XII IPA 1", 12, true)).toBe("XII IPA 1 (U)");
  });
});

describe("buildPromotionPlan — konsistensi agregat", () => {
  it("menghitung counts dan kelas tujuan tanpa duplikat", () => {
    const plan = buildPromotionPlan(
      [
        student({
          studentId: "s1",
          sourceClassId: "c10",
          sourceClassName: "X IPA 1",
          gradeLevel: 10
        }),
        student({
          studentId: "s2",
          sourceClassId: "c10",
          sourceClassName: "X IPA 1",
          gradeLevel: 10
        }),
        student({
          studentId: "s3",
          sourceClassId: "c12",
          sourceClassName: "XII IPA 1",
          gradeLevel: 12
        })
      ],
      DEFAULT_PROMOTION_CONFIG
    );
    expect(plan.counts.PROMOTED).toBe(2);
    expect(plan.counts.GRADUATED).toBe(1);
    expect(plan.classes).toHaveLength(1); // dua siswa naik ke kelas tujuan yang sama
    expect(plan.classes[0]?.name).toBe("XI IPA 1");
  });
});
