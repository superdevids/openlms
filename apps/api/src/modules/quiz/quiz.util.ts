/**
 * Util murni modul Quiz — dipakai QuizService/QuizAttemptService dan ExamModule
 * (exam.util mengimpor grading & seeded shuffle dari sini agar satu sumber kebenaran).
 * prd04 §5.A.5–5.A.6, docs/05 M-EXAM-T1..T12.
 */
import { AttemptStatus, QuestionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/** Bentuk jawaban yang disimpan di QuizAttempt.answers / ExamAnswerLog.answer. */
export interface AnswerEntry {
  answer?: string;
  savedAt?: string;
}

export interface GradingResult {
  /** true bila bisa dinilai otomatis (PG/isian/menjodohkan); false = esai (manual). */
  graded: boolean;
  correct: boolean;
}

export interface AutoScoreResult {
  score: number | null;
  correctCount: number;
  totalCount: number;
}

/** Normalisasi teks jawaban: trim, ratakan spasi, lowercase. */
export function normalizeTextAnswer(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Parse JSON jawaban (MENJODOHKAN) dengan aman; null bila gagal. */
export function parseJsonAnswer(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

/** Membaca peta jawaban dari kolom Json (QuizAttempt.answers / ExamAttempt.device_info). */
export function readAnswerMap(
  value: Prisma.JsonValue | null | undefined
): Record<string, AnswerEntry> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, AnswerEntry>;
}

/** Membaca object Json generik (device_info, log). */
export function readJsonObject(
  value: Prisma.JsonValue | null | undefined
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/**
 * Auto-grade:
 * - PILIHAN_GANDA / ISIAN_SINGKAT: bandingkan jawaban ternormalisasi dengan correct_answer.
 * - MENJODOHKAN: jawaban = JSON mapping kiri→kanan; benar bila semua pasangan sama.
 * - ESAI: tidak dinilai otomatis (graded=false) → manual-grade.
 */
export function gradeAnswer(
  type: QuestionType,
  correctAnswer: string | null | undefined,
  answer: string | null | undefined
): GradingResult {
  if (answer == null || answer.trim() === "") return { graded: true, correct: false };
  switch (type) {
    case QuestionType.PILIHAN_GANDA:
    case QuestionType.ISIAN_SINGKAT:
      return {
        graded: true,
        correct: normalizeTextAnswer(answer) === normalizeTextAnswer(correctAnswer)
      };
    case QuestionType.MENJODOHKAN: {
      const submitted = parseJsonAnswer(answer);
      const expected = parseJsonAnswer(correctAnswer);
      return { graded: true, correct: pairMapsEqual(submitted, expected) };
    }
    case QuestionType.ESAI:
      return { graded: false, correct: false };
    default:
      return { graded: false, correct: false };
  }
}

function pairMapsEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
  const aEntries = Object.entries(a).sort(([x], [y]) => x.localeCompare(y));
  const bEntries = Object.entries(b).sort(([x], [y]) => x.localeCompare(y));
  if (aEntries.length !== bEntries.length) return false;
  return aEntries.every(([k, v], i) => {
    const [k2, v2] = bEntries[i] as [string, unknown];
    return k === k2 && String(v) === String(v2);
  });
}

/** Validasi payload soal per tipe; mengembalikan daftar pesan error (kosong = valid). */
export function validateQuestionPayload(
  type: QuestionType,
  payload: { text?: string; options?: unknown; correct_answer?: string | null }
): string[] {
  const errors: string[] = [];
  if (!payload.text || payload.text.trim() === "") errors.push("text wajib diisi");
  switch (type) {
    case QuestionType.PILIHAN_GANDA:
      if (!Array.isArray(payload.options) || payload.options.length < 2) {
        errors.push("PILIHAN_GANDA membutuhkan options minimal 2");
      }
      if (!payload.correct_answer || payload.correct_answer.trim() === "") {
        errors.push("PILIHAN_GANDA membutuhkan correct_answer");
      }
      break;
    case QuestionType.ISIAN_SINGKAT:
      if (!payload.correct_answer || payload.correct_answer.trim() === "") {
        errors.push("ISIAN_SINGKAT membutuhkan correct_answer");
      }
      break;
    case QuestionType.MENJODOHKAN:
      if (!Array.isArray(payload.options) || payload.options.length < 2) {
        errors.push("MENJODOHKAN membutuhkan options pasangan minimal 2");
      }
      if (!payload.correct_answer || payload.correct_answer.trim() === "") {
        errors.push("MENJODOHKAN membutuhkan correct_answer (JSON mapping kiri→kanan)");
      }
      break;
    case QuestionType.ESAI:
      break;
    default:
      errors.push(`type soal tidak dikenal: ${String(type)}`);
  }
  return errors;
}

/** State machine attempt (docs/03 §3.4): hanya IN_PROGRESS yang boleh pindah status. */
export function assertAttemptTransition(from: AttemptStatus, to: AttemptStatus): void {
  const allowed: AttemptStatus[] = [
    AttemptStatus.SUBMITTED,
    AttemptStatus.AUTO_SUBMITTED,
    AttemptStatus.EXPIRED
  ];
  if (from !== AttemptStatus.IN_PROGRESS || !allowed.includes(to)) {
    throw new Error(`Transisi status attempt tidak valid: ${from} -> ${to}`);
  }
}

/** Hitung skor 0–100 dari soal yang bisa dinilai otomatis; esai tidak dihitung. */
export function computeAutoScore(
  questions: { id: string; type: QuestionType; correct_answer: string | null }[],
  answers: Map<string, string>
): AutoScoreResult {
  const gradeable = questions.filter((q) => q.type !== QuestionType.ESAI);
  if (gradeable.length === 0) return { score: null, correctCount: 0, totalCount: 0 };
  let correct = 0;
  for (const q of gradeable) {
    const answer = answers.get(q.id) ?? "";
    const result = gradeAnswer(q.type, q.correct_answer, answer);
    if (result.graded && result.correct) correct += 1;
  }
  return {
    score: Math.round((correct / gradeable.length) * 100),
    correctCount: correct,
    totalCount: gradeable.length
  };
}

/** Ambil jawaban terbaru per soal dari log append-only (ExamAnswerLog). */
export function latestAnswersByQuestion(
  logs: { question_id: string; answer: string | null; saved_at: Date }[]
): Map<string, string> {
  const map = new Map<string, string>();
  const latestTime = new Map<string, number>();
  for (const log of logs) {
    const t = log.saved_at.getTime();
    const prev = latestTime.get(log.question_id) ?? -1;
    if (t >= prev) {
      latestTime.set(log.question_id, t);
      map.set(log.question_id, log.answer ?? "");
    }
  }
  return map;
}

/** Label semester Indonesia dari tanggal (ganjil ≈ Jul–Des, genap ≈ Jan–Jun). */
export function computeSemesterLabel(date: Date): { semester: string; academicYear: string } {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 7) return { semester: "GANJIL", academicYear: `${year}/${year + 1}` };
  return { semester: "GENAP", academicYear: `${year - 1}/${year}` };
}

/** Sisa waktu attempt dalam detik (0 bila habis). */
export function remainingSeconds(
  startedAt: Date,
  durationMin: number,
  now: Date = new Date()
): number {
  const totalMs = durationMin * 60 * 1000;
  const elapsed = now.getTime() - startedAt.getTime();
  return Math.max(0, Math.floor((totalMs - elapsed) / 1000));
}

// ---------------------------------------------------------------------------
// PRNG seeded deterministik — randomisasi soal & opsi per attempt (M-EXAM-T2).
// Deterministik: seed = attempt.id sehingga urutan stabil untuk attempt yang sama.
// ---------------------------------------------------------------------------

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ (seed.charCodeAt(i) as number), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generator angka acak deterministik dari seed string. */
export function createSeededRng(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}

/** Fisher–Yates shuffle deterministik dari seed string (tidak memutasi input). */
export function seededShuffle<T>(seed: string, items: T[]): T[] {
  const rng = createSeededRng(seed);
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

/** Indeks deterministik 0..length-1 dari seed (mis. pemilihan paket per siswa). */
export function seededIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  return Math.floor(createSeededRng(seed)() * length) % length;
}

/**
 * Parser CSV sederhana RFC-4180 (tanpa vendor) untuk import soal (M-EXAM-T1).
 * Mendukung quoted field, escaped double-quote, CRLF/LF.
 */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
