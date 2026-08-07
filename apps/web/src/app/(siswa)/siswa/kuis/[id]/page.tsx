"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardContent } from "@/components/ui/card";
import { Button, RadioGroup, Textarea, Label, Progress, Alert } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/dialog";
import { formatDuration } from "@/lib/format";
import { toast } from "@/components/ui/toast";
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

export default function SiswaKuisKerjakanPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quizId = params.id ?? "";

  const quiz = useApi<QuizMeta>(() => api.get(`/quizzes/${quizId}`), [quizId], {
    fallbackData: DEMO_QUESTIONS
      ? ({
          id: quizId,
          title: "Kuis: Vektor",
          durationSeconds: 720,
          questions: DEMO_QUESTIONS
        } as QuizMeta)
      : undefined
  });

  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const questions = quiz.data?.questions ?? [];
  const current = questions[index];

  React.useEffect(() => {
    if (quiz.data && remaining === null) setRemaining(quiz.data.durationSeconds);
  }, [quiz.data, remaining]);

  React.useEffect(() => {
    if (remaining === null) return;
    const t = window.setInterval(
      () => setRemaining((r) => (r === null ? null : Math.max(0, r - 1))),
      1000
    );
    return () => window.clearInterval(t);
  }, [remaining === null]);

  const submitQuiz = async (): Promise<void> => {
    setSubmitting(true);
    try {
      await api.post(`/quiz/attempts/${quizId}/submit`, { answers });
      toast({ variant: "success", title: "Kuis terkirim" });
      router.replace("/siswa/kuis");
    } catch {
      toast({
        variant: "error",
        title: "Gagal mengirim kuis",
        description: "Coba lagi saat koneksi stabil."
      });
    } finally {
      setSubmitting(false);
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
                    onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))}
                  />
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor={`q-${current.id}`}>Jawaban esai</Label>
                    <Textarea
                      id={`q-${current.id}`}
                      rows={5}
                      value={answers[current.id] ?? ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))}
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
