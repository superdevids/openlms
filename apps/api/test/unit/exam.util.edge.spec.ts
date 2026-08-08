/**
 * Unit test — exam.util edge: token charset/expiry, studentQuestionView
 * (shuffle options deterministik, tanpa correct_answer), remainingSeconds.
 */
import { QuestionType } from "@prisma/client";
import {
  DEFAULT_TOKEN_TTL_MINUTES,
  generateAccessToken,
  studentQuestionView,
  TOKEN_ALPHABET,
  validateTokenFormat
} from "../../src/modules/exam/exam.util";
import { remainingSeconds } from "../../src/modules/quiz/quiz.util";

describe("exam.util edge — token charset", () => {
  it("generateAccessToken dengan panjang kustom", () => {
    const token = generateAccessToken(8);
    expect(token).toHaveLength(8);
    expect(validateTokenFormat(token)).toBe(false); // default TOKEN_LENGTH = 6
    for (const ch of token) {
      expect(TOKEN_ALPHABET).toContain(ch);
    }
  });

  it("DEFAULT_TOKEN_TTL_MINUTES = 30 (kontrak)", () => {
    expect(DEFAULT_TOKEN_TTL_MINUTES).toBe(30);
  });

  it("TOKEN_ALPHABET tidak memuat 0/O/1/I/l/o", () => {
    for (const ch of "0O1Ilo") {
      expect(TOKEN_ALPHABET).not.toContain(ch);
    }
  });
});

describe("exam.util edge — studentQuestionView", () => {
  const question = {
    id: "q1",
    type: QuestionType.PILIHAN_GANDA,
    text: "Soal?",
    options: ["A", "B", "C", "D"],
    explanation: "Penjelasan",
    difficulty: "MUDAH",
    tags: ["x"]
  };

  it("tanpa shuffleOptions → options tetap urutan asli", () => {
    const view = studentQuestionView(question, "seed", false);
    expect(view.options).toEqual(["A", "B", "C", "D"]);
  });

  it("dengan shuffleOptions → deterministik per seed, options tetap lengkap", () => {
    const a = studentQuestionView(question, "attempt-1", true);
    const b = studentQuestionView(question, "attempt-1", true);
    const c = studentQuestionView(question, "attempt-2", true);
    expect(a.options).toEqual(b.options);
    expect([...(a.options as unknown[])].sort()).toEqual(["A", "B", "C", "D"]);
    expect(c.options).not.toEqual(a.options); // seed beda hampir pasti beda
  });

  it("options bukan array → tetap diteruskan apa adanya", () => {
    const q = { ...question, options: null };
    const view = studentQuestionView(q, "seed", true);
    expect(view.options).toBeNull();
  });

  it("view tidak membocorkan correct_answer (tidak ada field itu di type)", () => {
    const view = studentQuestionView({ ...question, correct_answer: "A" } as never, "seed", false);
    expect(view).not.toHaveProperty("correct_answer");
    expect(view.id).toBe("q1");
    expect(view.explanation).toBe("Penjelasan");
  });
});

describe("quiz.util — remainingSeconds", () => {
  it("sisa waktu = durasi - elapsed", () => {
    const started = new Date("2026-08-07T10:00:00.000Z");
    const now = new Date("2026-08-07T10:05:30.000Z");
    expect(remainingSeconds(started, 60, now)).toBe(3270);
  });

  it("0 bila waktu habis", () => {
    const started = new Date("2026-08-07T10:00:00.000Z");
    const now = new Date("2026-08-07T11:00:00.000Z");
    expect(remainingSeconds(started, 30, now)).toBe(0);
  });

  it("durasi 0 → 0", () => {
    const started = new Date("2026-08-07T10:00:00.000Z");
    expect(remainingSeconds(started, 0, started)).toBe(0);
  });
});
