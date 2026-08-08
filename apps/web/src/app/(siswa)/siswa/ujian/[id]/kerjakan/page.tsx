"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, DEMO_MODE, errorMessage } from "@/lib/api-client";
import {
  Button,
  Alert,
  RadioGroup,
  Textarea,
  Label,
  Progress,
  ConfirmDialog,
  toast
} from "@opensis/ui";

import { formatDuration } from "@/lib/format";
import { newIdempotencyKey } from "@/lib/idempotency";
import { EXAM_FORCE_SUBMIT_EVENT, EXAM_TICK_EVENT, getSocket } from "@/lib/use-socket";

import { DEMO_QUESTIONS } from "@/lib/demo";
import { cn } from "@opensis/ui";
import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";

interface ExamQuestion {
  id: string;
  type: "PILIHAN_GANDA" | "ESAI" | "ISIAN_SINGKAT";
  text: string;
  options?: Array<{ id: string; text: string }>;
}

interface ExamAttemptDraft {
  examId: string;
  attemptId: string;
  remainingSeconds: number;
}

type SaveStatus = "idle" | "saving" | "saved" | "offline";

export default function SiswaUjianKerjakanPage(): JSX.Element {
  const search = useSearchParams();
  const router = useRouter();
  // Resume: prioritas attemptId dari URL; fallback ke draft sessionStorage
  // (ditulis oleh halaman token di [id]/page.tsx — R-23).
  const [attemptId] = useState<string>(
    () =>
      search.get("attempt") ??
      safeGet<ExamAttemptDraft>(STORAGE_KEYS.examAttempt, "session")?.attemptId ??
      ""
  );

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  // Queue jawaban offline dipersistenkan ke sessionStorage (opensis_exam_pending_answers)
  // agar tidak hilang saat reload; token sesi TIDAK disimpan (hanya attemptId di memori).
  const [pendingQueue, setPendingQueue] = useState<Record<string, string>>(
    () => safeGet<Record<string, string>>(STORAGE_KEYS.examPendingAnswers, "session") ?? {}
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<{
    submitted: boolean;
    auto: boolean;
  } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  // 0) Hapus draft attempt sesaat sesi berakhir (submit/manual/auto) agar
  //    reload berikutnya tidak me-resume sesi yang sudah dikumpulkan; queue
  //    jawaban offline ikut di-flush.
  useEffect(() => {
    if (finalResult) {
      safeRemove(STORAGE_KEYS.examAttempt, "session");
      safeRemove(STORAGE_KEYS.examPendingAnswers, "session");
    }
  }, [finalResult]);

  // 1) Muat attempt (start attempt bila belum ada / demo fallback)
  useEffect(() => {
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
          attempt: {
            id: string;
            status: string;
            remaining_seconds: number;
            exam_session_id?: string;
          };
          questions: ExamQuestion[];
        }>(`/exam/attempts/${attemptId}`);
        if (res.attempt.status === "SUBMITTED" || res.attempt.status === "AUTO_SUBMITTED") {
          setFinalResult({ submitted: true, auto: res.attempt.status === "AUTO_SUBMITTED" });
          return;
        }
        setSessionId(res.attempt.exam_session_id ?? null);
        setQuestions(res.questions ?? []);
        setRemaining(res.attempt.remaining_seconds);
        // Prefill jawaban yang sudah tersimpan di server (resume sesi).
        const initial: Record<string, string> = {};
        for (const q of res.questions ?? []) {
          const mine = (q as ExamQuestion & { my_answer?: string | null }).my_answer;
          if (mine) initial[q.id] = mine;
        }
        setAnswers(initial);
      } catch (err) {
        setError(err instanceof ApiError ? errorMessage(err) : "Gagal memuat ujian.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [attemptId]);

  // 2) Timer
  useEffect(() => {
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
  useEffect(() => {
    if (!attemptId || questions.length === 0 || finalResult) return;
    const interval = window.setInterval(() => void saveAll(false), 15000);
    return () => window.clearInterval(interval);
  }, [attemptId, questions.length, finalResult]);

  const saveAll = useCallback(
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
            answers: Object.entries(merged).map(([question_id, answer]) => ({
              question_id,
              answer,
              saved_at_client: new Date().toISOString()
            }))
          },
          { idempotencyKey: newIdempotencyKey("exam") }
        );
        setPendingQueue({});
        safeRemove(STORAGE_KEYS.examPendingAnswers, "session");
        setSaveStatus("saved");
        setLastSaved(
          new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        );
      } catch {
        setPendingQueue(merged);
        safeSet(STORAGE_KEYS.examPendingAnswers, merged, "session");
        setSaveStatus("offline");
      }
    },
    [attemptId, pendingQueue]
  );

  const autosubmit = useCallback(async (): Promise<void> => {
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
  useEffect(() => {
    const onVis = (): void => {
      if (document.hidden && !finalResult) {
        toast({
          variant: "warning",
          title: "Peralihan tab dicatat",
          description: "Pengawas mencatat aktivitas. Tetap di halaman ujian."
        });
        void api.post(`/exam/attempts/${attemptId}/log`, { event: "TAB_SWITCH" }).catch((err) => {
          toast({
            variant: "error",
            title: "Gagal mencatat aktivitas",
            description: errorMessage(err)
          });
        });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [attemptId, finalResult]);

  // 5) Realtime exam room (R-29): join `exam:{sessionId}`, terima
  //    exam:force-submit (waktu habis server-side) + exam:tick (sisa waktu
  //    server-authoritative). Best-effort; REST tetap fallback utama.
  useEffect(() => {
    if (!attemptId || !sessionId || finalResult || DEMO_MODE) return;
    const socket = getSocket();
    const room = `exam:${sessionId}`;
    socket.emit("room:join", { room });

    const onForceSubmit = (payload: { attemptId?: string }): void => {
      if (payload?.attemptId && payload.attemptId === attemptId) {
        void autosubmit();
      }
    };
    const onTick = (payload: { attemptId?: string; remainingSeconds?: number }): void => {
      if (payload?.attemptId === attemptId && typeof payload.remainingSeconds === "number") {
        setRemaining(Math.max(0, Math.floor(payload.remainingSeconds)));
      }
    };

    socket.on(EXAM_FORCE_SUBMIT_EVENT, onForceSubmit);
    socket.on(EXAM_TICK_EVENT, onTick);
    return () => {
      socket.off(EXAM_FORCE_SUBMIT_EVENT, onForceSubmit);
      socket.off(EXAM_TICK_EVENT, onTick);
      socket.emit("room:leave", { room });
    };
  }, [attemptId, sessionId, finalResult, autosubmit]);

  const current = questions[index];
  const unanswered = questions.filter((q) => !answers[q.id]).length;
  const timerWarn = remaining !== null && remaining <= 600;
  const timerDanger = remaining !== null && remaining <= 60;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <p className="text-sm text-muted-foreground">Menyiapkan ujian...</p>
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
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-2xl font-bold text-foreground">
          Ujian telah {finalResult.auto ? "dikumpulkan otomatis" : "terkirim"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
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
      <header className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <p className="text-lg font-bold text-foreground" aria-live="polite">
              {formatDuration(remaining ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground" aria-live="polite">
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
                    : "bg-muted text-foreground"
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
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
          aria-live="polite"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
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
          <p className="text-base font-medium text-foreground">{current.text}</p>
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
              answers[q.id] ? "bg-success-600 text-white" : "bg-muted text-foreground",
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
        <p className="mt-1 text-sm text-muted-foreground">
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
