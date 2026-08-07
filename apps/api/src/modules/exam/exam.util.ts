/**
 * Util murni modul Ujian Online (prd04 §5.A.6, docs/05 M-EXAM-T2/T4/T7).
 * Token sesi: 6 karakter TANPA 0/O/1/I (plus l/o ambigu), disimpan hash SHA-256.
 * Randomisasi soal & opsi deterministik per attempt (seed = attempt.id).
 */
import { createHash, randomBytes } from "crypto";
import { QuestionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { seededShuffle } from "../quiz/quiz.util";

export const TOKEN_LENGTH = 6;
/** Alfabet token: digit 2-9, huruf besar/kecil minus karakter ambigu 0/O/1/I/l/o. */
export const TOKEN_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
export const DEFAULT_TOKEN_TTL_MINUTES = 30;

/** Generate token sesi 6 karakter dari alfabet aman (cryptographic RNG). */
export function generateAccessToken(length: number = TOKEN_LENGTH): string {
  const bytes = randomBytes(length);
  let token = "";
  for (let i = 0; i < length; i += 1) {
    const idx = (bytes[i] as number) % TOKEN_ALPHABET.length;
    token += TOKEN_ALPHABET[idx] as string;
  }
  return token;
}

/** Hash SHA-256 token sesi (yang disimpan di ExamSession.access_token). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Validasi format token: panjang 6 dan semua karakter dari alfabet aman. */
export function validateTokenFormat(token: string): boolean {
  if (typeof token !== "string" || token.length !== TOKEN_LENGTH) return false;
  for (const ch of token) {
    if (!TOKEN_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * Tampilan soal untuk siswa: tanpa correct_answer dan opsi diacak deterministik
 * bila paket mengaktifkan shuffle_options.
 */
export function studentQuestionView(
  question: {
    id: string;
    type: QuestionType;
    text: string;
    options: Prisma.JsonValue;
    explanation: string | null;
    difficulty: string;
    tags: string[];
  },
  seed: string,
  shuffleOptions: boolean
): {
  id: string;
  type: QuestionType;
  text: string;
  options: Prisma.JsonValue;
  explanation: string | null;
  difficulty: string;
  tags: string[];
} {
  const rawOptions = Array.isArray(question.options) ? (question.options as unknown[]) : null;
  const shuffledOptions =
    rawOptions && shuffleOptions
      ? (seededShuffle(seed, rawOptions) as unknown as Prisma.JsonValue)
      : question.options;
  return {
    id: question.id,
    type: question.type,
    text: question.text,
    options: shuffledOptions,
    explanation: question.explanation,
    difficulty: question.difficulty,
    tags: question.tags
  };
}

export { seededShuffle };
