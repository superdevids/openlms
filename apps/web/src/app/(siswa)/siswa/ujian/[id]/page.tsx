"use client";

import { useRef, useState, type FormEvent, type JSX } from "react";

import { useParams, useRouter } from "next/navigation";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  toast
} from "@opensis/ui";

import { formatDateTime } from "@/lib/format";

import { DEMO_EXAMS } from "@/lib/demo";
import { cn } from "@opensis/ui";
import { STORAGE_KEYS, safeSet } from "@/lib/storage";

/** Draft attempt di sessionStorage (R-23) — dibaca ulang di halaman kerjakan utk resume.
 *  HANYA attemptId (bukan token) yang disimpan — token sesi hanya di memori (R-48). */
export interface ExamAttemptDraft {
  examId: string;
  attemptId: string;
  remainingSeconds: number;
}

interface ExamDetail {
  id: string;
  title: string;
  subject: string;
  className: string;
  startsAt: string;
  endsAt: string;
  sessions?: Array<{ id: string; name: string; startsAt: string; endsAt: string }>;
}

interface ApiExamSession {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  target_class?: { name: string } | null;
}

interface ApiExamDetail {
  id: string;
  title: string;
  created_at: string;
  subject?: { name: string } | null;
  sessions?: ApiExamSession[];
}

const ALLOWED_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I

function mapExamDetail(raw: ApiExamDetail): ExamDetail {
  const s0 = raw.sessions?.[0];
  return {
    id: raw.id,
    title: raw.title,
    subject: raw.subject?.name ?? "",
    className: s0?.target_class?.name ?? "",
    startsAt: s0?.starts_at ?? raw.created_at ?? "",
    endsAt: s0?.ends_at ?? "",
    sessions: (raw.sessions ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      startsAt: s.starts_at,
      endsAt: s.ends_at
    }))
  };
}

export default function SiswaUjianTokenPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params.id ?? "";

  const exam = useApi<ExamDetail>(
    () => api.get<ApiExamDetail>(`/exam/${examId}`).then(mapExamDetail),
    [examId],
    {
      fallbackData: DEMO_EXAMS.find((e) => e.id === examId)
    }
  );

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const token = digits.join("").toUpperCase();
  const locked = Date.now() < lockUntil;
  const session = exam.data?.sessions?.[0];

  const updateDigit = (i: number, value: string): void => {
    const clean = value
      .toUpperCase()
      .split("")
      .filter((c) => ALLOWED_CHARS.includes(c));
    const next = [...digits];
    // dukung paste multi-karakter / autofocus beruntun
    let cursor = i;
    for (const ch of clean) {
      if (cursor >= 6) break;
      next[cursor] = ch;
      cursor++;
    }
    setDigits(next);
    const focusIdx = Math.min(cursor, 5);
    refs.current[focusIdx]?.focus();
    setError(null);
  };

  const start = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (locked) return;
    if (token.length !== 6) {
      setError("Masukkan token 6 karakter dari pengawas.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let attemptId = "";
      let remainingSeconds = 0;
      if (DEMO_MODE) {
        attemptId = "eat_demo";
        remainingSeconds = 120;
        toast({
          variant: "info",
          title: "Mode demo",
          description: "Token diterima (demo). Ujian dimulai dengan soal contoh."
        });
      } else if (!session) {
        throw new ApiError(404, "NOT_FOUND", "Sesi ujian belum tersedia untuk ujian ini.");
      } else {
        const res = await api.post<{
          attempt: { id: string; remaining_seconds: number };
        }>(`/exam/sessions/${session.id}/attempts`, {
          access_token: token,
          student_id: ""
        });
        attemptId = res.attempt.id;
        remainingSeconds = res.attempt.remaining_seconds;
      }
      safeSet<ExamAttemptDraft>(
        STORAGE_KEYS.examAttempt,
        { examId, attemptId, remainingSeconds },
        "session"
      );
      router.replace(
        `/siswa/ujian/${examId}/kerjakan?attempt=${encodeURIComponent(attemptId)}&demo=${DEMO_MODE ? "1" : "0"}`
      );
    } catch (err) {
      const nextFail = failCount + 1;
      setFailCount(nextFail);
      if (nextFail >= 3) {
        setLockUntil(Date.now() + 60000);
        setFailCount(0);
        setError("Token salah 3 kali. Coba lagi dalam 60 detik.");
      } else {
        setError(
          err instanceof ApiError
            ? errorMessage(err)
            : "Token tidak valid. Periksa kembali token dari pengawas."
        );
      }
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Masuk Sesi Ujian</h1>
      <DataView
        status={exam.status}
        error={exam.error}
        onRetry={exam.refetch}
        fallbackLabel="Detail ujian"
      >
        {exam.data ? (
          <Card>
            <CardHeader>
              <CardTitle>{exam.data.title}</CardTitle>
              <CardDescription>
                {exam.data.subject} · {exam.data.className} · {formatDateTime(exam.data.startsAt)} –{" "}
                {formatDateTime(exam.data.endsAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-foreground">Masukkan token dari pengawas</p>
              <form
                onSubmit={(e) => void start(e)}
                className="space-y-4"
                aria-label="Form token ujian"
              >
                <div
                  className="flex justify-center gap-2"
                  role="group"
                  aria-label="Kode token 6 karakter"
                >
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        refs.current[i] = el;
                      }}
                      value={d}
                      onChange={(e) => updateDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
                        if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                        if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
                      }}
                      inputMode="text"
                      autoComplete="off"
                      aria-label={`Karakter token ke-${i + 1}`}
                      maxLength={6}
                      className={cn(
                        "h-14 w-11 rounded-md border-2 border-input text-center font-mono text-xl font-semibold uppercase text-foreground outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100",
                        locked && "opacity-50"
                      )}
                      disabled={locked}
                    />
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  6 karakter alfanumerik huruf besar, tanpa 0/O/1/I. Token sekali pakai per attempt.
                </p>

                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-primary-600"
                    />
                    <span>
                      Saya mengerti: pengerjaan diawasi (peralihan tab dicatat), waktu dibatasi, dan
                      jawaban tersimpan otomatis setiap 15 detik. Ujian dikumpulkan otomatis saat
                      waktu habis.
                    </span>
                  </label>
                </div>

                {error ? (
                  <div role="alert" aria-live="assertive">
                    <Alert variant="danger" className="text-sm">
                      {error}
                    </Alert>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={locked || token.length !== 6 || !agreed}
                  loading={loading}
                >
                  {locked ? "Coba lagi dalam 60 detik" : "Saya mengerti, Mulai Ujian"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </DataView>
    </div>
  );
}
