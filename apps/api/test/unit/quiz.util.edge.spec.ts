/**
 * Unit test — quiz.util edge: normalizeTextAnswer unicode, parseJsonAnswer,
 * readAnswerMap/readJsonObject, gradeAnswer MENJODOHKAN malformed,
 * seededIndex, computeAutoScore kosong, parseCsv edge.
 */
import { QuestionType } from "@prisma/client";
import {
  computeAutoScore,
  computeSemesterLabel,
  createSeededRng,
  gradeAnswer,
  normalizeTextAnswer,
  parseCsv,
  parseJsonAnswer,
  readAnswerMap,
  readJsonObject,
  seededIndex,
  seededShuffle
} from "../../src/modules/quiz/quiz.util";

describe("quiz.util edge — normalizeTextAnswer", () => {
  it("meratakan spasi internal & lowercase, menghapus unicode whitespace", () => {
    expect(normalizeTextAnswer("  Jakarta\n\tBarat  ")).toBe("jakarta barat");
  });

  it("unicode huruf non-latin tetap dipertahankan (bukan di-strip)", () => {
    expect(normalizeTextAnswer("Sūrat Al-Fātiḥah")).toBe("sūrat al-fātiḥah");
  });

  it("null/undefined/kosong → ''", () => {
    expect(normalizeTextAnswer(null)).toBe("");
    expect(normalizeTextAnswer(undefined)).toBe("");
    expect(normalizeTextAnswer("")).toBe("");
  });
});

describe("quiz.util edge — parseJsonAnswer", () => {
  it("JSON valid → objek", () => {
    expect(parseJsonAnswer('{"A":"1"}')).toEqual({ A: "1" });
  });

  it("JSON invalid / kosong → null", () => {
    expect(parseJsonAnswer("{not-json")).toBeNull();
    expect(parseJsonAnswer("")).toBeNull();
    expect(parseJsonAnswer(null)).toBeNull();
    expect(parseJsonAnswer(undefined)).toBeNull();
  });

  it("JSON primitif (angka/string) → nilai itu sendiri", () => {
    expect(parseJsonAnswer("42")).toBe(42);
  });
});

describe("quiz.util edge — readAnswerMap / readJsonObject", () => {
  it("null/string/array → {} (bukan objek)", () => {
    expect(readAnswerMap(null)).toEqual({});
    expect(readAnswerMap("x")).toEqual({});
    expect(readAnswerMap([1, 2])).toEqual({});
    expect(readJsonObject(null)).toEqual({});
    expect(readJsonObject("x")).toEqual({});
    expect(readJsonObject([1])).toEqual({});
  });

  it("objek → diteruskan apa adanya", () => {
    expect(readAnswerMap({ q1: { answer: "B" } })).toEqual({ q1: { answer: "B" } });
    expect(readJsonObject({ a: 1 })).toEqual({ a: 1 });
  });
});

describe("quiz.util edge — gradeAnswer MENJODOHKAN", () => {
  it("JSON malformed di kedua sisi → tidak cocok", () => {
    expect(gradeAnswer(QuestionType.MENJODOHKAN, "{bad", "{bad}").correct).toBe(false);
  });

  it("jawaban kosong → graded=true, correct=false", () => {
    const r = gradeAnswer(QuestionType.MENJODOHKAN, '{"A":"1"}', "");
    expect(r.graded).toBe(true);
    expect(r.correct).toBe(false);
  });

  it("nilai dibandingkan sebagai string (String(v) coercion) → 1 dan '1' dianggap sama", () => {
    // pairMapsEqual membandingkan String(v) === String(v2) — numerik 1 vs "1" sama.
    const r = gradeAnswer(QuestionType.MENJODOHKAN, '{"A":1}', '{"A":"1"}');
    expect(r.correct).toBe(true);
  });

  it("nilai string berbeda → tidak cocok", () => {
    const r = gradeAnswer(QuestionType.MENJODOHKAN, '{"A":"1"}', '{"A":"2"}');
    expect(r.correct).toBe(false);
  });

  it("kunci jumlah berbeda → tidak cocok", () => {
    const r = gradeAnswer(QuestionType.MENJODOHKAN, '{"A":"1","B":"2"}', '{"A":"1"}');
    expect(r.correct).toBe(false);
  });
});

describe("quiz.util edge — gradeAnswer PG/isian", () => {
  it("answer null/undefined → graded true, correct false", () => {
    const a = gradeAnswer(QuestionType.PILIHAN_GANDA, "B", null);
    expect(a).toEqual({ graded: true, correct: false });
    const b = gradeAnswer(QuestionType.PILIHAN_GANDA, "B", undefined);
    expect(b).toEqual({ graded: true, correct: false });
  });

  it("correct_answer null → jawaban apa pun salah", () => {
    expect(gradeAnswer(QuestionType.ISIAN_SINGKAT, null, "x").correct).toBe(false);
  });

  it("type tidak dikenal → tidak dinilai otomatis", () => {
    const r = gradeAnswer("UNKNOWN" as QuestionType, "x", "y");
    expect(r.graded).toBe(false);
    expect(r.correct).toBe(false);
  });
});

describe("quiz.util edge — computeAutoScore & seeded", () => {
  it("tanpa jawaban → skor 0 (bukan null) bila ada soal auto", () => {
    const result = computeAutoScore(
      [{ id: "a", type: QuestionType.PILIHAN_GANDA, correct_answer: "B" }],
      new Map()
    );
    expect(result.score).toBe(0);
    expect(result.totalCount).toBe(1);
  });

  it("seededIndex dalam rentang & deterministik", () => {
    expect(seededIndex("s1", 10)).toBe(seededIndex("s1", 10));
    const idx = seededIndex("s1", 10);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(10);
    expect(seededIndex("s", 0)).toBe(0);
  });

  it("createSeededRng menghasilkan 0..1 dan deterministik", () => {
    const rng = createSeededRng("seed");
    const first = rng();
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
    expect(createSeededRng("seed")()).toBe(first);
  });

  it("seededShuffle tidak memutasi input", () => {
    const items = [1, 2, 3, 4, 5];
    const copy = [...items];
    seededShuffle("s", items);
    expect(items).toEqual(copy);
  });

  it("seededShuffle array kosong / satu elemen", () => {
    expect(seededShuffle("s", [])).toEqual([]);
    expect(seededShuffle("s", [1])).toEqual([1]);
  });
});

describe("quiz.util edge — computeSemesterLabel", () => {
  it("bulan 7 → GANJIL tahun berikutnya", () => {
    const label = computeSemesterLabel(new Date("2026-07-01T00:00:00Z"));
    expect(label).toEqual({ semester: "GANJIL", academicYear: "2026/2027" });
  });

  it("bulan 6 → GENAP tahun berjalan-1", () => {
    const label = computeSemesterLabel(new Date("2026-06-30T00:00:00Z"));
    expect(label).toEqual({ semester: "GENAP", academicYear: "2025/2026" });
  });
});

describe("quiz.util edge — parseCsv", () => {
  it("baris trailing tidak menambah baris kosong (input tanpa newline di akhir)", () => {
    const rows = parseCsv("a,b\n");
    expect(rows).toHaveLength(1);
  });

  it("delimiter kustom (tab)", () => {
    const rows = parseCsv("a\tb\n1\t2", "\t");
    expect(rows[1]).toEqual(["1", "2"]);
  });

  it("baris kosong (tapi field kosong) tetap diparsing", () => {
    const rows = parseCsv(",");
    expect(rows[0]).toEqual(["", ""]);
  });
});
