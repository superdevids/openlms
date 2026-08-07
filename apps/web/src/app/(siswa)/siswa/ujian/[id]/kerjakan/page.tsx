"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import { Button, Alert, RadioGroup, Textarea, Label, Progress } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/dialog";
import { formatDuration } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { toast } from "@/components/ui/toast";
import { DEMO_QUESTIONS } from "@/lib/demo";
import { cn } from "@openlms/ui";

interface ExamQuestion {
  id: string;
  type: "PILIHAN_GANDA" | "ESAI" | "ISIAN_SINGKAT";
  text: string;
  options?: Array<{ id: string; text: string }>;
}

type SaveStatus = "idle" | "saving" | "saved" | "offline";

export default function SiswaUjianKerjakanPage(): React.JSX.Element {
  const search = useSearchParams();
  const router = useRouter();
  const attemptId = search.get("attempt") ?? "";

  const [questions, setQuestions] = React.useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [index, setIndex] = React.useState(0);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = React.useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [finalResult, setFinalResult] = React.useState<{
    submitted: boolean;
    auto: boolean;
  } | null>(null);

  const answersRef = React.useRef(answers);
  answersRef.current = answers;

  // 1) Muat attempt (start attempt bila belum ada / demo fallback)
  React.useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        if (DEMO_MODE) {
          setQuestions(DEMO_QUESTIONS as ExamQuestion[]);
          setRemaining(720);
          setSaveStatus("saved");
          setLastSaved("demo");
          return;
        }
        const res = await api.get<{
          status: string;
          remainingSeconds: number;
          questions: ExamQuestion[];
        }>(`/exam/attempts/${attemptId}`);
        if (res.status === "SUBMITTED" || res.status === "AUTO_SUBMITTED") {
          setFinalResult({ submitted: true, auto: res.status === "AUTO_SUBMITTED" });
          return;
        }
        setQuestions(res.questions ?? []);
        setRemaining(res.remainingSeconds);
      } catch (err) {
        setError(err instanceof ApiError ? errorMessage(err) : "Gagal memuat ujian.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [attemptId]);

  // 2) Timer
  React.useEffect(() => {
    if (remaining === null || finalResult) return;
    const t = window.setInterval(() => {
      setRemaining((r) => {
        if (r === null) return null;
        const next = r - 1;
        if (next <= 0) {
          window.clearInterval(t);
          void autosubmit();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [remaining === null, finalResult]);

  // 3) Autosave tiap 15 detik + retry queue offline
  React.useEffect(() => {
    if (!attemptId || questions.length === 0 || finalResult) return;
    const interval = window.setInterval(() => void saveAll(false), 15000);
    return () => window.clearInterval(interval);
  }, [attemptId, questions.length, finalResult]);

  const saveAll = React.useCallback(
    async (manual: boolean): Promise<void> => {
      if (!attemptId) return;
      const current = answersRef.current;
      const entries = Object.entries(current);
      if (entries.length === 0 && Object.keys(pendingQueue).length === 0) {
        if (manual) setSaveStatus("saved");
        return;
      }
      const merged = { ...pendingQueue, ...current };
      setSaveStatus("saving");
      try {
        if (DEMO_MODE) {
          await new Promise((r) => setTimeout(r, 150));
          setPendingQueue({});
          setSaveStatus("saved");
          setLastSaved(
            new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          );
          return;
        }
        await api.post(
          `/exam/attempts/${attemptId}/answers`,
          {
            answers: Object.entries(merged).map(([questionId, answer]) => ({
              questionId,
              answer,
              savedAtClient: new Date().toISOString()
            }))
          },
          { idempotencyKey: newIdempotencyKey("exam") }
        );
        setPendingQueue({});
        setSaveStatus("saved");
        setLastSaved(
          new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        );
      } catch {
        setPendingQueue(merged);
        setSaveStatus("offline");
      }
    },
    [attemptId, pendingQueue]
  );

  const autosubmit = React.useCallback(async (): Promise<void> => {
    setFinalResult({ submitted: true, auto: true });
    setSaveStatus("saving");
    try {
      if (!DEMO_MODE) await api.post(`/exam/attempts/${attemptId}/submit`, { auto: true });
    } catch {
      // server tetap autosubmit via cutoff
    }
    toast({ variant: "warning", title: "Waktu habis — ujian dikumpulkan otomatis" });
  }, [attemptId]);

  const submitManual = async (): Promise<void> => {
    setSubmitting(true);
    try {
      if (!DEMO_MODE) {
        await saveAll(true);
        await api.post(`/exam/attempts/${attemptId}/submit`, {});
      } else {
        await new Promise((r) => setTimeout(r, 200));
      }
      setFinalResult({ submitted: true, auto: false });
      toast({ variant: "success", title: "Ujian terkirim" });
      router.replace("/siswa/ujian");
    } catch (err) {
      setSubmitting(false);
      toast({ variant: "error", title: "Gagal mengirim", description: errorMessage(err) });
    }
  };

  // 4) Deteksi peralihan tab → log + toast peringatan (bukan diskualifikasi otomatis)
  React.useEffect(() => {
    const onVis = (): void => {
      if (document.hidden && !finalResult) {
        toast({
          variant: "warning",
          title: "Peralihan tab dicatat",
          description: "Pengawas mencatat aktivitas. Tetap di halaman ujian."
        });
        void api
          .post(`/exam/attempts/${attemptId}/logs`, { event: "TAB_SWITCH" })
          .catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [attemptId, finalResult]);

  const current = questions[index];
  const unanswered = questions.filter((q) => !answers[q.id]).length;
  const timerWarn = remaining !== null && remaining <= 600;
  const timerDanger = remaining !== null && remaining <= 60;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <p className="text-sm text-neutral-600">Menyiapkan ujian...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg">
        <Alert variant="danger">
          <p>{error}</p>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
          Muat ulang
        </Button>
      </div>
    );
  }

  if (finalResult) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-bold text-neutral-900">
          Ujian telah {finalResult.auto ? "dikumpulkan otomatis" : "terkirim"}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          {finalResult.auto
            ? "Waktu pengerjaan habis. Jawaban terakhir tersimpan telah dikirim ke server."
            : "Jawaban Anda telah dikirim. Anda tidak dapat kembali ke sesi ini."}
        </p>
        <Button className="mt-6" onClick={() => router.replace("/siswa/ujian")}>
          Kembali ke Daftar Ujian
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <header className="sticky top-14 z-30 -mx-4 border-b border-neutral-200 bg-neutral-50/95 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <p className="text-lg font-bold text-neutral-900" aria-live="polite">
              {formatDuration(remaining ?? 0)}
            </p>
            <p className="text-sm text-neutral-600" aria-live="polite">
              {saveStatus === "saving"
                ? "Menyimpan…"
                : saveStatus === "offline"
                  ? "Menunggu koneksi…"
                  : lastSaved
                    ? `Tersimpan ${lastSaved}`
                    : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-semibold",
                timerDanger
                  ? "bg-danger-600 text-white"
                  : timerWarn
                    ? "bg-warning-100 text-warning-700"
                    : "bg-neutral-200 text-neutral-700"
              )}
            >
              {timerDanger ? "≤ 1 menit" : timerWarn ? "≤ 10 menit" : "Waktu berjalan"}
            </span>
            <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
              Kumpulkan &amp; Akhiri
            </Button>
          </div>
        </div>
      </header>

      {saveStatus === "offline" ? (
        <Alert variant="warning">
          <p className="text-sm">
            Koneksi terputus — jawaban tersimpan lokal dan akan disinkronkan otomatis.
          </p>
        </Alert>
      ) : null}

      {current ? (
        <section
          className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
          aria-live="polite"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-600">
              Soal {index + 1} dari {questions.length}
            </p>
            <Button
              variant={flags[current.id] ? "warning" : "ghost"}
              size="sm"
              onClick={() => setFlags((f) => ({ ...f, [current.id]: !f[current.id] }))}
            >
              {flags[current.id] ? "Batalkan tanda" : "Tandai"}
            </Button>
          </div>
          <p className="text-base font-medium text-neutral-900">{current.text}</p>
          <div className="mt-4">
            {current.type === "PILIHAN_GANDA" ? (
              <RadioGroup
                name={`exam-q-${current.id}`}
                options={(current.options ?? []).map((o) => ({ value: o.id, label: o.text }))}
                value={answers[current.id] ?? ""}
                onChange={(e) => {
                  setAnswers((a) => ({ ...a, [current.id]: e.target.value }));
                  setSaveStatus("idle");
                }}
              />
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor={`exam-q-${current.id}`}>Jawaban</Label>
                <Textarea
                  id={`exam-q-${current.id}`}
                  rows={5}
                  value={answers[current.id] ?? ""}
                  onChange={(e) => {
                    setAnswers((a) => ({ ...a, [current.id]: e.target.value }));
                    setSaveStatus("idle");
                  }}
                  placeholder="Tulis jawaban..."
                />
              </div>
            )}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
          disabled={index === questions.length - 1}
        >
          Berikutnya
        </Button>
      </div>

      <nav aria-label="Navigator soal ujian" className="flex flex-wrap gap-1.5">
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
            questions.length === 0 ? 0 : ((questions.length - unanswered) / questions.length) * 100
          }
          showLabel
        />
        <p className="mt-1 text-sm text-neutral-600">
          {unanswered > 0 ? `${unanswered} soal belum dijawab` : "Semua soal sudah dijawab"} ·
          Jawaban tersimpan otomatis setiap 15 detik.
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Kumpulkan ujian sekarang?"
        description={
          unanswered > 0
            ? `Masih ada ${unanswered} soal belum dijawab. Setelah dikumpulkan, Anda tidak bisa kembali.`
            : "Semua soal sudah dijawab. Ujian akan dikirim dan tidak bisa diubah."
        }
        confirmLabel="Ya, kumpulkan"
        onConfirm={() => void submitManual()}
        destructive={unanswered > 0}
      />
      {submitting ? <Alert variant="info">Mengirim ujian...</Alert> : null}
    </div>
  );
}
