import { QuestionType } from "@prisma/client";
import {
  generateAccessToken,
  hashToken,
  TOKEN_ALPHABET,
  TOKEN_LENGTH,
  validateTokenFormat
} from "../exam.util";
import { computeAutoScore, latestAnswersByQuestion } from "../../quiz/quiz.util";

describe("exam.util", () => {
  describe("generateAccessToken (token sesi 6 karakter)", () => {
    it("panjang 6 dan hanya karakter dari alfabet aman", () => {
      const token = generateAccessToken();
      expect(token).toHaveLength(TOKEN_LENGTH);
      expect(validateTokenFormat(token)).toBe(true);
      for (const ch of token) {
        expect(TOKEN_ALPHABET).toContain(ch);
      }
    });

    it("tidak pernah mengandung karakter ambigu 0/O/1/I/l/o", () => {
      for (let i = 0; i < 500; i += 1) {
        const token = generateAccessToken();
        expect(token).not.toMatch(/[0O1Ilo]/);
        expect(token.length).toBe(6);
      }
    });
  });

  describe("hashToken (SHA-256)", () => {
    it("hex 64 karakter dan deterministik", () => {
      const hash = hashToken("ABC234");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hashToken("ABC234")).toBe(hash);
    });

    it("token berbeda menghasilkan hash berbeda", () => {
      expect(hashToken("ABC234")).not.toBe(hashToken("ABC235"));
    });
  });

  describe("validateTokenFormat", () => {
    it("menolak token berkarakter ambigu 0/O/1/I/l/o", () => {
      expect(validateTokenFormat("AB0DEF")).toBe(false); // 0
      expect(validateTokenFormat("ABODEF")).toBe(false); // O
      expect(validateTokenFormat("AB1DEF")).toBe(false); // 1
      expect(validateTokenFormat("ABIDEF")).toBe(false); // I
      expect(validateTokenFormat("ABlDEF")).toBe(false); // l
      expect(validateTokenFormat("ABoDEF")).toBe(false); // o
    });

    it("menerima token valid dan menolak panjang salah", () => {
      expect(validateTokenFormat("ABC234")).toBe(true);
      expect(validateTokenFormat("AB2")).toBe(false); // panjang < 6
      expect(validateTokenFormat("ABC2345")).toBe(false); // panjang > 6
      expect(validateTokenFormat("ABC23_")).toBe(false); // karakter aneh
    });
  });

  describe("computeAutoScore (auto-grade)", () => {
    it("menghitung persentase PG/isian; esai tidak ikut serta", () => {
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

    it("jawaban salah mengurangi skor", () => {
      const questions = [
        { id: "a", type: QuestionType.PILIHAN_GANDA, correct_answer: "B" },
        { id: "b", type: QuestionType.PILIHAN_GANDA, correct_answer: "C" }
      ];
      const answers = new Map([
        ["a", "B"],
        ["b", "A"]
      ]);
      const result = computeAutoScore(questions, answers);
      expect(result.correctCount).toBe(1);
      expect(result.score).toBe(50);
    });
  });

  describe("latestAnswersByQuestion (log append-only)", () => {
    it("mengambil jawaban terbaru per soal berdasarkan saved_at", () => {
      const logs = [
        { question_id: "a", answer: "B", saved_at: new Date(1000) },
        { question_id: "a", answer: "C", saved_at: new Date(2000) }
      ];
      const latest = latestAnswersByQuestion(logs);
      expect(latest.get("a")).toBe("C");
    });
  });
});
