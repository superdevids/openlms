import { AttemptStatus, QuestionType } from "@prisma/client";
import {
  assertAttemptTransition,
  computeAutoScore,
  computeSemesterLabel,
  gradeAnswer,
  latestAnswersByQuestion,
  normalizeTextAnswer,
  parseCsv,
  seededShuffle,
  validateQuestionPayload
} from "../quiz.util";

describe("quiz.util", () => {
  describe("normalizeTextAnswer", () => {
    it("trim, lowercase, ratakan spasi", () => {
      expect(normalizeTextAnswer("  Jakarta  Barat ")).toBe("jakarta barat");
      expect(normalizeTextAnswer(null)).toBe("");
      expect(normalizeTextAnswer(undefined)).toBe("");
    });
  });

  describe("gradeAnswer (auto-grade PG/isian/esai/menjodohkan)", () => {
    it("PILIHAN_GANDA: cocok persis", () => {
      expect(gradeAnswer(QuestionType.PILIHAN_GANDA, "B", "B").correct).toBe(true);
      expect(gradeAnswer(QuestionType.PILIHAN_GANDA, "B", "C").correct).toBe(false);
    });

    it("ISIAN_SINGKAT: case-insensitive + trim", () => {
      expect(gradeAnswer(QuestionType.ISIAN_SINGKAT, "Jakarta", " jakarta ").correct).toBe(true);
      expect(gradeAnswer(QuestionType.ISIAN_SINGKAT, "Jakarta", "Bandung").correct).toBe(false);
    });

    it("jawaban kosong dinilai salah (tetap graded)", () => {
      const result = gradeAnswer(QuestionType.PILIHAN_GANDA, "B", "");
      expect(result.graded).toBe(true);
      expect(result.correct).toBe(false);
    });

    it("MENJODOHKAN: mapping pasangan dibandingkan tanpa urutan", () => {
      const correct = JSON.stringify({ A: "1", B: "2" });
      expect(
        gradeAnswer(QuestionType.MENJODOHKAN, correct, JSON.stringify({ B: "2", A: "1" })).correct
      ).toBe(true);
      expect(
        gradeAnswer(QuestionType.MENJODOHKAN, correct, JSON.stringify({ A: "2", B: "1" })).correct
      ).toBe(false);
    });

    it("ESAI: tidak dinilai otomatis", () => {
      const result = gradeAnswer(QuestionType.ESAI, "rubrik", "jawaban esai panjang");
      expect(result.graded).toBe(false);
      expect(result.correct).toBe(false);
    });
  });

  describe("computeAutoScore", () => {
    it("persentase benar dari soal auto-gradeable; esai dikecualikan", () => {
      const questions = [
        { id: "a", type: QuestionType.PILIHAN_GANDA, correct_answer: "B" },
        { id: "b", type: QuestionType.ISIAN_SINGKAT, correct_answer: "Jakarta" },
        { id: "c", type: QuestionType.ESAI, correct_answer: null }
      ];
      const answers = new Map([
        ["a", "B"],
        ["b", " jakarta "],
        ["c", "esai panjang"]
      ]);
      const result = computeAutoScore(questions, answers);
      expect(result.correctCount).toBe(2);
      expect(result.totalCount).toBe(2);
      expect(result.score).toBe(100);
    });

    it("tanpa soal auto-gradeable => score null", () => {
      const result = computeAutoScore(
        [{ id: "c", type: QuestionType.ESAI, correct_answer: null }],
        new Map([["c", "esai"]])
      );
      expect(result.score).toBeNull();
    });
  });

  describe("validateQuestionPayload", () => {
    it("PILIHAN_GANDA butuh options >= 2 dan correct_answer", () => {
      const errors = validateQuestionPayload(QuestionType.PILIHAN_GANDA, {
        text: "Soal?",
        options: [],
        correct_answer: null
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it("ESAI tanpa correct_answer diterima", () => {
      expect(
        validateQuestionPayload(QuestionType.ESAI, {
          text: "Soal esai",
          options: null,
          correct_answer: null
        })
      ).toHaveLength(0);
    });
  });

  describe("assertAttemptTransition (state machine attempt)", () => {
    it("IN_PROGRESS -> SUBMITTED / AUTO_SUBMITTED / EXPIRED valid", () => {
      expect(() =>
        assertAttemptTransition(AttemptStatus.IN_PROGRESS, AttemptStatus.SUBMITTED)
      ).not.toThrow();
      expect(() =>
        assertAttemptTransition(AttemptStatus.IN_PROGRESS, AttemptStatus.AUTO_SUBMITTED)
      ).not.toThrow();
      expect(() =>
        assertAttemptTransition(AttemptStatus.IN_PROGRESS, AttemptStatus.EXPIRED)
      ).not.toThrow();
    });

    it("status terminal tidak bisa berpindah", () => {
      expect(() =>
        assertAttemptTransition(AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED)
      ).toThrow();
    });
  });

  describe("parseCsv (import massal)", () => {
    it("parse baris + quoted field + escaped quote + CRLF", () => {
      const csv =
        'type,text,options\r\nPILIHAN_GANDA,"hello, world","[""A"",""B""]"\r\nESAI,"x ""y"" z",\r\n';
      const rows = parseCsv(csv);
      expect(rows).toHaveLength(3);
      expect(rows[1]).toEqual(["PILIHAN_GANDA", "hello, world", '["A","B"]']);
      expect(rows[2]?.[1]).toBe('x "y" z');
    });
  });

  describe("seededShuffle (randomisasi deterministik per attempt)", () => {
    it("seed sama = urutan sama; seed beda = urutan beda; elemen tetap sama", () => {
      const items = [1, 2, 3, 4, 5];
      const a = seededShuffle("attempt-1", items);
      const b = seededShuffle("attempt-1", items);
      const c = seededShuffle("attempt-2", items);
      expect(a).toEqual(b);
      expect(a).not.toEqual(c);
      expect([...a].sort()).toEqual([...items].sort());
    });
  });

  describe("computeSemesterLabel", () => {
    it("bulan >= 7 => GANJIL", () => {
      const label = computeSemesterLabel(new Date("2026-08-01T00:00:00Z"));
      expect(label.semester).toBe("GANJIL");
      expect(label.academicYear).toBe("2026/2027");
    });

    it("bulan < 7 => GENAP", () => {
      const label = computeSemesterLabel(new Date("2026-02-01T00:00:00Z"));
      expect(label.semester).toBe("GENAP");
      expect(label.academicYear).toBe("2025/2026");
    });
  });

  describe("latestAnswersByQuestion", () => {
    it("ambil jawaban terbaru per soal (log append-only)", () => {
      const logs = [
        { question_id: "a", answer: "B", saved_at: new Date(1000) },
        { question_id: "a", answer: "C", saved_at: new Date(2000) },
        { question_id: "b", answer: "X", saved_at: new Date(1500) }
      ];
      const latest = latestAnswersByQuestion(logs);
      expect(latest.get("a")).toBe("C");
      expect(latest.get("b")).toBe("X");
    });
  });
});
