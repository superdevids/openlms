/**
 * Rollover promotion — edge cases fungsi murni (05 M-ROLLOVER-T5).
 * Melengkapi rollover.promotion.spec.ts: batas passingScore/absensi,
 * kelas akhir, status non-ACTIVE, nextClassName, dan konsistensi plan.
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

describe("evaluateStudent — batas (boundary) aturan default", () => {
  it("rata-rata PERSIS di passingScore (60) -> PROMOTED", () => {
    const d = evaluateStudent(
      student({ finalScores: { cs1: 60, cs2: 60 } }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(d.action).toBe("PROMOTED");
  });

  it("rata-rata 59.99 (di bawah passingScore) -> REPEATED", () => {
    const d = evaluateStudent(
      student({ finalScores: { cs1: 59.99, cs2: 60 } }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(d.action).toBe("REPEATED");
  });

  it("absensi PERSIS minAttendanceRate (0.75) -> lulus", () => {
    const d = evaluateStudent(student({ attendanceRate: 0.75 }));
    expect(d.action).toBe("PROMOTED");
  });

  it("absensi 0.749 -> REPEATED", () => {
    const d = evaluateStudent(student({ attendanceRate: 0.749 }));
    expect(d.action).toBe("REPEATED");
  });

  it("absensi > 1 diklamp ke 1 oleh buildPlan; langsung 0 dan 1 diuji di sini", () => {
    expect(evaluateStudent(student({ attendanceRate: 1 })).action).toBe("PROMOTED");
    expect(evaluateStudent(student({ attendanceRate: 0 })).action).toBe("REPEATED");
  });

  it("kelas akhir (gradeLevel 12) dengan nilai cukup tapi absensi kurang -> REPEATED", () => {
    const d = evaluateStudent(
      student({ gradeLevel: 12, attendanceRate: 0.5, finalScores: { cs1: 90 } }),
      DEFAULT_PROMOTION_CONFIG
    );
    expect(d.action).toBe("REPEATED");
    expect(d.targetClassKey).toBe("cls-10:12:1");
  });

  it("kelas akhir GRADUATED -> targetClassKey null & averageScore terisi", () => {
    const d = evaluateStudent(student({ gradeLevel: 12, finalScores: { cs1: 80, cs2: 100 } }));
    expect(d.action).toBe("GRADUATED");
    expect(d.targetClassKey).toBeNull();
    expect(d.averageScore).toBe(90);
  });

  it("gradeLevel melebihi maxGradeLevel (mis. 13) diperlakukan kelas akhir", () => {
    const d = evaluateStudent(student({ gradeLevel: 13 }));
    expect(d.action).toBe("GRADUATED");
  });

  it("gradeLevel 0/negatif (data rusak) -> REPEATED ke kelas yang sama", () => {
    const d = evaluateStudent(student({ gradeLevel: 0 }));
    expect(d.action).toBe("REPEATED");
    expect(d.targetClassKey).toBe("cls-10:0:1");
  });
});

describe("evaluateStudent — nilai & status", () => {
  it("tanpa nilai (finalScores {}) -> averageScore null + REPEATED", () => {
    const d = evaluateStudent(student({ finalScores: {} }));
    expect(d.averageScore).toBeNull();
    expect(d.action).toBe("REPEATED");
    expect(d.reason).toContain("tinggal kelas");
  });

  it("satu nilai 100 + absensi cukup -> rata-rata 100", () => {
    const d = evaluateStudent(student({ finalScores: { cs1: 100 } }));
    expect(d.averageScore).toBe(100);
    expect(d.action).toBe("PROMOTED");
  });

  it("nilai desimal dirata-rata persis (80.5)", () => {
    const d = evaluateStudent(student({ finalScores: { cs1: 80.5, cs2: 80.5 } }));
    expect(d.averageScore).toBe(80.5);
  });

  it("status GRADUATED (sudah lulus sebelumnya) diteruskan seperti TRANSFERRED?", () => {
    // Hanya TRANSFERRED/DROPPED yang diteruskan apa adanya; GRADUATED tetap dihitung.
    const d = evaluateStudent(student({ currentStatus: "GRADUATED" }));
    expect(d.action).toBe("PROMOTED");
  });

  it("override memakai action TRANSFERRED -> reason override, bukan status siswa", () => {
    const d = evaluateStudent(student({ currentStatus: "DROPPED" }), DEFAULT_PROMOTION_CONFIG, {
      "stu-1": "TRANSFERRED"
    });
    expect(d.action).toBe("TRANSFERRED");
    expect(d.reason).toContain("override");
  });

  it("override hanya berlaku per siswa (siswa lain tidak terpengaruh)", () => {
    const d = evaluateStudent(student({ studentId: "stu-2" }), DEFAULT_PROMOTION_CONFIG, {
      "stu-1": "DROPPED"
    });
    expect(d.action).toBe("PROMOTED");
  });
});

describe("nextClassName — nama kelas baru", () => {
  it("X IPA 1 -> XI IPA 1; XI IPA 1 -> XII IPA 1; XII tetap XII saat ulang", () => {
    expect(nextClassName("X IPA 1", 11, false)).toBe("XI IPA 1");
    expect(nextClassName("XI IPA 1", 12, false)).toBe("XII IPA 1");
    expect(nextClassName("XII IPA 1", 12, true)).toBe("XII IPA 1 (U)");
  });

  it("kelas tanpa prefix angka (nama bebas) -> hanya ditambah roman", () => {
    expect(nextClassName("IPA 1", 11, false)).toBe("XI IPA 1");
  });

  it("kelas tanpa nama (kosong) -> hanya roman", () => {
    expect(nextClassName("", 11, false)).toBe("XI");
  });

  it("kelas hanya 'X' -> XI", () => {
    expect(nextClassName("X", 11, false)).toBe("XI");
  });

  it("gradeLevel di luar 10-12 memakai angka biasa (mis. 13 -> '13')", () => {
    expect(nextClassName("X IPA 1", 13, false)).toBe("13 IPA 1");
  });

  it("XII yang sudah mengandung (U) tidak digandakan saat ulang", () => {
    expect(nextClassName("XII IPA 1 (U)", 12, true)).toBe("XII IPA 1 (U) (U)");
  });

  it("roman huruf kecil di prefix dinormalisasi", () => {
    expect(nextClassName("x ipa 1", 11, false)).toBe("XI ipa 1");
  });
});

describe("buildPromotionPlan — agregasi & dedupe", () => {
  it("dua siswa naik ke kelas sama -> satu kelas tujuan", () => {
    const plan = buildPromotionPlan([
      student({
        studentId: "s1",
        sourceClassId: "c10",
        sourceClassName: "X IPA 1",
        gradeLevel: 10
      }),
      student({ studentId: "s2", sourceClassId: "c10", sourceClassName: "X IPA 1", gradeLevel: 10 })
    ]);
    expect(plan.classes).toHaveLength(1);
    expect(plan.counts.PROMOTED).toBe(2);
  });

  it("siswa ulang + naik dari kelas sama -> dua kelas (ulang & naik)", () => {
    const plan = buildPromotionPlan([
      student({
        studentId: "s1",
        sourceClassId: "c10",
        sourceClassName: "X IPA 1",
        gradeLevel: 10,
        finalScores: { a: 90 }
      }),
      student({
        studentId: "s2",
        sourceClassId: "c10",
        sourceClassName: "X IPA 1",
        gradeLevel: 10,
        finalScores: { a: 40 }
      })
    ]);
    expect(plan.classes).toHaveLength(2);
    const names = plan.classes.map((c) => c.name);
    expect(names).toContain("XI IPA 1");
    expect(names).toContain("X IPA 1 (U)");
  });

  it("counts mencakup semua action (GRADUATED/TRANSFERRED/DROPPED/REPEATED/PROMOTED)", () => {
    const plan = buildPromotionPlan([
      student({ studentId: "s1", sourceClassId: "c10", gradeLevel: 10 }),
      student({ studentId: "s2", sourceClassId: "c10", gradeLevel: 10, finalScores: { a: 40 } }),
      student({ studentId: "s3", sourceClassId: "c12", gradeLevel: 12 }),
      student({ studentId: "s4", currentStatus: "TRANSFERRED" }),
      student({ studentId: "s5", currentStatus: "DROPPED" }),
      student({ studentId: "s6", gradeLevel: 12, finalScores: { a: 40 } })
    ]);
    expect(plan.counts).toEqual({
      PROMOTED: 1,
      REPEATED: 2,
      GRADUATED: 1,
      TRANSFERRED: 1,
      DROPPED: 1
    });
  });

  it("config passingScore tinggi -> semua REPEATED", () => {
    const plan = buildPromotionPlan(
      [student({ studentId: "s1", gradeLevel: 10, finalScores: { a: 70 } })],
      { passingScore: 90, minAttendanceRate: 0.75, maxGradeLevel: 12 }
    );
    expect(plan.counts.REPEATED).toBe(1);
    expect(plan.counts.PROMOTED).toBe(0);
  });

  it("overrides diterapkan konsisten di plan (bukan hanya per siswa)", () => {
    const plan = buildPromotionPlan(
      [student({ studentId: "s1", gradeLevel: 10 })],
      DEFAULT_PROMOTION_CONFIG,
      { s1: "DROPPED" }
    );
    expect(plan.counts.DROPPED).toBe(1);
    expect(plan.decisions[0]?.action).toBe("DROPPED");
  });

  it("plan kosong -> counts nol & tanpa kelas", () => {
    const plan = buildPromotionPlan([]);
    expect(plan.decisions).toEqual([]);
    expect(plan.classes).toEqual([]);
    expect(plan.counts.PROMOTED).toBe(0);
    expect(plan.counts.GRADUATED).toBe(0);
  });

  it("konsisten: evaluateStudent dan buildPromotionPlan memakai aturan sama", () => {
    const s = student({ studentId: "s1", gradeLevel: 10 });
    const direct = evaluateStudent(s);
    const viaPlan = buildPromotionPlan([s]);
    expect(viaPlan.decisions[0]).toEqual(direct);
  });
});
