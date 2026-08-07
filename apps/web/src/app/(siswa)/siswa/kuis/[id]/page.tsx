"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  DataView,
  Card,
  CardContent,
  Button,
  RadioGroup,
  Textarea,
  Label,
  Progress,
  Alert,
  ConfirmDialog,
  toast
} from "@openlms/ui";

import { formatDuration } from "@/lib/format";

import { DEMO_QUESTIONS } from "@/lib/demo";
import { cn } from "@openlms/ui";

interface QuizQuestion {
  id: string;
  type: "PILIHAN_GANDA" | "ESAI" | "ISIAN_SINGKAT" | "MENJODOHKAN";
  text: string;
  options?: Array<{ id: string; text: string }>;
}

interface QuizMeta {
  id: string;
  title: string;
  durationSeconds: number;
  questions: QuizQuestion[];
}

/** Bentuk mentah dari GET /quiz/:id (QuizService.findOne). */
interface ApiQuizDetail {
  id: string;
  title: string;
  duration_min: number;
  questions: QuizQuestion[];
}

function mapQuizDetail(raw: ApiQuizDetail): QuizMeta {
  return {
    id: raw.id,
    title: raw.title,
    durationSeconds: (raw.duration_min ?? 0) * 60,
    questions: raw.questions ?? []
  };
}

export default function SiswaKuisKerjakanPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quizId = params.id ?? "";

  const quiz = useApi<QuizMeta>(
    () => api.get<ApiQuizDetail>(`/quiz/${quizId}`).then(mapQuizDetail),
    [quizId],
    {
      fallbackData: DEMO_QUESTIONS
        ? ({
            id: quizId,
            title: "Kuis: Vektor",
            durationSeconds: 720,
            questions: DEMO_QUESTIONS
          } as QuizMeta)
        : undefined
    }
  );

  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [startError, setStartError] = React.useState<string | null>(null);
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const answersRef = React.useRef(answers);
  answersRef.current = answers;
  const startRef = React.useRef(false);
  const submittedRef = React.useRef(false);

  const questions = quiz.data?.questions ?? [];
  const current = questions[index];

  React.useEffect(() => {
    if (quiz.data && remaining === null) setRemaining(quiz.data.durationSeconds);
  }, [quiz.data, remaining]);

  // G-03: mulai attempt saat kuis siap → dapatkan attemptId untuk save/submit.
  React.useEffect(() => {
    if (!quizId || !quiz.data || attemptId || startRef.current || DEMO_MODE) return;
    startRef.current = true;
    void (async () => {
      try {
        const res = await api.post<{ attempt: { id: string; remaining_seconds: number } }>(
          `/quiz/${quizId}/attempts`,
          {}
        );
        setAttemptId(res.attempt.id);
        if (res.attempt.remaining_seconds != null) {
          setRemaining(res.attempt.remaining_seconds);
        }
      } catch (err) {
        setStartError(err instanceof ApiError ? errorMessage(err) : "Gagal memulai kuis.");
        startRef.current = false;
      }
    })();
  }, [quizId, quiz.data, attemptId]);

  const saveOne = React.useCallback(
    async (questionId: string, answer: string): Promise<void> => {
      if (!attemptId) return;
      await api.post(`/quiz/attempts/${attemptId}/answers`, {
        question_id: questionId,
        answer
      });
    },
    [attemptId]
  );

  // Kirim SEMUA jawaban secara berurutan sebelum submit (hindari race baca-tulis JSON).
  const flushAnswers = React.useCallback(async (): Promise<void> => {
    if (!attemptId) return;
    const current = answersRef.current;
    for (const q of questions) {
      const answer = current[q.id];
      if (answer !== undefined && answer !== "") {
        await saveOne(q.id, answer);
      }
    }
  }, [attemptId, questions, saveOne]);

  // Timer: saat habis, kirim jawaban lalu submit otomatis (server juga auto-submit).
  React.useEffect(() => {
    if (remaining === null) return;
    const t = window.setInterval(() => {
      setRemaining((r) => {
        if (r === null) return null;
        const next = Math.max(0, r - 1);
        if (next === 0 && !submittedRef.current) {
          submittedRef.current = true;
          window.clearInterval(t);
          void submitQuiz();
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [remaining === null]);

  const submitQuiz = async (): Promise<void> => {
    setSubmitting(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
      } else {
        if (!attemptId)
          throw new ApiError(0, "INTERNAL", "Kuis belum dimulai. Muat ulang halaman.");
        await flushAnswers();
        await api.post(`/quiz/attempts/${attemptId}/submit`, {});
      }
      toast({ variant: "success", title: "Kuis terkirim" });
      router.replace("/siswa/kuis");
    } catch (err) {
      submittedRef.current = false;
      toast({
        variant: "error",
        title: "Gagal mengirim kuis",
        description: err instanceof ApiError ? errorMessage(err) : "Coba lagi saat koneksi stabil."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onAnswerChange = (questionId: string, value: string): void => {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    // Simpan langsung saat berubah; kegagalan jaringan tetap aman karena submit
    // mengirim ulang SEMUA jawaban sebelum menutup attempt.
    if (!DEMO_MODE && attemptId) {
      void saveOne(questionId, value).catch(() => undefined);
    }
  };

  const unanswered = questions.filter((q) => !answers[q.id]).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-neutral-900">{quiz.data?.title ?? "Kuis"}</h1>
        <div
          className="rounded-md bg-neutral-900 px-3 py-1 font-mono text-lg font-semibold text-white"
          aria-live="polite"
        >
          {remaining !== null ? formatDuration(remaining) : "--:--"}
        </div>
      </div>

      <DataView status={quiz.status} error={quiz.error} onRetry={quiz.refetch} fallbackLabel="Kuis">
        {startError ? (
          <Alert variant="danger" className="mb-4">
            <p className="text-sm">{startError}</p>
          </Alert>
        ) : null}
        {current ? (
          <>
            <Card>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium text-neutral-600">
                  Pertanyaan {index + 1} dari {questions.length}
                </p>
                <p className="text-base font-medium text-neutral-900">{current.text}</p>
                {current.type === "PILIHAN_GANDA" ? (
                  <RadioGroup
                    name={`q-${current.id}`}
                    options={(current.options ?? []).map((o) => ({ value: o.id, label: o.text }))}
                    value={answers[current.id] ?? ""}
                    onChange={(e) => onAnswerChange(current.id, e.target.value)}
                  />
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor={`q-${current.id}`}>Jawaban esai</Label>
                    <Textarea
                      id={`q-${current.id}`}
                      rows={5}
                      value={answers[current.id] ?? ""}
                      onChange={(e) => onAnswerChange(current.id, e.target.value)}
                      placeholder="Tulis jawaban Anda..."
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                Sebelumnya
              </Button>
              <Button
                variant={flags[current.id] ? "warning" : "ghost"}
                onClick={() => setFlags((f) => ({ ...f, [current.id]: !f[current.id] }))}
              >
                {flags[current.id] ? "Batalkan tanda" : "Tandai"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                disabled={index === questions.length - 1}
              >
                Berikutnya
              </Button>
            </div>

            <nav aria-label="Navigator soal" className="flex flex-wrap gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Soal ${i + 1}${answers[q.id] ? ", dijawab" : ""}${flags[q.id] ? ", ditandai" : ""}`}
                  className={cn(
                    "h-9 w-9 rounded-md text-sm font-medium",
                    i === index && "ring-2 ring-primary-600",
                    answers[q.id] ? "bg-success-600 text-white" : "bg-neutral-200 text-neutral-700",
                    flags[q.id] && "bg-warning-100 text-warning-700"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </nav>

            <div>
              <Progress
                value={
                  questions.length === 0
                    ? 0
                    : ((questions.length - unanswered) / questions.length) * 100
                }
                showLabel
              />
              <p className="mt-1 text-sm text-neutral-600">
                {unanswered > 0 ? `${unanswered} soal belum dijawab` : "Semua soal sudah dijawab"}
              </p>
            </div>

            <Button className="w-full" size="lg" onClick={() => setConfirmOpen(true)}>
              Kumpulkan
            </Button>
          </>
        ) : null}
      </DataView>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Kumpulkan kuis?"
        description={
          unanswered > 0
            ? `Masih ada ${unanswered} soal belum dijawab. Soal kosong akan dinilai 0. Lanjutkan mengumpulkan?`
            : "Semua soal sudah dijawab. Kuis akan dikirim dan tidak bisa diubah lagi."
        }
        confirmLabel="Ya, kumpulkan"
        onConfirm={() => void submitQuiz()}
        destructive={unanswered > 0}
      />
      {submitting ? <Alert variant="info">Mengirim kuis...</Alert> : null}
    </div>
  );
}
